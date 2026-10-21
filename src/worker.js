// 사이트 파일(public/)은 Cloudflare가 그대로 내보내고, /api/ 아래만 이 코드가 처리:
// - /api/birthdays, /api/hours, /api/mbti: 궁합소에서 친구들이 입력한 생일·태어난 시·MBTI를 KV에 모아 공유
// - /api/sd: 태풍고 틀 생성기(/pair/)에 올린 SD 이미지
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

/* 태풍고 틀 생성기(/pair/)의 SD 이미지 저장소
   GET    /api/sd                  → 목록 { id: { small: {v, s}, tall: {v, s} } }  (v: 올린 시각, s: 크기 보정)
   GET    /api/sd/<id>/<kind>      → PNG (kind: small | tall)
   PUT    /api/sd/<id>/<kind>      → PNG 올리기 (브라우저에서 배경 지우고 여백 자른 것)
   POST   /api/sd/<id>/<kind>/scale  { s } → 크기 보정만 저장
   DELETE /api/sd/<id>/<kind>      → 지우기 */
const SD_KINDS = ["small", "tall"];
const SD_MAX = 5 * 1024 * 1024;
const isPng = (buf) => {
  const b = new Uint8Array(buf, 0, 8);
  return b.length === 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
};

async function handleSd(request, env, parts) {
  const kv = env.BIRTHDAYS;
  const readIndex = async () => (await kv.get("sd-index", "json")) || {};
  if (parts.length === 0) {
    if (request.method !== "GET") return json({ error: "지원하지 않는 요청" }, 405);
    return json(await readIndex());
  }
  const [id, kind, extra] = parts;
  if (!ID_RE.test(id || "") || !SD_KINDS.includes(kind)) return json({ error: "잘못된 주소" }, 400);
  const key = `sd:${id}:${kind}`;

  if (request.method === "GET" && !extra) {
    const buf = await kv.get(key, "arrayBuffer");
    if (!buf) return json({ error: "없음" }, 404);
    const versioned = new URL(request.url).searchParams.has("v");
    return new Response(buf, {
      headers: { "content-type": "image/png", "cache-control": versioned ? "public, max-age=31536000, immutable" : "no-store" },
    });
  }
  if (request.method === "PUT" && !extra) {
    const buf = await request.arrayBuffer();
    if (buf.byteLength > SD_MAX || !isPng(buf)) return json({ error: "PNG 5MB 이하만 가능" }, 400);
    await kv.put(key, buf);
    const index = await readIndex();
    const prev = (index[id] && index[id][kind]) || {};
    index[id] = { ...(index[id] || {}), [kind]: { v: Date.now(), s: prev.s || 1 } };
    await kv.put("sd-index", JSON.stringify(index));
    return json({ saved: true, ...index[id][kind] });
  }
  if (request.method === "POST" && extra === "scale") {
    let body;
    try { body = await request.json(); } catch { return json({ error: "잘못된 요청" }, 400); }
    const s = Number(body.s);
    if (!(s >= 0.5 && s <= 1.5)) return json({ error: "잘못된 값" }, 400);
    const index = await readIndex();
    if (!index[id] || !index[id][kind]) return json({ error: "없음" }, 404);
    index[id][kind].s = Math.round(s * 100) / 100;
    await kv.put("sd-index", JSON.stringify(index));
    return json({ saved: true, ...index[id][kind] });
  }
  if (request.method === "DELETE" && !extra) {
    await kv.delete(key);
    const index = await readIndex();
    if (index[id]) {
      delete index[id][kind];
      if (!Object.keys(index[id]).length) delete index[id];
      await kv.put("sd-index", JSON.stringify(index));
    }
    return json({ deleted: true });
  }
  return json({ error: "지원하지 않는 요청" }, 405);
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === "/api/sd" || path.startsWith("/api/sd/")) {
      return handleSd(request, env, path.split("/").slice(3).filter(Boolean));
    }
    const route = ROUTES[path];
    if (!route) return env.ASSETS.fetch(request);

    const readAll = async () => (await env.BIRTHDAYS.get(route.key, "json")) || {};

    if (request.method === "GET") return json(await readAll());

    if (request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "잘못된 요청" }, 400); }
      const id = String(body.id || ""), value = String(body[route.field] || "");
      if (!ID_RE.test(id) || !route.valid(value)) return json({ error: "잘못된 값" }, 400);

      const all = await readAll();
      // 기본은 처음 입력된 값만 저장. "수정"(overwrite)일 때만 덮어쓰고, 기록을 남겨서 되돌릴 수 있게 함
      if (all[id] && !body.overwrite) return json({ id, [route.field]: all[id], saved: false });
      const before = all[id] || null;
      if (before === value) return json({ id, [route.field]: value, saved: false });
      all[id] = value;
      await env.BIRTHDAYS.put(route.key, JSON.stringify(all));
      if (before) {
        const log = (await env.BIRTHDAYS.get("log", "json")) || [];
        log.push({ at: new Date().toISOString(), what: route.key, id, from: before, to: value });
        await env.BIRTHDAYS.put("log", JSON.stringify(log.slice(-300)));
      }
      return json({ id, [route.field]: value, saved: true });
    }

    return json({ error: "지원하지 않는 요청" }, 405);
  },
};
