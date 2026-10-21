/* 태풍고 틀 생성기: 이름 두 개 고르기 → SD 이미지(저장됨) → 썰(stories.json) → 틀 미리보기 → PNG */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
const norm = (s) => String(s || "").replace(/\s+/g, "").toLowerCase();
const ROSTER = PAIR_ROSTER.map((id) => CHARACTERS.find((c) => c.id === id)).filter(Boolean);
const KINDS = [["small", "작은 SD"], ["tall", "길쭉한 SD"], ["art", "배경 그림"]];
const pairKey = (a, b) => [a.id, b.id].sort().join("|");

let sel = [null, null];
let pickSlot = 0;
let mode = "one";
let stories = {};
let sdIndex = {};           // 서버에 저장된 이미지 목록 { id: { small: {v, s}, tall: {v, s} } }
const imgCache = {};        // "id:kind:v" → Image
const localImg = {};        // 서버 저장이 안 될 때(로컬 미리보기) "id:kind" → {img, s}
const photoCache = {};
let mbtiFix = {};
let apiOk = true;
let edit = null;            // 글자 고치기 중인 썰 (저장 안 됨)

/* ---------- 불러오기 ---------- */
let storyEdits = {};
async function loadStories() {
  try {
    const r = await fetch(`stories.json?t=${Date.now()}`, { cache: "no-store" });
    stories = await r.json();
  } catch (e) { stories = {}; }
  try { storyEdits = await (await fetch("/api/storyedit", { cache: "no-store" })).json(); } catch (e) { storyEdits = {}; }
}
async function loadIndex() {
  try {
    const r = await fetch("/api/sd", { cache: "no-store" });
    if (!r.ok) throw new Error();
    sdIndex = await r.json();
    apiOk = true;
  } catch (e) { apiOk = false; }
}
// 궁합소와 같은 공유값: 친구들이 넣은 생일·태어난 시(사주 계산용), 본인이 고친 MBTI
async function loadMbti() {
  const get = async (api) => { try { return await (await fetch(api, { cache: "no-store" })).json(); } catch (e) { return {}; } };
  const [births, hours, mbti] = await Promise.all([get("/api/birthdays"), get("/api/hours"), get("/api/mbti")]);
  mbtiFix = mbti;
  for (const c of CHARACTERS) {
    if (!c.birth && births[c.id]) c.birth = births[c.id];
    if (!c.hour && hours[c.id]) c.hour = hours[c.id];
    if (mbti[c.id] && !c.mbtiNote) c.mbti = mbti[c.id];
  }
  CHARACTERS.forEach((c) => (c.pillars = c.birth ? getPillars(c.birth, c.hour) : null));
}

