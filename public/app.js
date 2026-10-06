const $ = (id) => document.getElementById(id);
const norm = (s) => s.replace(/\s+/g, "").toLowerCase();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const AGE = { 1: 17, 2: 18 };

/* 현장에서 입력한 생일 (프로필에 생일이 없는 사람). 이 기기에만 저장됨 */
const BDAY_KEY = "pemibu-bday";
const BIRTH_YEAR = { 1: 2010, 2: 2009 }; // 2026년 기준 1학년=2010년생, 2학년=2009년생
let savedBdays = {};
try { savedBdays = JSON.parse(localStorage.getItem(BDAY_KEY) || "{}"); } catch (e) { savedBdays = {}; }

function applyBirthday(c, birth) {
  c.birth = birth;
  c.birthUnknown = false;
  c.birthNote = "현장 입력";
  c.pillars = getPillars(birth);
}

CHARACTERS.forEach((c) => {
  if (c.birthUnknown && savedBdays[c.id]) applyBirthday(c, savedBdays[c.id]);
  else c.pillars = getPillars(c.birth);
});

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
      ? `<div class="chips">${list.map((c) => `<button type="button" class="chip${c.birthUnknown ? " nobday" : ""}" data-n="${esc(c.name)}"${c.birthUnknown ? ' title="생일 입력 필요"' : ""}>${avatar(c, "")}<span>${esc(c.name)}</span></button>`).join("")}</div>`
      : `<p class="empty">${n ? "해당하는 이름 없음" : "명단 없음"}</p>`;
  }
}
renderRoster();

/* 생일 입력칸: 학년 + 월 + 일 */
let pending = null; // 생일을 기다리는 사람
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
$("bday-m").onchange = () => { $("name-err").textContent = ""; fillDays(); };
$("bday-d").onchange = () => { $("name-err").textContent = ""; };

function openBday(c) {
  pending = c;
  $("name-input").value = c.name;
  $("bday-note").textContent = `${c.name}의 생일 정보가 없어요. 생일을 골라주세요`;
  $("bday-m").value = "";
  setBdayGrade(c.grade);
  $("bday").hidden = false;
}
function closeBday() {
  pending = null;
  $("bday").hidden = true;
}

// 고른 사람으로 진행. 생일이 없으면 생일칸부터 열고 멈춤
function choose(c) {
  if (!c.birthUnknown) { closeBday(); runLoading(c); return; }
  if (pending !== c) { openBday(c); renderRoster(); return; }
  const m = Number($("bday-m").value), d = Number($("bday-d").value);
  if (!m || !d) { $("name-err").textContent = "생일(월·일)을 골라주세요"; return; }
  const birth = `${BIRTH_YEAR[bdayGrade]}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  applyBirthday(c, birth);
  savedBdays[c.id] = birth;
  try { localStorage.setItem(BDAY_KEY, JSON.stringify(savedBdays)); } catch (e) { /* 저장 못 해도 이번 결과는 진행 */ }
  closeBday();
  renderRoster();
  runLoading(c);
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
  if (c && c.birthUnknown) { if (pending !== c) openBday(c); }
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
  const p = A.pillars, s = selfReading(A);
  const max = Math.max(...p.counts, 1);
  const date = A.birth.replace(/-/g, ".");
  return `<div class="panel"><div class="panel-in">
    <div class="who">
      ${avatar(A, "avatar")}
      <div>
        <div class="meta-top">${profileLine(A)}</div>
        <h2>${esc(A.name)}${A.hanjaName ? `<small>${esc(A.hanjaName)}</small>` : ""}</h2>
        <div class="one">${esc(A.oneLiner)}</div>
      </div>
    </div>
    <div class="section-title">사주 원국</div>
    <div class="pillars">${pillarCell("년주", p.year)}${pillarCell("월주", p.month)}${pillarCell("일주", p.day)}</div>
    <div class="meta">${date} · ${A.birthUnknown ? `<span class="warn">${esc(A.birthNote)}</span>` : esc(A.birthNote || "")}<br>${p.animal}띠 · ${esc(A.mbti)}</div>
    <div class="section-title">오행 분포</div>
    <div class="el-bars">${p.counts.map((c, e) => `<div class="el-bar">${c}<i style="height:${(c / max) * 64}px;background:${ELEMENT_COLORS[e]}"></i><b>${ELEMENTS_H[e]} ${ELEMENTS[e]}</b></div>`).join("")}</div>
    <div class="section-title">타고난 기운</div>
    <ul class="self-lines">
      <li><b>일간</b><span>${esc(s.dayMaster)}</span></li>
      <li><b>강한 기운</b><span>${esc(s.strong)}</span></li>
      <li><b>부족 기운</b><span>${s.lack.split(" / ").map(esc).join("<br>")}</span></li>
      <li><b>키워드</b><span class="tags">${A.keywords.map((k) => `<span>${esc(k)}</span>`).join("")}</span></li>
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
      <div class="partner">${esc(B.name)} · ${profileLine(B)} · ${pillarText(B.pillars.day)}일주 · ${B.pillars.animal}띠 · ${esc(B.mbti)}<br>${esc(B.oneLiner)}</div>
      <div class="section-title">사주로 보면</div>
      ${ptList(r.saju.pts)}
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
