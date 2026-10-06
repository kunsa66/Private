const $ = (id) => document.getElementById(id);
const norm = (s) => s.replace(/\s+/g, "").toLowerCase();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const AGE = { 1: 17, 2: 18 };

// 생일이 없는 사람은 사주를 만들지 않음 (궁합은 성향·MBTI로만). 시간이 있으면 시주까지
const refreshPillars = (c) => (c.pillars = c.birth ? getPillars(c.birth, c.hour) : null);
CHARACTERS.forEach(refreshPillars);
try { localStorage.removeItem("pemibu-bday"); } catch (e) { /* 예전 버전의 생일 입력 기록 정리 */ }

/* 친구들이 입력한 생일·태어난 시: 서버에 모아서 모두에게 공유.
   data.js에 적힌 값이 있으면 항상 그게 우선. 처음 입력된 값만 저장됨. */
const BIRTH_YEAR = { 1: 2010, 2: 2009 }; // 2026년 기준 1학년=2010년생, 2학년=2009년생
const SHARED = {
  birth: { api: "/api/birthdays", note: "birthNote" },
  hour: { api: "/api/hours", note: "hourNote" },
};

function applyShared(c, field, value) {
  if (c[field] || !value) return;
  c[field] = value;
  c[SHARED[field].note] = "친구가 입력";
  refreshPillars(c);
}

for (const field of Object.keys(SHARED)) {
  fetch(SHARED[field].api, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : {}))
    .then((map) => CHARACTERS.forEach((c) => applyShared(c, field, map[c.id])))
    .catch(() => { /* 내 PC 미리보기(서버실행.bat)에는 저장소가 없음 → 그냥 넘어감 */ });
}

async function saveShared(c, field, value) {
  applyShared(c, field, value);
  try {
    const r = await fetch(SHARED[field].api, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: c.id, [field]: value }) });
    const res = await r.json();
    // 다른 친구가 먼저 입력해 둔 값이 있으면 그걸 따름
    if (res[field] && res[field] !== c[field]) { c[field] = ""; applyShared(c, field, res[field]); }
  } catch (e) { /* 저장 실패해도 이번 결과는 입력한 값으로 진행 */ }
}

const hourOptions = (placeholder) =>
  `<option value="">${placeholder}</option>` + HOUR_SLOTS.map(([n, t]) => `<option value="${n}">${n} (${t})</option>`).join("");
const hourLabel = (name) => { const s = HOUR_SLOTS[hourIndex(name)]; return s ? `${s[0]} ${s[1]}` : ""; };

function show(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  $(id).classList.add("active");
  window.scrollTo(0, 0);
}

function findChar(q) {
  const n = norm(q);
  return CHARACTERS.find((c) => norm(c.name) === n || (c.aliases || []).some((a) => norm(a) === n));
}

/* 초기화 */
$("site-title").textContent = SITE.titleHanja;
$("site-sub").textContent = `${SITE.title} · ${SITE.subtitle}`;
$("seal").textContent = SITE.seal;
document.title = SITE.title;

function avatar(c, cls) {
  return c.photo
    ? `<img class="${cls}" src="${esc(c.photo)}" alt="">`
    : `<span class="${cls} ph">${esc(c.name.slice(-1))}</span>`;
}
/* 학년별 명단: 각자 영역 안에서 스크롤, 이름을 치면 양쪽 다 걸러짐 */
function renderRoster() {
  const n = norm($("name-input").value);
  for (const g of [2, 1]) {
    const list = CHARACTERS.filter((c) => c.grade === g &&
      (!n || norm(c.name).includes(n) || (c.aliases || []).some((a) => norm(a).includes(n))));
    $(`roster-${g}`).innerHTML = list.length
      ? `<div class="chips">${list.map((c) => `<button type="button" class="chip" data-n="${esc(c.name)}">${avatar(c, "")}<span>${esc(c.name)}</span></button>`).join("")}</div>`
      : `<p class="empty">${n ? "해당하는 이름 없음" : "명단 없음"}</p>`;
  }
}
renderRoster();

/* 생일칸 (생일 정보가 없는 사람을 골랐을 때만, 선택 입력) */
let pending = null;
let bdayGrade = 2;

