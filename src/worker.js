// 사이트 파일(public/)은 Cloudflare가 그대로 내보내고,
// /api/birthdays, /api/hours, /api/mbti 만 이 코드가 처리: 친구들이 입력한 생일·태어난 시·MBTI를 KV에 모아 모두에게 공유.
const ID_RE = /^[a-z0-9_-]{1,40}$/;
const BIRTH_RE = /^(2009|2010)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/; // 2026년 기준 2학년=2009, 1학년=2010
const HOURS = ["자시", "축시", "인시", "묘시", "진시", "사시", "오시", "미시", "신시", "유시", "술시", "해시"];

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

function isRealDate(birth) {
  const [y, m, d] = birth.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// 경로 → KV 키와 값 검사 규칙
const ROUTES = {
  "/api/birthdays": { key: "birthdays", field: "birth", valid: (v) => BIRTH_RE.test(v) && isRealDate(v) },
  "/api/hours": { key: "hours", field: "hour", valid: (v) => HOURS.includes(v) },
  // 궁예한 MBTI를 본인이 고친 값
  "/api/mbti": { key: "mbti", field: "mbti", valid: (v) => /^[EI][SN][TF][JP]$/.test(v) },
};

export default {
  async fetch(request, env) {
    const route = ROUTES[new URL(request.url).pathname];
    if (!route) return env.ASSETS.fetch(request);

    const readAll = async () => (await env.BIRTHDAYS.get(route.key, "json")) || {};

    if (request.method === "GET") return json(await readAll());

    if (request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "잘못된 요청" }, 400); }
      const id = String(body.id || ""), value = String(body[route.field] || "");
      if (!ID_RE.test(id) || !route.valid(value)) return json({ error: "잘못된 값" }, 400);

      const all = await readAll();
      // 처음 입력된 값만 저장 (장난으로 덮어쓰기 방지)
      if (all[id]) return json({ id, [route.field]: all[id], saved: false });
      all[id] = value;
      await env.BIRTHDAYS.put(route.key, JSON.stringify(all));
      return json({ id, [route.field]: value, saved: true });
    }

    return json({ error: "지원하지 않는 요청" }, 405);
  },
};
