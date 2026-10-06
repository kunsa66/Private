// 사이트 파일(public/)은 Cloudflare가 그대로 내보내고,
// /api/birthdays 만 이 코드가 처리: 친구들이 입력한 생일을 KV에 모아 모두에게 공유.
const KEY = "birthdays";
const ID_RE = /^[a-z0-9_-]{1,40}$/;
const BIRTH_RE = /^(2009|2010)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/; // 2026년 기준 2학년=2009, 1학년=2010

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

async function readAll(env) {
  return (await env.BIRTHDAYS.get(KEY, "json")) || {};
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/birthdays") return env.ASSETS.fetch(request);

    if (request.method === "GET") return json(await readAll(env));

    if (request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "잘못된 요청" }, 400); }
      const id = String(body.id || ""), birth = String(body.birth || "");
      if (!ID_RE.test(id) || !BIRTH_RE.test(birth) || !isRealDate(birth)) return json({ error: "잘못된 생일" }, 400);

      const all = await readAll(env);
      // 처음 입력된 생일만 저장 (장난으로 덮어쓰기 방지)
      if (all[id]) return json({ id, birth: all[id], saved: false });
      all[id] = birth;
      await env.BIRTHDAYS.put(KEY, JSON.stringify(all));
      return json({ id, birth, saved: true });
    }

    return json({ error: "지원하지 않는 요청" }, 405);
  },
};