$("bday-m").innerHTML = `<option value="">월</option>` + Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${i + 1}월</option>`).join("");
function fillDays() {
  const m = Number($("bday-m").value);
  const max = m ? new Date(BIRTH_YEAR[bdayGrade], m, 0).getDate() : 31;
  const keep = Number($("bday-d").value);
  $("bday-d").innerHTML = `<option value="">일</option>` + Array.from({ length: max }, (_, i) => `<option value="${i + 1}">${i + 1}일</option>`).join("");
  if (keep && keep <= max) $("bday-d").value = String(keep);
}
function setBdayGrade(g) {
  bdayGrade = g;
  document.querySelectorAll("#bday-grade button").forEach((b) => b.classList.toggle("on", Number(b.dataset.g) === g));
  fillDays();
}
$("bday-grade").onclick = (e) => { const b = e.target.closest("button"); if (b) setBdayGrade(Number(b.dataset.g)); };
$("bday-m").onchange = fillDays;
$("bday-h").innerHTML = hourOptions("태어난 시 (모르면 비워두기)");

function openBday(c) {
  pending = c;
  $("name-input").value = c.name;
  $("bday-note").textContent = `${c.name}의 생일 정보가 없어요. 알면 골라주세요. 입력하면 모두의 궁합에 사주가 반영돼요. 모르면 그냥 점지를 누르세요.`;
  $("bday-m").value = "";
  $("bday-h").value = "";
  setBdayGrade(c.grade);
  $("bday").hidden = false;
}
function closeBday() {
  pending = null;
  $("bday").hidden = true;
}

// 생일이 없는 사람은 한 번 멈춰서 생일칸을 보여줌 (입력은 선택)
function choose(c) {
  if (c.birth) { closeBday(); runLoading(c); return; }
  if (pending !== c) { openBday(c); return; }
  const m = Number($("bday-m").value), d = Number($("bday-d").value), h = $("bday-h").value;
  closeBday();
  if (m && d) {
    const birth = `${BIRTH_YEAR[bdayGrade]}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    Promise.all([saveShared(c, "birth", birth), h ? saveShared(c, "hour", h) : null]).then(() => runLoading(c));
  } else {
    runLoading(c); // 생일 없이 시간만으로는 시주를 못 세움
  }
}

function goInput() {
  $("name-input").value = "";
  $("name-err").textContent = "";
  closeBday();
  renderRoster();
  show("s-input");
  focusInput();
}
document.querySelectorAll("[data-back]").forEach((b) => (b.onclick = goInput));

$("name-input").oninput = () => {
  $("name-err").textContent = "";
  const c = findChar($("name-input").value);
  if (c && !c.birth) { if (pending !== c) openBday(c); }
  else if (pending) closeBday();
  renderRoster();
};

$("name-form").onsubmit = (e) => {
  e.preventDefault();
  const q = $("name-input").value.trim();
  if (!q) return;
  const n = norm(q);
  const hits = CHARACTERS.filter((x) => norm(x.name).includes(n));
  const c = findChar(q) || (hits.length === 1 ? hits[0] : null);
  if (!c) { $("name-err").textContent = "명단에 없는 이름이에요. 아래에서 골라주세요."; return; }
  choose(c);
};
$("s-input").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  $("name-err").textContent = "";
  choose(findChar(chip.dataset.n));
});

/* 분석 중 연출 */
const LOADING_MSGS = ["사주팔자를 펼치는 중", "오행의 흐름을 읽는 중", "인연의 실을 따라가는 중", "궁합 부적을 쓰는 중"];
function runLoading(c) {
  show("s-loading");
  const result = findMatches(c, CHARACTERS);
  let i = 0;
  $("loading-msg").textContent = LOADING_MSGS[0];
  const iv = setInterval(() => {
    i++;
    if (i < LOADING_MSGS.length) $("loading-msg").textContent = LOADING_MSGS[i];
    else { clearInterval(iv); renderResult(c, result); }
  }, 550);
}

/* 결과 */
function pillarCell(label, x) {
  const sc = ELEMENT_COLORS[stemEl(x.s)], bc = ELEMENT_COLORS[BRANCH_EL[x.b]];
  return `<div class="pillar"><div class="lbl">${label}</div><div class="gz">
    <span style="color:${sc}">${STEMS_H[x.s]}<small>${STEMS[x.s]} · ${ELEMENTS[stemEl(x.s)]}</small></span>
    <span style="color:${bc}">${BRANCHES_H[x.b]}<small>${BRANCHES[x.b]} · ${ELEMENTS[BRANCH_EL[x.b]]}</small></span>
  </div></div>`;
}