/* ---------- 궁합소 부적 이미지 (지금은 안 씀: 사용자가 전신 배경으로 되돌림, 다시 쓸 수 있게 남겨둠) ---------- */
const talismanCache = {};
function talismanOf(A, B) {
  const key = `${A.id}|${B.id}`;
  if (talismanCache[key]) return talismanCache[key];
  return (talismanCache[key] = (async () => {
    const r = compat(A, B);
    const info = reading("pair", A, r);
    const kind = r.total >= 50 ? "best" : "worst";
    // 배경은 항상 연한 노랑 + 분홍 먹으로 (낮은 점수도 글자·도장은 그대로, 색만 맞춤)
    const savedWorst = THEME.worst;
    if (kind === "worst") THEME.worst = { ...savedWorst, paper: THEME.best.paper, ink: THEME.best.ink, text: THEME.best.text };
    try {
      const t = THEME[kind];
      const hanja = `${SITE.titleHanja}勅令急如律百年同樂惡緣退散點神託發行第號符剋緣${info.tier.hanja}${info.tier.fu}0123456789`;
      const korean = [A.name, B.name, info.short, info.tier.ko, info.tier.fuKo, "태풍고 폐미부 발행 학년 · 0123456789"].join("");
      await Promise.all([
        document.fonts.load(`800 40px ${F_TITLE}`, korean), document.fonts.load(`700 28px ${F_TITLE}`, korean),
        document.fonts.load(`900 190px ${F_BOLD}`, hanja), document.fonts.load(`700 28px ${F_BOLD}`, hanja),
      ]).catch(() => {});
      // 왼쪽: 사진 없는 부적 (한자 · 하트 틀 · 점수 · 신탁)
      const { W, H } = LAYOUT;
      const cv = document.createElement("canvas");
      cv.width = W; cv.height = H;
      const ctx = cv.getContext("2d");
      drawBackground(ctx, kind, info);
      drawSeal(ctx, 830, 640, 130, 0.08, t.ink, t.paper, [[`${r.total}`, `800 56px ${F_TITLE}`, -12], ["點", `900 26px ${F_BOLD}`, 34]]);
      const rb = LAYOUT.reason;
      ctx.strokeStyle = t.ink; ctx.lineWidth = 2; ctx.strokeRect(rb.x, rb.y, rb.w, rb.h);
      drawSeal(ctx, rb.x + 72, rb.y + rb.h / 2, 72, 0, t.ink, t.paper, [["神託", `900 24px ${F_BOLD}`, 1]]);
      ctx.fillStyle = t.text; ctx.font = `700 36px ${F_TITLE}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const lines = wrapText(ctx, info.short, rb.w - 190).slice(0, 2);
      lines.forEach((l, i) => ctx.fillText(l, rb.x + 126 + (rb.w - 146) / 2, rb.y + rb.h / 2 - ((lines.length - 1) * 54) / 2 + i * 54));
      const pp = LAYOUT.paper;
      const paper = document.createElement("canvas");
      paper.width = pp.w; paper.height = pp.h;
      paper.getContext("2d").drawImage(cv, pp.x, pp.y, pp.w, pp.h, 0, 0, pp.w, pp.h);
      // 오른쪽: 부적 카드를 만들어서 증명사진 두 장 + 緣 도장 부분만, 위아래는 흐리게
      const card = await makeCard(kind, { ...A, photo: `../${A.photo}` }, { ...r, partner: { ...B, photo: `../${B.photo}` } }, info);
      const photos = document.createElement("canvas");
      photos.width = 620; photos.height = 440;
      const pc = photos.getContext("2d");
      pc.drawImage(card, 230, 680, 620, 440, 0, 0, 620, 440);
      pc.globalCompositeOperation = "destination-in";
      const g = pc.createLinearGradient(0, 0, 0, 440);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.14, "rgba(0,0,0,1)");
      g.addColorStop(0.86, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
      pc.fillStyle = g; pc.fillRect(0, 0, 620, 440);
      return { paper, photos, total: r.total, tier: info.tier };
    } finally {
      THEME.worst = savedWorst;
    }
  })().catch(() => null));
}
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

async function sdOf(c, kind) {
  const local = localImg[`${c.id}:${kind}`];
  const meta = sdIndex[c.id] && sdIndex[c.id][kind];
  if (local && (!meta || local.v >= meta.v)) return local;
  if (!meta) return null;
  const k = `${c.id}:${kind}:${meta.v}`;
  if (!imgCache[k]) imgCache[k] = loadImg(`/api/sd/${c.id}/${kind}?v=${meta.v}`).catch(() => null);
  const img = await imgCache[k];
  return img ? { img, s: meta.s || 1, v: meta.v } : null;
}
const fullCache = {};
async function fullOf(c) {
  if (!(window.PAIR_FULL || []).includes(c.id)) return null;
  if (!fullCache[c.id]) fullCache[c.id] = loadImg(`../full/${c.id}.jpg`).catch(() => null);
  return fullCache[c.id];
}
async function photoOf(c) {
  if (!c.photo) return null;
  if (!photoCache[c.id]) photoCache[c.id] = loadImg(`../${c.photo}`).catch(() => null);
  return photoCache[c.id];
}

/* ---------- 이미지 손질: 흰 배경 지우기 + 여백 자르기 ---------- */
async function prepareImage(file) {
  const src = await loadImg(URL.createObjectURL(file));
  const k = Math.min(1, 2000 / Math.max(src.width, src.height));
  const W = Math.round(src.width * k), H = Math.round(src.height * k);
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(src, 0, 0, W, H);
  const im = ctx.getImageData(0, 0, W, H), d = im.data;

  // 가장자리에서 이어진 흰색(또는 투명)만 배경으로 봄 → 흰 옷·흰 양말은 안 지워짐
  const bgLike = (p) => d[p + 3] < 24 || (Math.min(d[p], d[p + 1], d[p + 2]) >= 232 && Math.max(d[p], d[p + 1], d[p + 2]) - Math.min(d[p], d[p + 1], d[p + 2]) <= 22);
  const bg = new Uint8Array(W * H);
  const stack = [];
  const push = (i) => { if (!bg[i] && bgLike(i * 4)) { bg[i] = 1; stack.push(i); } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (stack.length) {
    const i = stack.pop(), x = i % W, y = (i - x) / W;
    if (x > 0) push(i - 1);
    if (x < W - 1) push(i + 1);
    if (y > 0) push(i - W);
    if (y < H - 1) push(i + W);
  }
  for (let i = 0; i < W * H; i++) if (bg[i]) d[i * 4 + 3] = 0;
  // 배경과 맞닿은 밝은 테두리 픽셀은 반투명으로 (흰 테두리 번짐 없애기)
  for (let i = 0; i < W * H; i++) {
    if (bg[i]) continue;
    const x = i % W, y = (i - x) / W;
    const edge = (x > 0 && bg[i - 1]) || (x < W - 1 && bg[i + 1]) || (y > 0 && bg[i - W]) || (y < H - 1 && bg[i + W]);
    if (!edge) continue;
    const p = i * 4, L = (d[p] + d[p + 1] + d[p + 2]) / 3;
    if (L > 150) {
      const a = Math.max(0, Math.min(1, (255 - L) / 215));
      d[p + 3] = Math.round(d[p + 3] * a);
      for (let ch = 0; ch < 3; ch++) d[p + ch] = Math.max(0, Math.round((d[p + ch] - (1 - a) * 255) / Math.max(a, 0.05)));
    }
  }
  // 여백 자르기
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (d[(y * W + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) throw new Error("빈 이미지");
  ctx.putImageData(im, 0, 0);
  const tw = x1 - x0 + 1, th = y1 - y0 + 1;
  const k2 = Math.min(1, 1400 / th);
  const out = document.createElement("canvas");
  out.width = Math.round(tw * k2); out.height = Math.round(th * k2);
  const o = out.getContext("2d");
  o.imageSmoothingQuality = "high";
  o.drawImage(cv, x0, y0, tw, th, 0, 0, out.width, out.height);
  const blob = await new Promise((r) => out.toBlob(r, "image/png"));
  return { blob, canvas: out };
}

// 배경 그림: 배경은 안 지우고 크기만 줄여서 JPG로
async function prepareArt(file) {
  const src = await loadImg(URL.createObjectURL(file));
  const k = Math.min(1, 1600 / Math.max(src.width, src.height));
  const cv = document.createElement("canvas");
  cv.width = Math.round(src.width * k); cv.height = Math.round(src.height * k);
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.drawImage(src, 0, 0, cv.width, cv.height);
  const blob = await new Promise((r) => cv.toBlob(r, "image/jpeg", 0.88));
  return { blob, canvas: cv };
}

/* ---------- 색상 팔레트: 머리 · 눈 · 포인트 ----------
   SD 이미지의 위치로 짐작 (작은 SD: 머리 위쪽 1/4, 눈은 그 아래 띠, 포인트는 옷)
   틀리면 사이트에서 이미지를 눌러 직접 고름 → 서버에 저장 */
const hex = (r, g, b) => "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const autoCache = new WeakMap();
function autoColors(fig, kind) {
  if (!fig) return {};
  const img = fig.img;
  if (autoCache.has(img)) return autoCache.get(img);
  const H = 240, k = H / img.height, W = Math.max(1, Math.round(img.width * k));
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const x = cv.getContext("2d", { willReadFrequently: true });
  x.drawImage(img, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H).data;
  const band = kind === "tall"
    ? { hair: [0, 0.12], eye: [0.14, 0.26], point: [0.4, 0.72] }
    : { hair: [0, 0.22], eye: [0.32, 0.5], point: [0.6, 0.86] };
  // 영역 안에서 색 덩어리 세기 (검은 선·흰색·빼라는 색 제외)
  const clusters = (yr, xr, avoid = []) => {
    const bins = new Map();
    for (let y = Math.floor(yr[0] * H); y < Math.ceil(yr[1] * H); y++) {
      for (let xx = Math.floor(xr[0] * W); xx < Math.ceil(xr[1] * W); xx++) {
        const p = (y * W + xx) * 4;
        if (d[p + 3] < 200) continue;
        const c = [d[p], d[p + 1], d[p + 2]];
        const mx = Math.max(...c), mn = Math.min(...c);
        if (mx < 70 || mn > 238) continue;
        if (avoid.some(([col, r]) => dist(c, col) < r)) continue;
        const key = (c[0] >> 4) << 8 | (c[1] >> 4) << 4 | (c[2] >> 4);
        const b = bins.get(key) || { n: 0, s: [0, 0, 0] };
        b.n++; b.s[0] += c[0]; b.s[1] += c[1]; b.s[2] += c[2];
        bins.set(key, b);
      }
    }
    return [...bins.values()].sort((a, b) => b.n - a.n).map((b) => ({ n: b.n, col: b.s.map((v) => v / b.n) }));
  };
  const out = {};
  const hair = clusters(band.hair, [0.15, 0.85])[0];
  if (hair) out.hair = hair.col;
  const skin = clusters(band.eye, [0.35, 0.65], hair ? [[hair.col, 50]] : [])[0];
  const avoid = [hair && [hair.col, 55], skin && [skin.col, 45]].filter(Boolean);
  const eye = clusters(band.eye, [0.15, 0.85], avoid)[0];
  if (eye) out.eye = eye.col;
  const point = clusters(band.point, [0.2, 0.8], avoid)[0];
  if (point) out.point = point.col;
  const res = Object.fromEntries(Object.entries(out).map(([kk, c]) => [kk, hex(...c)]));
  autoCache.set(img, res);
  return res;
}
const localColors = {};   // 서버 저장이 안 될 때
function colorsFor(c, small, tall) {
  const auto = small ? autoColors(small, "small") : autoColors(tall, "tall");
  const saved = localColors[c.id] || (sdIndex[c.id] && sdIndex[c.id].colors) || {};
  return { ...auto, ...saved };
}
async function saveColors(c, colors) {
  localColors[c.id] = colors;
  if (!apiOk) return;
  try {
    const r = await fetch(`/api/sd/${c.id}/colors`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(colors) });
    if (r.ok) { await loadIndex(); delete localColors[c.id]; }
  } catch (e) {}
}

/* 스포이드: SD 이미지를 눌러서 색 고르기 */
let picking = null;
async function openPicker(c, slot) {
  const [small, tall] = await Promise.all([sdOf(c, "small"), sdOf(c, "tall")]);
  const fig = small || tall;
  if (!fig) { alert("먼저 SD 이미지를 올려주세요."); return; }
  const cv = $("picker-cv"), img = fig.img;
  const k = Math.min(1, 900 / img.height);
  cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
  const x = cv.getContext("2d", { willReadFrequently: true });
  x.clearRect(0, 0, cv.width, cv.height);
  x.drawImage(img, 0, 0, cv.width, cv.height);
  const cur = colorsFor(c, small, tall);
  picking = { c, slot, color: cur[slot] || "#cccccc", all: cur };
  const label = { hair: "머리색", eye: "눈 색", point: "포인트 색" }[slot];
  $("picker-title").textContent = `${c.name} · ${label}`;
  $("picker-pv").style.background = picking.color;
  $("picker").hidden = false;
}
function pickAt(e) {
  if (!picking) return;
  const cv = $("picker-cv"), r = cv.getBoundingClientRect();
  const px = Math.floor(((e.clientX - r.left) / r.width) * cv.width), py = Math.floor(((e.clientY - r.top) / r.height) * cv.height);
  const d = cv.getContext("2d").getImageData(Math.max(0, px - 1), Math.max(0, py - 1), 3, 3).data;
  let n = 0, s = [0, 0, 0];
  for (let p = 0; p < d.length; p += 4) if (d[p + 3] > 128) { n++; s[0] += d[p]; s[1] += d[p + 1]; s[2] += d[p + 2]; }
  if (!n) return;
  picking.color = hex(s[0] / n, s[1] / n, s[2] / n);
  $("picker-pv").style.background = picking.color;
}
$("picker-cv").addEventListener("pointerdown", (e) => { pickAt(e); $("picker-cv").setPointerCapture(e.pointerId); });
$("picker-cv").addEventListener("pointermove", (e) => { if (e.buttons) pickAt(e); });
$("picker-cancel").onclick = () => { picking = null; $("picker").hidden = true; };
$("picker-ok").onclick = async () => {
  if (!picking) return;
  const { c, slot, color } = picking;
  const saved = { ...((sdIndex[c.id] && sdIndex[c.id].colors) || {}), ...(localColors[c.id] || {}), [slot]: color };
  picking = null; $("picker").hidden = true;
  await saveColors(c, saved);
  renderWork();
};

/* ---------- 이름 고르기 ---------- */
function photoTag(c) {
  return c.photo ? `<img src="../${esc(c.photo)}" alt="" loading="lazy">` : `<span class="ph">${esc(c.name[0])}</span>`;
}
function renderSlots() {
  $("slots").innerHTML = [0, 1].map((i) => {
    const c = sel[i];
    const on = pickSlot === i ? " on" : "";
    return c
      ? `<button type="button" class="slot filled${on}" data-slot="${i}"><b class="ab">${i ? "B" : "A"}</b>${photoTag(c)}<span>${esc(c.name)}</span><i aria-label="빼기">×</i></button>`
      : `<button type="button" class="slot${on}" data-slot="${i}"><b class="ab">${i ? "B" : "A"}</b><span>${pickSlot === i ? "명단에서 고르기" : "비어 있음"}</span></button>`;
  }).join(`<em>×</em>`);
}
function renderRoster() {
  const n = norm($("q").value);
  for (const g of [2, 1]) {
    const list = ROSTER.filter((c) => c.grade === g && (!n || norm(c.name).includes(n)));
    $(`roster-${g}`).innerHTML = list.length
      ? list.map((c) => `<button type="button" class="chip${sel.includes(c) ? " sel" : ""}" data-id="${c.id}">${photoTag(c)}<span>${esc(c.name)}</span></button>`).join("")
      : `<p class="empty">없음</p>`;
  }
}
function pickChar(c) {
  const other = 1 - pickSlot;
  if (sel[other] === c) { sel[other] = sel[pickSlot]; }
  sel[pickSlot] = c;
  pickSlot = sel[other] ? pickSlot : other;
  $("q").value = "";
  edit = null;
  renderSlots(); renderRoster(); renderWork();
}
$("slots").onclick = (e) => {
  const b = e.target.closest(".slot");
  if (!b) return;
  const i = Number(b.dataset.slot);
  if (e.target.closest("i") && sel[i]) { sel[i] = null; edit = null; }
  pickSlot = i;
  renderSlots(); renderRoster(); renderWork();
};
$("rosters").onclick = (e) => {
  const b = e.target.closest(".chip");
  if (b) pickChar(ROSTER.find((c) => c.id === b.dataset.id));
};
$("q").oninput = renderRoster;
$("q-form").onsubmit = (e) => {
  e.preventDefault();
  const n = norm($("q").value);
  const hits = ROSTER.filter((c) => norm(c.name).includes(n));
  const exact = ROSTER.find((c) => norm(c.name) === n);
  if (exact || hits.length === 1) pickChar(exact || hits[0]);
};

/* ---------- 이미지 칸 · 틀 · 미리보기 ---------- */
async function renderSdPanels() {
  const html = await Promise.all(sel.map(async (c, i) => {
    const cells = await Promise.all(KINDS.map(async ([kind, label]) => {
      const f = await sdOf(c, kind);
      return `<div class="sd" data-id="${c.id}" data-kind="${kind}">
        <div class="sd-img">${f ? `<img src="${f.img.src}" alt="">` : `<span>${label}<br>없음</span>`}</div>
        <div class="sd-label">${label}${kind === "art" ? `<small>${(window.PAIR_FULL || []).includes(c.id) ? "선택 · 없으면 프로필 전신" : "선택 · 없으면 프로필 두상"}</small>` : ""}</div>
        <div class="sd-btns">
          <button type="button" class="mini" data-act="up">${f ? "바꾸기" : "올리기"}</button>
          ${f ? `<button type="button" class="mini ghost" data-act="del">지우기</button>` : ""}
        </div>
        ${f && kind !== "art" ? `<label class="sd-scale">크기 <input type="range" min="0.7" max="1.3" step="0.01" value="${f.s || 1}" data-act="scale"></label>` : ""}
      </div>`;
    }));
    const [small, tall] = await Promise.all([sdOf(c, "small"), sdOf(c, "tall")]);
    const cols = colorsFor(c, small, tall);
    lastCols[c.id] = cols;
    const pal = (small || tall)
      ? `<div class="pal"><span class="pal-t">색</span>${[["hair", "머리"], ["eye", "눈"], ["point", "포인트"]].map(([k, l]) =>
          `<button type="button" class="sw" data-id="${c.id}" data-slot="${k}"><i style="background:${esc(cols[k] || "#ddd")}"></i>${l}</button>`).join("")}
         <span class="pal-h">눌러서 바꾸기</span></div>`
      : "";
    return `<div class="sd-person"><h4><b class="ab">${i ? "B" : "A"}</b>${esc(c.name)}</h4><div class="sd-row">${cells.join("")}</div>${pal}</div>`;
  }));
  $("sd-panels").innerHTML = html.join("");
  $("api-note").hidden = apiOk;
}

/* ---------- 긴 틀 배경 그림 맞추기 (확대 · 좌우 · 위아래 · 기울기) — 캐릭터마다 서버에 저장 ---------- */
const localFit = {};
function fitOf(c, i) {
  const saved = localFit[c.id] || (sdIndex[c.id] && sdIndex[c.id].bgfit);
  if (saved) return { ...saved };
  return { z: 1, x: 0, y: 0, r: i === 0 ? -0.1 : 0.1 };
}
function renderFitPanels() {
  $("fit-panels").innerHTML = sel.map((c, i) => {
    const f = fitOf(c, i);
    const fit = `<div class="fit" data-id="${c.id}" data-i="${i}">
        <span class="pal-t"><b class="ab">${i ? "B" : "A"}</b> ${esc(c.name)} 배경</span>
        <label>확대 <input type="range" min="0.6" max="2.5" step="0.01" value="${f.z}" data-f="z"></label>
        <label>좌우 <input type="range" min="-0.5" max="0.5" step="0.01" value="${f.x}" data-f="x"></label>
        <label>위아래 <input type="range" min="-0.5" max="0.5" step="0.01" value="${f.y}" data-f="y"></label>
        <label>기울기 <input type="range" min="-30" max="30" step="1" value="${Math.round((f.r * 180) / Math.PI)}" data-f="r"></label>
        <button type="button" class="mini ghost" data-f="reset">처음대로</button>
      </div>`;
    return fit;
  }).join("");
}
let fitDraw = null, fitSave = null;
$("fit-panels").addEventListener("input", (e) => {
  const key = e.target.dataset.f;
  const box = e.target.closest(".fit");
  if (!key || !box || key === "reset") return;
  const id = box.dataset.id, c = CHARACTERS.find((x) => x.id === id);
  const f = fitOf(c, Number(box.dataset.i));
  f[key] = key === "r" ? (Number(e.target.value) * Math.PI) / 180 : Number(e.target.value);
  localFit[id] = f;
  clearTimeout(fitDraw); fitDraw = setTimeout(renderPreview, 120);
  clearTimeout(fitSave);
  if (apiOk) fitSave = setTimeout(() => fetch(`/api/sd/${id}/bgfit`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(f),
  }).then(() => { if (sdIndex[id]) sdIndex[id].bgfit = f; else sdIndex[id] = { bgfit: f }; }).catch(() => {}), 600);
});
$("fit-panels").addEventListener("click", async (e) => {
  const b = e.target.closest('[data-f="reset"]');
  if (!b) return;
  const id = b.closest(".fit").dataset.id;
  delete localFit[id];
  if (sdIndex[id]) delete sdIndex[id].bgfit;
  if (apiOk) await fetch(`/api/sd/${id}/bgfit`, { method: "DELETE" }).catch(() => {});
  renderWork();
});

$("sd-panels").addEventListener("click", (e) => {
  const sw = e.target.closest(".sw");
  if (sw) openPicker(CHARACTERS.find((x) => x.id === sw.dataset.id), sw.dataset.slot);
});

let uploadTarget = null;
$("sd-panels").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-act]");
  if (!btn || btn.dataset.act === "scale") return;
  const box = btn.closest(".sd");
  const c = CHARACTERS.find((x) => x.id === box.dataset.id), kind = box.dataset.kind;
  if (btn.dataset.act === "up") { uploadTarget = { c, kind }; $("file").value = ""; $("file").click(); }
  if (btn.dataset.act === "del") {
    if (!confirm(`${c.name}의 ${KINDS.find(([k]) => k === kind)[1]}을(를) 지울까요?`)) return;
    delete localImg[`${c.id}:${kind}`];
    if (apiOk) {
      await fetch(`/api/sd/${c.id}/${kind}`, { method: "DELETE" });
      await loadIndex();
    }
    renderWork();
  }
});
let scaleTimer = null;
$("sd-panels").addEventListener("input", (e) => {
  if (e.target.dataset.act !== "scale") return;
  const box = e.target.closest(".sd");
  const id = box.dataset.id, kind = box.dataset.kind, s = Number(e.target.value);
  if (sdIndex[id] && sdIndex[id][kind]) sdIndex[id][kind].s = s;
  if (localImg[`${id}:${kind}`]) localImg[`${id}:${kind}`].s = s;
  renderPreview();
  clearTimeout(scaleTimer);
  if (apiOk && sdIndex[id] && sdIndex[id][kind]) {
    scaleTimer = setTimeout(() => fetch(`/api/sd/${id}/${kind}/scale`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ s }),
    }), 500);
  }
});
$("file").onchange = async () => {
  const file = $("file").files[0];
  if (!file || !uploadTarget) return;
  const { c, kind } = uploadTarget;
  $("busy").hidden = false;
  try {
    const { blob, canvas } = kind === "art" ? await prepareArt(file) : await prepareImage(file);
    const img = await loadImg(URL.createObjectURL(blob));
    localImg[`${c.id}:${kind}`] = { img, s: 1, v: Date.now() };
    if (apiOk) {
      const r = await fetch(`/api/sd/${c.id}/${kind}`, { method: "PUT", headers: { "content-type": blob.type }, body: blob });
      if (r.ok) await loadIndex();
      else alert("서버 저장에 실패했어요. 이번 미리보기에만 쓰여요.");
    }
    if (kind === "tall") mode = "two";
    canvas.width = 0;
  } catch (err) {
    alert("이미지를 읽지 못했어요. 다른 파일로 해주세요.");
  }
  $("busy").hidden = true;
  renderWork();
};

function renderMode(hasTall) {

  $("mode").innerHTML = `
    <button type="button" data-mode="one" class="${mode === "one" ? "on" : ""}">한 쌍<small>작은 SD</small></button>
    <button type="button" data-mode="two" class="${mode === "two" ? "on" : ""}">두 쌍<small>길쭉한 SD + 작은 SD</small></button>
    ${mode === "two" && !hasTall ? `<p class="sub mode-note">길쭉한 SD를 올리면 긴 틀에 크게 서고, 작은 SD는 모서리에 스티커로 붙어요.</p>` : ""}`;
}
$("mode").onclick = (e) => {
  const b = e.target.closest("button[data-mode]");
  if (!b) return;
  mode = b.dataset.mode;
  renderWork();
};

// 지금 보여줄 썰: 고치는 중인 내용 → 사이트에서 직접 고쳐 저장한 썰 → stories.json 원본
// (Claude가 원본을 새로 쓰면 버전이 달라져서, 예전에 고친 글 대신 새 썰이 나옴)
const storyVersion = (st) => (st ? String(strHash(JSON.stringify(st))) : "");
function savedEdit() {
  const key = pairKey(sel[0], sel[1]), base = stories[key], ov = storyEdits[key];
  return ov && ov.base === storyVersion(base) ? ov : null;
}
function currentStory() {
  if (edit) return edit;
  const base = stories[pairKey(sel[0], sel[1])] || null;
  const ov = savedEdit();
  return ov ? { ...(base || {}), ...ov.story } : base;
}
function renderStoryNote() {
  const st = stories[pairKey(sel[0], sel[1])];
  const ask = `${sel[0].name} × ${sel[1].name} 써줘`;
  $("story-note").innerHTML = st
    ? `<p class="ok">썰 있음 · <b>${esc(st.name)}</b> <span>(${esc(st.at || "")}${savedEdit() ? " · 직접 고친 글" : ""})</span></p>
       <p class="sub">다시 쓰고 싶으면 Claude한테 <b>"${esc(sel[0].name)} × ${esc(sel[1].name)} 다시 써줘"</b></p>`
    : `<p class="wait">아직 이 페어 썰이 없어요</p>
       <p class="sub">폰 Claude 앱 → Code 탭 → <b>kunsa66/Private</b> 세션에서 이렇게 말해주세요</p>
       <div class="ask"><code>${esc(ask)}</code><button type="button" class="mini" id="copy-ask">복사</button></div>
       <p class="sub">1~2분 뒤 아래 <b>새 썰 확인</b>을 누르면 들어와요</p>`;
  const cp = $("copy-ask");
  if (cp) cp.onclick = () => navigator.clipboard.writeText(ask).then(() => { cp.textContent = "복사됨"; }).catch(() => {});
}

async function renderWork() {
  const ready = sel[0] && sel[1];
  $("work").hidden = !ready;
  $("pick-hint").hidden = !!ready;
  if (!ready) return;
  await renderSdPanels();
  const hasTall = (await Promise.all(sel.map((c) => sdOf(c, "tall")))).some(Boolean);
  renderMode(hasTall);
  renderStoryNote();
  renderPairName();
  renderFitPanels();
  renderEdit();
  renderPreview();
}

let previewToken = 0, previewUrl = null;
async function renderPreview() {
  const token = ++previewToken;
  const st = currentStory();
  const people = await Promise.all(sel.map(async (c) => {
    const [photo, full, small, tall, art] = await Promise.all([photoOf(c), fullOf(c), sdOf(c, "small"), sdOf(c, "tall"), sdOf(c, "art")]);
    return { c, mbti: c.mbti, photo, full, small, tall, art, colors: colorsFor(c, small, tall), bgfit: fitOf(c, sel.indexOf(c)) };
  }));
  const title = titleOf();
  await loadFrameFonts((st ? JSON.stringify(st) : "") + title.name);
  if (token !== previewToken) return;
  const cv = drawFrame(document.createElement("canvas"), { mode, people, story: st, title });
  const blob = await new Promise((r) => cv.toBlob(r, "image/png"));
  if (token !== previewToken) return;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(blob);
  $("preview").src = previewUrl;
  const fname = `태풍고_${sel[0].name}x${sel[1].name}${mode === "two" ? "_두쌍" : ""}.png`;
  $("save").href = previewUrl;
  $("save").download = fname;
}

/* ---------- 페어명 꾸미기: 이름 바꾸기 + 글자마다 색 (서버에 저장) ---------- */
let pairStyles = {};
const lastCols = {};   // 이미지 칸에서 계산한 캐릭터 색 (페어명 색 고를 때 같이 보여줌)
let pnSel = 0;
const PN_PRESETS = ["#23272F", "#8A919C", "#3B7BE6", "#7DB9F2", "#F59E3B", "#F27BA8", "#F2C94C", "#5BBF8A", "#9B7BE0", "#E5484D"];
async function loadPairStyles() {
  try { pairStyles = await (await fetch("/api/pairstyle", { cache: "no-store" })).json(); } catch (e) { pairStyles = {}; }
}
function defaultName() {
  const st = currentStory();
  return (st && st.name) || `${sel[0].name.slice(-2)} × ${sel[1].name.slice(-2)}`;
}
function styleOf() { return pairStyles[pairKey(sel[0], sel[1])] || { name: "", colors: [] }; }
function titleOf() {
  const s = styleOf();
  return { name: s.name || defaultName(), colors: s.colors || [] };
}
let styleTimer = null;
function saveStyle(next) {
  const key = pairKey(sel[0], sel[1]);
  pairStyles[key] = next;
  clearTimeout(styleTimer);
  if (apiOk) styleTimer = setTimeout(() => fetch("/api/pairstyle", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key, ...next }),
  }).catch(() => {}), 600);
}
function renderPairName() {
  const t = titleOf(), s = styleOf();
  const chars = [...t.name];
  if (pnSel >= chars.length) pnSel = 0;
  const swatches = [...PN_PRESETS];
  for (const c of sel) {
    const meta = lastCols[c.id] || {};
    Object.values(meta).forEach((v) => { if (v && !swatches.includes(v)) swatches.push(v); });
  }
  const cur = t.colors[pnSel] || "";
  if ($("pn-input") !== document.activeElement) $("pn-input").value = s.name || "";
  $("pn-input").placeholder = defaultName();
  $("pn-chars").innerHTML = chars.map((ch, i) =>
    ch.trim() ? `<button type="button" class="pn-ch${i === pnSel ? " on" : ""}" data-i="${i}" style="color:${esc(t.colors[i] || "#23272F")}">${esc(ch)}</button>` : `<span class="pn-gap"></span>`).join("");
  $("pn-pal").innerHTML = swatches.map((c) => `<button type="button" class="pn-sw${c === cur ? " on" : ""}" data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join("")
    + `<label class="pn-custom" aria-label="직접 고르기"><input type="color" id="pn-color" value="${cur || "#23272f"}">＋</label>`;
}
function setCharColor(color, all = false) {
  const t = titleOf(), s = styleOf();
  const colors = [...t.colors];
  if (all) [...t.name].forEach((_, i) => { colors[i] = color; });
  else colors[pnSel] = color;
  saveStyle({ name: s.name || "", colors });
  renderPairName(); renderPreview();
}
$("pn-input").addEventListener("input", () => {
  const s = styleOf();
  saveStyle({ name: $("pn-input").value.trim(), colors: s.colors || [] });
  renderPairName();
  clearTimeout(editTimer);
  editTimer = setTimeout(renderPreview, 250);
});
$("pn-chars").onclick = (e) => {
  const b = e.target.closest(".pn-ch");
  if (!b) return;
  pnSel = Number(b.dataset.i);
  renderPairName();
};
$("pn-pal").addEventListener("click", (e) => {
  const b = e.target.closest(".pn-sw");
  if (b) setCharColor(b.dataset.c);
});
$("pn-pal").addEventListener("change", (e) => { if (e.target.id === "pn-color") setCharColor(e.target.value); });
$("pn-all").onclick = () => setCharColor(titleOf().colors[pnSel] || "#23272F", true);
$("pn-reset").onclick = () => { saveStyle({ name: "", colors: [] }); pnSel = 0; renderPairName(); renderPreview(); };

/* ---------- 글자 고치기 (미리보기·저장용, 서버에 저장 안 됨) ---------- */
const EDIT_FIELDS = (A, B) => [
  ["tags", "태그 (띄어쓰기로 구분)"],
  [`lines.${A.id}`, `${A.name} 대사`], [`lines.${B.id}`, `${B.name} 대사`],
  ["parts.meet", "01 첫 만남"], ["parts.some", "02 썸"], ["parts.love", "03 연애"], ["parts.end", "04 헤어짐"],
];
const getPath = (o, p) => p.split(".").reduce((x, k) => (x ? x[k] : undefined), o);
function setPath(o, p, v) {
  const ks = p.split(".");
  let x = o;
  ks.slice(0, -1).forEach((k) => { x[k] = x[k] || {}; x = x[k]; });
  x[ks[ks.length - 1]] = v;
}
function renderEdit() {
  const open = $("edit-box").open;
  const base = currentStory() || { name: "", tags: [], lines: {}, views: {}, parts: {} };
  $("edit-fields").innerHTML = EDIT_FIELDS(sel[0], sel[1]).map(([p, label]) => {
    const v = p === "tags" ? (base.tags || []).join(" ") : getPath(base, p) || "";
    const long = p.startsWith("parts.");
    return `<label>${esc(label)}${long ? `<textarea data-p="${p}" rows="3">${esc(v)}</textarea>` : `<input data-p="${p}" value="${esc(v)}">`}</label>`;
  }).join("");
  $("edit-box").open = open;
}
let editTimer = null;
$("edit-fields").addEventListener("input", (e) => {
  const p = e.target.dataset.p;
  if (!p) return;
  if (!edit) edit = JSON.parse(JSON.stringify(currentStory() || { name: "", tags: [], lines: {}, views: {}, parts: {} }));
  setPath(edit, p, p === "tags" ? e.target.value.split(/\s+/).filter(Boolean) : e.target.value);
  clearTimeout(editTimer);
  editTimer = setTimeout(renderPreview, 250);
});
// 저장: 고친 글을 서버에 남김 (폰·PC 어디서 열어도 고친 글로 나옴)
$("edit-save").onclick = async () => {
  if (!edit) { $("edit-msg").textContent = "고친 내용이 없어요."; return; }
  const key = pairKey(sel[0], sel[1]);
  const body = { key, base: storyVersion(stories[key]), story: { tags: edit.tags || [], lines: edit.lines || {}, parts: edit.parts || {} } };
  $("edit-msg").textContent = "저장 중…";
  try {
    const r = await fetch("/api/storyedit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error();
    storyEdits[key] = await r.json();
    edit = null;
    $("edit-msg").textContent = "저장했어요.";
  } catch (e) { $("edit-msg").textContent = "저장하지 못했어요. (이 미리보기에는 적용돼요)"; return; }
  renderStoryNote(); renderEdit(); renderPreview();
};
// 원래대로: 고친 글을 지우고 Claude가 쓴 원본으로
$("edit-reset").onclick = async () => {
  const key = pairKey(sel[0], sel[1]);
  edit = null;
  if (storyEdits[key]) {
    delete storyEdits[key];
    await fetch("/api/storyedit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key, story: null }) }).catch(() => {});
  }
  $("edit-msg").textContent = "원래 썰로 돌렸어요.";
  renderStoryNote(); renderEdit(); renderPreview();
};

$("reload").onclick = async () => {
  $("reload").textContent = "확인 중…";
  await loadStories();
  edit = null;
  $("reload").textContent = "새 썰 확인";
  if (sel[0] && sel[1]) { renderStoryNote(); renderEdit(); renderPairName(); renderPreview(); }
};

/* ---------- 시작 ---------- */
renderSlots();
renderRoster();
Promise.all([loadStories(), loadIndex(), loadMbti(), loadPairStyles()]).then(() => { if (sel[0] && sel[1]) renderWork(); });
loadFrameFonts();
