/* 태풍고 틀 생성기: 이름 두 개 고르기 → SD 이미지(저장됨) → 썰(stories.json) → 틀 미리보기 → PNG */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
const norm = (s) => String(s || "").replace(/\s+/g, "").toLowerCase();
const ROSTER = PAIR_ROSTER.map((id) => CHARACTERS.find((c) => c.id === id)).filter(Boolean);
const KINDS = [["small", "작은 SD"], ["tall", "길쭉한 SD"]];
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
async function loadStories() {
  try {
    const r = await fetch(`stories.json?t=${Date.now()}`, { cache: "no-store" });
    stories = await r.json();
  } catch (e) { stories = {}; }
}
async function loadIndex() {
  try {
    const r = await fetch("/api/sd", { cache: "no-store" });
    if (!r.ok) throw new Error();
    sdIndex = await r.json();
    apiOk = true;
  } catch (e) { apiOk = false; }
}
async function loadMbti() {
  try { mbtiFix = await (await fetch("/api/mbti", { cache: "no-store" })).json(); } catch (e) { mbtiFix = {}; }
}
const loadImage = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

async function sdOf(c, kind) {
  const local = localImg[`${c.id}:${kind}`];
  const meta = sdIndex[c.id] && sdIndex[c.id][kind];
  if (local && (!meta || local.v >= meta.v)) return local;
  if (!meta) return null;
  const k = `${c.id}:${kind}:${meta.v}`;
  if (!imgCache[k]) imgCache[k] = loadImage(`/api/sd/${c.id}/${kind}?v=${meta.v}`).catch(() => null);
  const img = await imgCache[k];
  return img ? { img, s: meta.s || 1, v: meta.v } : null;
}
async function photoOf(c) {
  if (!c.photo) return null;
  if (!photoCache[c.id]) photoCache[c.id] = loadImage(`../${c.photo}`).catch(() => null);
  return photoCache[c.id];
}

/* ---------- 이미지 손질: 흰 배경 지우기 + 여백 자르기 ---------- */
async function prepareImage(file) {
  const src = await loadImage(URL.createObjectURL(file));
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
function pick(c) {
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
  if (b) pick(ROSTER.find((c) => c.id === b.dataset.id));
};
$("q").oninput = renderRoster;
$("q-form").onsubmit = (e) => {
  e.preventDefault();
  const n = norm($("q").value);
  const hits = ROSTER.filter((c) => norm(c.name).includes(n));
  const exact = ROSTER.find((c) => norm(c.name) === n);
  if (exact || hits.length === 1) pick(exact || hits[0]);
};

/* ---------- 이미지 칸 · 틀 · 미리보기 ---------- */
async function renderSdPanels() {
  const html = await Promise.all(sel.map(async (c, i) => {
    const cells = await Promise.all(KINDS.map(async ([kind, label]) => {
      const f = await sdOf(c, kind);
      return `<div class="sd" data-id="${c.id}" data-kind="${kind}">
        <div class="sd-img">${f ? `<img src="${f.img.src}" alt="">` : `<span>${label}<br>없음</span>`}</div>
        <div class="sd-label">${label}</div>
        <div class="sd-btns">
          <button type="button" class="mini" data-act="up">${f ? "바꾸기" : "올리기"}</button>
          ${f ? `<button type="button" class="mini ghost" data-act="del">지우기</button>` : ""}
        </div>
        ${f ? `<label class="sd-scale">크기 <input type="range" min="0.7" max="1.3" step="0.01" value="${f.s || 1}" data-act="scale"></label>` : ""}
      </div>`;
    }));
    const [small, tall] = await Promise.all([sdOf(c, "small"), sdOf(c, "tall")]);
    const cols = colorsFor(c, small, tall);
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
    if (!confirm(`${c.name}의 ${kind === "small" ? "작은" : "길쭉한"} SD를 지울까요?`)) return;
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
    const { blob, canvas } = await prepareImage(file);
    const img = await loadImage(URL.createObjectURL(blob));
    localImg[`${c.id}:${kind}`] = { img, s: 1, v: Date.now() };
    if (apiOk) {
      const r = await fetch(`/api/sd/${c.id}/${kind}`, { method: "PUT", headers: { "content-type": "image/png" }, body: blob });
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
  if (!hasTall && mode === "two") mode = "one";
  $("mode").innerHTML = `
    <button type="button" data-mode="one" class="${mode === "one" ? "on" : ""}">한 쌍<small>작은 SD</small></button>
    <button type="button" data-mode="two" class="${mode === "two" ? "on" : ""}" ${hasTall ? "" : "disabled"}>두 쌍<small>작은 + 길쭉한 SD</small></button>`;
}
$("mode").onclick = (e) => {
  const b = e.target.closest("button[data-mode]");
  if (!b || b.disabled) return;
  mode = b.dataset.mode;
  renderMode(true); renderPreview();
};

function currentStory() {
  if (edit) return edit;
  return stories[pairKey(sel[0], sel[1])] || null;
}
function renderStoryNote() {
  const st = stories[pairKey(sel[0], sel[1])];
  const ask = `${sel[0].name} × ${sel[1].name} 써줘`;
  $("story-note").innerHTML = st
    ? `<p class="ok">썰 있음 · <b>${esc(st.name)}</b> <span>(${esc(st.at || "")})</span></p>
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
  renderEdit();
  renderPreview();
}

let previewToken = 0, previewUrl = null;
async function renderPreview() {
  const token = ++previewToken;
  const st = currentStory();
  const people = await Promise.all(sel.map(async (c) => {
    const [photo, small, tall] = await Promise.all([photoOf(c), sdOf(c, "small"), sdOf(c, "tall")]);
    return { c, mbti: mbtiFix[c.id] || c.mbti, photo, small, tall, colors: colorsFor(c, small, tall) };
  }));
  await loadFrameFonts(st ? JSON.stringify(st) : "");
  if (token !== previewToken) return;
  const cv = drawFrame(document.createElement("canvas"), { mode, people, story: st });
  const blob = await new Promise((r) => cv.toBlob(r, "image/png"));
  if (token !== previewToken) return;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(blob);
  $("preview").src = previewUrl;
  const fname = `태풍고_${sel[0].name}x${sel[1].name}${mode === "two" ? "_두쌍" : ""}.png`;
  $("save").href = previewUrl;
  $("save").download = fname;
}

/* ---------- 글자 고치기 (미리보기·저장용, 서버에 저장 안 됨) ---------- */
const EDIT_FIELDS = (A, B) => [
  ["name", "페어명"], ["tags", "태그 (띄어쓰기로 구분)"],
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
$("edit-reset").onclick = () => { edit = null; renderEdit(); renderPreview(); };

$("reload").onclick = async () => {
  $("reload").textContent = "확인 중…";
  await loadStories();
  edit = null;
  $("reload").textContent = "새 썰 확인";
  if (sel[0] && sel[1]) { renderStoryNote(); renderEdit(); renderPreview(); }
};

/* ---------- 시작 ---------- */
renderSlots();
renderRoster();
Promise.all([loadStories(), loadIndex(), loadMbti()]).then(() => { if (sel[0] && sel[1]) renderWork(); });
loadFrameFonts();