function profileLine(c) {
  return `${c.grade}학년 · ${AGE[c.grade]}세 · ${esc(c.gender || "")}`;
}

function selfPanel(A) {
  const p = A.pillars;
  const head = `<div class="who">
      ${avatar(A, "avatar")}
      <div>
        <div class="meta-top">${profileLine(A)}</div>
        <h2>${esc(A.name)}${A.hanjaName ? `<small>${esc(A.hanjaName)}</small>` : ""}</h2>
        <div class="one">${esc(A.oneLiner)}</div>
      </div>
    </div>`;
  const tags = `<li><b>키워드</b><span class="tags">${A.keywords.map((k) => `<span>${esc(k)}</span>`).join("")}</span></li>`;

  // 생일이 없으면 사주 부분을 빼고 안내만
  if (!p) {
    return `<div class="panel"><div class="panel-in">${head}
      <div class="section-title">사주 원국</div>
      <p class="no-saju">생일 정보가 없어서 사주는 보지 않았어요.<br>궁합은 성향과 MBTI로만 봐요.</p>
      <div class="meta">${esc(A.mbti)}</div>
      <div class="section-title">타고난 기운</div>
      <ul class="self-lines">${tags}</ul>
    </div></div>`;
  }

  const s = selfReading(A);
  const max = Math.max(...p.counts, 1);
  const date = A.birth.replace(/-/g, ".");
  // 시간을 알면 시주까지 8글자, 모르면 결과 화면에서 바로 추가할 수 있게
  const hourInfo = p.hour
    ? `<br>태어난 시 ${esc(hourLabel(A.hour))}${A.hourNote ? ` · ${esc(A.hourNote)}` : ""}`
    : "";
  const addHour = p.hour ? "" : `<div class="hour-add">
      <label for="hour-add">태어난 시간을 알면 시주까지 볼 수 있어요</label>
      <select id="hour-add" data-id="${esc(A.id)}">${hourOptions("태어난 시 고르기")}</select>
    </div>`;
  return `<div class="panel"><div class="panel-in">${head}
    <div class="section-title">사주 원국</div>
    <div class="pillars${p.hour ? " four" : ""}">${pillarCell("년주", p.year)}${pillarCell("월주", p.month)}${pillarCell("일주", p.day)}${p.hour ? pillarCell("시주", p.hour) : ""}</div>
    <div class="meta">${date} · ${esc(A.birthNote || "")}${hourInfo}<br>${p.animal}띠 · ${esc(A.mbti)}</div>
    ${addHour}
    <div class="section-title">오행 분포</div>
    <div class="el-bars">${p.counts.map((c, e) => `<div class="el-bar">${c}<i style="height:${(c / max) * 64}px;background:${ELEMENT_COLORS[e]}"></i><b>${ELEMENTS_H[e]}<small>${ELEMENTS[e]}</small></b></div>`).join("")}</div>
    <div class="section-title">타고난 기운</div>
    <ul class="self-lines">
      <li><b>일간</b><span>${esc(s.dayMaster)}</span></li>
      <li><b>강한 기운</b><span>${esc(s.strong)}</span></li>
      <li><b>부족 기운</b><span>${s.lack.split(" / ").map(esc).join("<br>")}</span></li>
      ${tags}
    </ul>
  </div></div>`;
}

function ptList(pts) {
  if (!pts.length) return `<ul><li class="zero" data-d="·">특별히 걸리는 포인트 없이 무난한 흐름.</li></ul>`;
  return `<ul>${pts.map((p) => {
    const cls = p.delta > 0 ? "plus" : p.delta < 0 ? "minus" : "zero";
    const d = p.delta > 0 ? `+${p.delta}` : p.delta < 0 ? `${p.delta}` : "·";
    return `<li class="${cls}" data-d="${d}">${esc(p.text)}</li>`;
  }).join("")}</ul>`;
}

function matchPanel(kind, A, r) {
  const B = r.partner, info = reading(kind, A, r);
  return `<div class="panel match ${kind}">
    <div class="match-head">
      <div class="tag">${kind === "best" ? "최고의 상대" : "최악의 상대"}</div>
      <div class="duo">${avatar(A, "")}<i>${kind === "best" ? "緣" : "剋"}</i>${avatar(B, "")}</div>
      <div class="vs">${esc(A.name)} · ${esc(B.name)}</div>
      <div class="score">${r.total}<small>점</small></div>
      <div class="grade"><span class="hj">${esc(info.tier.hanja)}</span> ${esc(info.tier.ko)} · ${esc(info.tier.fuKo)}</div>
    </div>
    <div class="panel-in script">
      <div class="say">"${esc(info.open)}"</div>
      <div class="partner">${esc(B.name)} · ${profileLine(B)} · ${B.pillars ? `${pillarText(B.pillars.day)}일주 · ${B.pillars.animal}띠` : "생일 정보 없음"} · ${esc(B.mbti)}<br>${esc(B.oneLiner)}</div>
      <div class="section-title">사주로 보면</div>
      ${r.saju ? ptList(r.saju.pts) : `<p class="no-saju">${esc(!A.pillars ? A.name : B.name)}의 생일 정보가 없어서 사주는 빼고 봤어요.<br>이 궁합은 성향 70점, MBTI 30점 만점으로 계산했어요.</p>`}
      <div class="section-title">성향으로 보면</div>
      ${ptList(r.traits.pts)}
      <div class="section-title">MBTI ${esc(A.mbti)} × ${esc(B.mbti)}</div>
      ${ptList(r.mbti.pts)}
      <div class="close">"${esc(info.close)}"</div>
      <div class="card-wrap" id="card-${kind}"><div class="card-loading">부적 쓰는 중…</div></div>
    </div>
  </div>`;
}

let renderToken = 0;

async function renderCard(kind, A, r, token) {
  const info = reading(kind, A, r);
  const cv = await makeCard(kind, A, r, info);
  if (token !== renderToken) return; // 그새 다른 이름을 봤으면 버림
  const wrap = $(`card-${kind}`);
  let url;
  try {
    url = cv.toDataURL("image/png");
  } catch (err) {
    wrap.innerHTML = `<p class="err">사진이 들어간 카드는 index.html을 직접 열면 저장이 막혀요. 서버실행.bat으로 열어주세요.</p>`;
    return;
  }
  const fname = `${info.tier.ko}_${A.name}_${r.partner.name}.png`;
  // 공유 링크(Artifact) 안에서는 다운로드 링크가 막혀 있어서, 길게 눌러 저장만 안내
  wrap.innerHTML = `<img src="${url}" alt="${esc(A.name)}, ${esc(r.partner.name)} 궁합 부적">
    <p class="hint">${IN_FRAME ? "이미지를 꾹 눌러 사진에 저장하세요 (PC는 우클릭 → 이미지 저장)" : "모바일은 이미지를 꾹 눌러 저장할 수 있어요"}</p>
    ${IN_FRAME ? "" : `<a class="btn" href="${url}" download="${esc(fname)}">부적 저장</a>`}`;
}

const IN_FRAME = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();

// 결과 화면에서 태어난 시를 고르면: 저장 → 사주 다시 계산 → 결과 다시 그림 (스크롤 위치 유지)
$("result").addEventListener("change", (e) => {
  if (e.target.id !== "hour-add" || !e.target.value) return;
  const A = CHARACTERS.find((c) => c.id === e.target.dataset.id);
  if (!A) return;
  const y = window.scrollY;
  e.target.disabled = true;
  saveShared(A, "hour", e.target.value).then(() => {
    renderResult(A, findMatches(A, CHARACTERS));
    window.scrollTo(0, y);
  });
});

function renderResult(A, res) {
  $("result").innerHTML = selfPanel(A) + matchPanel("best", A, res.best) + matchPanel("worst", A, res.worst);
  show("s-result");
  const token = ++renderToken;
  renderCard("best", A, res.best, token).then(() => renderCard("worst", A, res.worst, token));
}

// 데스크톱에서만 자동 포커스 (아이폰은 키보드가 올라와 명단을 가림)
function focusInput() {
  if (matchMedia("(hover: hover)").matches) $("name-input").focus();
}
focusInput();

// 부적 카드에 쓰는 폰트를 미리 받아둠 → 첫 결과의 카드가 빨리 그려짐
document.fonts && Promise.all([
  document.fonts.load('900 190px "Noto Serif TC"', `${SITE.titleHanja}勅令急如律符點神託發行緣剋${TIERS.map((t) => t.hanja + t.fu).join("")}`),
  document.fonts.load('800 40px "Hahmlet"', "가나다"),
]).catch(() => {});
