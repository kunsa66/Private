/* 사주 계산 + 궁합 점수 + 리딩 문구 생성
   점수: 사주 40 + 성향/키워드 40 + MBTI 20 = 100 */

const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const STEMS_H = "甲乙丙丁戊己庚辛壬癸";
const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const BRANCHES_H = "子丑寅卯辰巳午未申酉戌亥";
const ANIMALS = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];
const ELEMENTS = ["목", "화", "토", "금", "수"];
const ELEMENTS_H = "木火土金水";
// 목만 팔레트 밖(오행 의미상 초록 계열), 나머지는 팔레트 색: 화=Pink 토=Olive 금=Mauve 수=Dark
const ELEMENT_COLORS = ["#7E9A80", "#F35A91", "#AA8F0A", "#BEA5AB", "#372E19"];
const BRANCH_EL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
const stemEl = (s) => Math.floor(s / 2);

// 절기 시작일 (근사값) → 월지
const JEOL = [[1, 6, 1], [2, 4, 2], [3, 6, 3], [4, 5, 4], [5, 6, 5], [6, 6, 6], [7, 7, 7], [8, 8, 8], [9, 8, 9], [10, 8, 10], [11, 7, 11], [12, 7, 0]];

// 태어난 시 (12시진). 한국 표준시 기준이라 30분씩 밀린 구간을 씀
const HOUR_SLOTS = [
  ["자시", "23:30~01:29"], ["축시", "01:30~03:29"], ["인시", "03:30~05:29"], ["묘시", "05:30~07:29"],
  ["진시", "07:30~09:29"], ["사시", "09:30~11:29"], ["오시", "11:30~13:29"], ["미시", "13:30~15:29"],
  ["신시", "15:30~17:29"], ["유시", "17:30~19:29"], ["술시", "19:30~21:29"], ["해시", "21:30~23:29"],
];
const hourIndex = (name) => HOUR_SLOTS.findIndex(([n]) => n === name);

// hour: "인시" 같은 시진 이름 (없으면 시주 없이 6글자)
function getPillars(birth, hour) {
  const [y, m, d] = birth.split("-").map(Number);
  const sy = m < 2 || (m === 2 && d < 4) ? y - 1 : y; // 입춘 전이면 전년도
  const yi = (((sy - 4) % 60) + 60) % 60;
  let mb = 0;
  for (const [jm, jd, b] of JEOL) if (m > jm || (m === jm && d >= jd)) mb = b;
  const k = (mb - 2 + 12) % 12;
  const ms = (((yi % 10) % 5) * 2 + 2 + k) % 10;
  const days = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1900, 0, 1)) / 86400000);
  const di = (((10 + days) % 60) + 60) % 60; // 1900-01-01 = 갑술
  const p = {
    year: { s: yi % 10, b: yi % 12 },
    month: { s: ms, b: mb },
    day: { s: di % 10, b: di % 12 },
  };
  const hb = hour ? hourIndex(hour) : -1;
  if (hb >= 0) {
    // 시간(時干): 일간에 따라 자시의 천간이 정해짐 (갑·기일 → 갑자시 …)
    p.hour = { s: (((p.day.s % 5) * 2) + hb) % 10, b: hb };
  }
  const counts = [0, 0, 0, 0, 0];
  for (const key of ["year", "month", "day", "hour"]) {
    if (!p[key]) continue;
    counts[stemEl(p[key].s)]++;
    counts[BRANCH_EL[p[key].b]]++;
  }
  p.counts = counts;
  p.animal = ANIMALS[p.year.b];
  p.dayEl = stemEl(p.day.s);
  return p;
}

const pillarText = (x) => `${STEMS[x.s]}${BRANCHES[x.b]}`;
const pillarHanja = (x) => `${STEMS_H[x.s]}${BRANCHES_H[x.b]}`;
const elName = (e) => `${ELEMENTS[e]}(${ELEMENTS_H[e]})`;

const DAY_MASTER = [
  "큰 나무. 곧게 뻗는 리더 재질, 근데 고집도 국가대표급.",
  "덩굴과 꽃. 유연하고 생존력 만렙, 웃으면서 결국 다 얻어냄.",
  "태양. 어딜 가나 주인공, 숨길 수 없는 존재감.",
  "촛불. 다정하고 섬세한데 속은 누구보다 뜨거움.",
  "큰 산. 듬직하고 믿음직, 대신 한번 안 움직이면 끝까지 안 움직임.",
  "논밭. 포용력 만렙, 주변 사람 다 챙기는 엄마 재질.",
  "바위와 칼. 의리와 결단의 아이콘, 직진 말곤 모름.",
  "보석. 예민하고 완벽주의, 자기애가 곧 매력.",
  "바다. 스케일 크고 자유로운 영혼, 속을 알 수가 없음.",
  "빗물. 감수성 풍부하고 촉이 무당급.",
];
const LACK_TEXT = ["추진력·성장 욕구", "열정·표현력", "안정감·끈기", "결단력·마무리", "유연함·휴식"];
const GEN_TEXT = ["나무가 불을 키우듯", "불이 타고 남은 재가 흙이 되듯", "흙 속에서 보석이 나오듯", "바위에서 샘물이 솟듯", "물이 나무를 키우듯"];
const CTRL_TEXT = ["나무뿌리가 흙을 파고들듯", "불이 쇠를 녹이듯", "흙이 물길을 막듯", "도끼가 나무를 베듯", "물이 불을 끄듯"];
const GAN_HAP = { "0-5": ["갑기합", 2], "1-6": ["을경합", 3], "2-7": ["병신합", 4], "3-8": ["정임합", 0], "4-9": ["무계합", 1] };
const YUK_HAP = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
const SAM_HAP = [[[8, 0, 4], 4], [[11, 3, 7], 0], [[2, 6, 10], 1], [[5, 9, 1], 3]];

const isYukHap = (a, b) => YUK_HAP.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
const samHapGroup = (a, b) => (a !== b ? SAM_HAP.find(([g]) => g.includes(a) && g.includes(b)) : null);
const isChung = (a, b) => Math.abs(a - b) === 6;
// 원진(怨嗔): 자미·축오·인유·묘신·진해·사술 — 이유 없이 서로 거슬리는 관계
const WONJIN = [[0, 7], [1, 6], [2, 9], [3, 8], [4, 11], [5, 10]];
const isWonjin = (a, b) => WONJIN.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

/* 십성(十星): 상대 일간이 나에게 어떤 의미인지 */
function tenGod(me, other) {
  const em = stemEl(me), eo = stemEl(other), same = me % 2 === other % 2;
  if (em === eo) return same ? "비견" : "겁재";
  if ((em + 1) % 5 === eo) return same ? "식신" : "상관";
  if ((em + 2) % 5 === eo) return same ? "편재" : "정재";
  if ((eo + 2) % 5 === em) return same ? "편관" : "정관";
  return same ? "편인" : "정인";
}
// [한자, 점수, 짧은 이유, 풀이] — 정관(여)·정재(남)는 전통적으로 배우자를 뜻하는 별
const TEN_GOD = {
  정관: (A, B) => A.gender === "여"
    ? ["正官", 4, "정관: 딱 배우자 자리", `${A.name}에게 ${josa(B.name, "은/는")} 정관(正官). 전통 사주에서 여자에게 정관은 '남편 자리'에 앉는 별이라, 딱 배우자감으로 읽히는 사람이에요.`]
    : ["正官", 3, "정관: 나를 잡아주는 사람", `${A.name}에게 ${josa(B.name, "은/는")} 정관(正官). 나를 바르게 잡아주는 사람이라, 같이 있으면 ${josa(A.name, "이/가")} 철드는 사이예요.`],
  정재: (A, B) => A.gender === "남"
    ? ["正財", 4, "정재: 딱 배우자 자리", `${A.name}에게 ${josa(B.name, "은/는")} 정재(正財). 전통 사주에서 남자에게 정재는 '아내 자리'에 앉는 별이라, 딱 배우자감으로 읽히는 사람이에요.`]
    : ["正財", 3, "정재: 아끼게 되는 사람", `${A.name}에게 ${josa(B.name, "은/는")} 정재(正財). 내가 아끼고 챙기게 되는 사람. 꾸준하고 안정적인 인연이에요.`],
  편관: (A, B) => ["偏官", -2, "편관: 휘어잡는 기운", `${A.name}에게 ${josa(B.name, "은/는")} 편관(偏官), 일명 칠살. 나를 강하게 휘어잡는 기운이라 끌리긴 하는데 같이 있으면 피곤할 수 있어요.`],
  편재: (A, B) => ["偏財", 1, "편재: 같이 놀 때 최고", `${A.name}에게 ${josa(B.name, "은/는")} 편재(偏財). 자유로운 인연이라 같이 놀 땐 최고, 매일 붙어 있긴 버거울 수 있어요.`],
  정인: (A, B) => ["正印", 3, "정인: 나를 품어주는 사람", `${A.name}에게 ${josa(B.name, "은/는")} 정인(正印). 나를 품어주는 사람이라, 옆에 있으면 엄마 품 같은 안정감이 들어요.`],
  편인: (A, B) => ["偏印", -1, "편인: 생각이 많아지는 사이", `${A.name}에게 ${josa(B.name, "은/는")} 편인(偏印). 신기하게 끌리는데, 같이 있으면 괜히 생각이 많아지는 사람이에요.`],
  식신: (A, B) => ["食神", 2, "식신: 같이 있으면 편한 사람", `${A.name}에게 ${josa(B.name, "은/는")} 식신(食神). 내가 편하게 웃게 되는 사람. 같이 먹고 노는 게 제일 행복한 사이예요.`],
  상관: (A, B) => ["傷官", -2, "상관: 장난이 선 넘기 쉬움", `${A.name}에게 ${josa(B.name, "은/는")} 상관(傷官). 이 사람 앞에선 말빨이 세져서, 장난이 선을 넘기 쉬워요.`],
  비견: (A, B) => ["比肩", 1, "비견: 어깨 나란히 하는 친구", `${A.name}에게 ${josa(B.name, "은/는")} 비견(比肩). 어깨 나란히 하는 친구 같은 사이예요.`],
  겁재: (A, B) => ["劫財", -2, "겁재: 은근한 라이벌", `${A.name}에게 ${josa(B.name, "은/는")} 겁재(劫財). 은근히 경쟁하게 되는 사이라, 같은 걸 두고 신경전이 붙기 쉬워요.`],
};
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const pick = (arr, seed) => arr[seed % arr.length];
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
// 받침 유무에 따른 조사
const suffix = (word, pair) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const has = code >= 0 && code <= 11171 && code % 28 !== 0;
  const [a, b] = pair.split("/");
  return has ? a : b;
};
const josa = (word, pair) => word + suffix(word, pair);
const stemName = (s) => `${STEMS[s]}(${STEMS_H[s]})`;

/* ---------- 사주 (40) ---------- */
function scoreSaju(A, B) {
  const pa = A.pillars, pb = B.pillars;
  const pts = [];
  const add = (delta, short, text) => pts.push({ delta, short, text });
  const sa = pa.day.s, sb = pb.day.s, ea = pa.dayEl, eb = pb.dayEl;

  const hap = GAN_HAP[`${Math.min(sa, sb)}-${Math.max(sa, sb)}`];
  if (hap) {
    add(10, "천간합 자석 궁합",
      `${A.name}의 일간 ${stemName(sa)}, ${B.name}의 일간 ${stemName(sb)}${suffix(STEMS[sb], "이/가")} 만나 ${hap[0]}! 천간합은 사주에서 '보자마자 끌리는' 자석 같은 결합이에요. 둘이 합쳐지면 ${elName(hap[1])}${suffix(ELEMENTS[hap[1]], "이라는/라는")} 새로운 기운까지 만들어냄.`);
  } else if ((ea + 1) % 5 === eb || (eb + 1) % 5 === ea) {
    const [g, t] = (ea + 1) % 5 === eb ? [A, B] : [B, A];
    const ge = g.pillars.dayEl, te = t.pillars.dayEl;
    add(6, "서로 살려주는 상생",
      `${josa(g.name, "의/의")} ${elName(ge)} 기운이 ${josa(t.name, "의/의")} ${elName(te)} 기운을 살려주는 상생 관계. ${GEN_TEXT[ge]} ${josa(g.name, "이/가")} 밀어주면 ${josa(t.name, "이/가")} 빛나는 구조예요.`);
  } else if (ea === eb) {
    add(3, "같은 기운 찐친",
      `둘 다 ${elName(ea)} 일간. 같은 기운끼리라 말 안 해도 통하는 찐친 같은 사이. 대신 경쟁심도 같이 붙을 수 있음.`);
  } else {
    const [c, t] = (ea + 2) % 5 === eb ? [A, B] : [B, A];
    const ce = c.pillars.dayEl;
    add(-6, "기운이 서로 눌러요",
      `${CTRL_TEXT[ce]} ${josa(c.name, "이/가")} ${josa(t.name, "을/를")} 누르는 상극 관계. ${t.name} 입장에선 같이 있으면 묘하게 숨이 막힐 수 있어요.`);
  }

  // 십성: 서로에게 어떤 별인지 (양쪽 다 봄, 합계 -4 ~ +6)
  let tg = 0;
  for (const [X, Y] of [[A, B], [B, A]]) {
    const [, d, short, text] = TEN_GOD[tenGod(X.pillars.day.s, Y.pillars.day.s)](X, Y);
    const dd = clamp(d, -4 - tg, 6 - tg);
    tg += dd;
    add(dd, short, text);
  }

  const da = pa.day.b, db = pb.day.b;
  const dPair = `${BRANCHES[da]}${BRANCHES_H[da]}-${BRANCHES[db]}${BRANCHES_H[db]}`;
  if (isYukHap(da, db)) {
    add(6, "배우자 자리 육합",
      `일지(사주에서 '내 짝의 자리')가 ${dPair} 육합! 여기가 합이면 같이 있을 때 편안함이 남다름. 말 안 해도 손발이 맞는 타입.`);
  } else if (samHapGroup(da, db)) {
    const g = samHapGroup(da, db);
    add(4, "삼합 팀플 궁합",
      `일지가 ${dPair}로 ${elName(g[1])} 삼합 기운에 묶여요. 공동 목표가 생기면 팀플 최강 조합.`);
  } else if (isChung(da, db)) {
    add(-7, "배우자 자리 충돌",
      `일지 ${dPair} 충! 배우자 자리끼리 정면충돌이라 같이 있으면 사소한 걸로 자주 부딪혀요.`);
  } else if (isWonjin(da, db)) {
    add(-5, "배우자 자리 원진살",
      `둘이 일지 ${dPair} 원진살이 있어요… 원진은 '이유 없이 서로 거슬리는' 살이라, 잘 지내다가도 괜히 서운해지는 사이예요.`);
  }

  const ya = pa.year.b, yb = pb.year.b;
  const zodiac = `${ANIMALS[ya]}띠와 ${ANIMALS[yb]}띠`;
  if (samHapGroup(ya, yb) || isYukHap(ya, yb)) {
    add(3, "띠 궁합도 굿", `띠로 봐도 ${zodiac}는 합이 드는 사이. 첫인상부터 호감.`);
  } else if (isChung(ya, yb)) {
    add(-3, "띠끼리 충", `띠로 보면 ${zodiac}는 충. 첫 만남부터 뭔가 삐걱일 수 있어요.`);
  } else if (isWonjin(ya, yb)) {
    add(-3, "띠 원진살", `띠로 보면 ${zodiac}는 원진 관계. 이유 없이 서로 신경 쓰이는 띠 궁합이에요.`);
  }

  // 시지(자녀·말년 자리): 둘 다 태어난 시를 알 때만
  if (pa.hour && pb.hour) {
    const ha = pa.hour.b, hb = pb.hour.b;
    const hPair = `${BRANCHES[ha]}${BRANCHES_H[ha]}-${BRANCHES[hb]}${BRANCHES_H[hb]}`;
    if (isYukHap(ha, hb)) add(3, "시지 육합", `태어난 시끼리 ${hPair} 육합. 시지는 말년 자리라, 오래 볼수록 더 잘 맞는 사이예요.`);
    else if (samHapGroup(ha, hb)) add(2, "시지 삼합", `태어난 시끼리 ${hPair} 삼합. 나이 들어서도 같은 방향을 보는 사이예요.`);
    else if (isChung(ha, hb)) add(-3, "시지 충", `태어난 시끼리 ${hPair} 충. 시간이 갈수록 생활 리듬이 부딪힐 수 있어요.`);
    else if (isWonjin(ha, hb)) add(-2, "시지 원진", `태어난 시끼리 ${hPair} 원진. 오래 붙어 있으면 사소한 습관이 거슬리기 쉬워요.`);
  }

  let fill = 0;
  for (const [x, y] of [[A, B], [B, A]]) {
    for (let e = 0; e < 5; e++) {
      if (x.pillars.counts[e] === 0 && y.pillars.counts[e] >= 2 && fill < 6) {
        fill += 3;
        add(3, `${josa(y.name, "이/가")} ${ELEMENTS[e]} 기운 보충`,
          `${josa(x.name, "에게/에게")} 없는 ${elName(e)} 기운을 ${josa(y.name, "이/가")} ${y.pillars.counts[e]}개나 가지고 있어요. ${josa(LACK_TEXT[e], "을/를")} 채워주는 보약 같은 존재.`);
      }
    }
  }
  for (let e = 0; e < 5; e++) {
    if (pa.counts[e] === 0 && pb.counts[e] === 0) {
      add(-2, `둘 다 ${ELEMENTS[e]}(${ELEMENTS_H[e]}) 기운 없음`,
        `둘 다 ${elName(e)} 기운이 하나도 없어요. ${josa(LACK_TEXT[e], "이/가")} 같이 부족해서 위기 때 같이 무너질 수도.`);
    }
  }

  const score = clamp(20 + pts.reduce((s, p) => s + p.delta, 0), 0, 40);
  return { score, pts };
}

/* ---------- 성향·키워드 (40) ---------- */
const OPPOSE = [["혼돈", "질서"], ["혼돈", "정의"], ["혼돈", "평화"], ["자유", "질서"], ["사랑", "복수"], ["권력", "평화"], ["재미", "책임"]];

function scoreTraits(A, B) {
  const pts = [];
  const add = (delta, short, text) => pts.push({ delta, short, text });
  const ta = A.traits, tb = B.traits;

  const shared = A.values.filter((v) => B.values.includes(v));
  if (shared.length) {
    const vs = shared.slice(0, 2).map((v) => `'${v}'`).join("·");
    add(7 * Math.min(2, shared.length), `둘 다 ${vs}에 진심`,
      `둘 다 ${vs}에 진심인 타입. 가치관이 같으면 싸워도 결국 같은 편이에요.`);
  }

  let opp = 0;
  for (const [x, y] of OPPOSE) {
    for (const [P, Q] of [[A, B], [B, A]]) {
      if (opp < 2 && P.values.includes(x) && Q.values.includes(y) && !Q.values.includes(x) && !P.values.includes(y)) {
        opp++;
        add(-7, `'${x}' vs '${y}'`,
          `${josa(P.name, "은/는")} '${x}', ${josa(Q.name, "은/는")} '${y}'. 가치관이 정반대라 근본적으로 이해 불가 구역.`);
      }
    }
  }

  const avgW = (ta.warmth + tb.warmth) / 2;
  const wPts = Math.round(((avgW - 1) / 4) * 8);
  if (Math.abs(ta.warmth - tb.warmth) >= 3) {
    const [w, c] = ta.warmth > tb.warmth ? [A, B] : [B, A];
    add(wPts, "온도 차이 주의", `${josa(w.name, "은/는")} 따뜻, ${josa(c.name, "은/는")} 쿨. 한쪽만 애쓰는 느낌 들 수 있어요.`);
  } else if (avgW >= 4) {
    add(wPts, "둘 다 정 많은 타입", "둘 다 정 많은 타입이라 서로 챙기느라 바쁨. 기념일 절대 안 까먹는 조합.");
  } else if (avgW <= 2) {
    add(wPts, "둘 다 차도남녀", "둘 다 차가운 편이라 누가 먼저 연락할지 기싸움 예약.");
  } else {
    add(wPts, "", "");
  }

  const eDiff = Math.abs(ta.energy - tb.energy);
  if (eDiff === 1 || eDiff === 2) {
    add(6, "텐션 밸런스 굿", "텐션 밸런스가 딱 좋아요. 한 명이 끌고 한 명이 맞춰주는 구조.");
  } else if (eDiff === 0) {
    if (ta.energy >= 4) add(4, "둘 다 텐션 MAX", "둘 다 텐션 MAX. 같이 있으면 동네가 시끄러워짐.");
    else if (ta.energy <= 2) add(4, "둘 다 집콕 재질", "둘 다 집콕 재질이라 조용히 각자 할 일 하는 평화로운 사이.");
    else add(4, "", "");
  } else if (eDiff === 3) {
    add(2, "텐션 차이 있음", "텐션 차이가 꽤 있어요. 한 명은 2차 가자, 한 명은 집 가자.");
  } else {
    add(0, "텐션 극과 극", "텐션이 극과 극. 한 명은 파티 중, 한 명은 이미 귀가함.");
  }

  const oDiff = Math.abs(ta.order - tb.order);
  const oPts = Math.round(((4 - oDiff) / 4) * 6);
  if (oDiff >= 3) {
    const [p, q] = ta.order > tb.order ? [A, B] : [B, A];
    add(oPts, "계획파 vs 즉흥파", `${josa(p.name, "은/는")} 계획파, ${josa(q.name, "은/는")} 즉흥파. 같이 여행 가면 100% 싸움.`);
  } else if (oDiff === 0) {
    add(oPts, "생활 패턴 일치", "생활 패턴이 똑같아서 같이 살아도 될 수준.");
  } else add(oPts, "", "");

  const sDiff = Math.abs(ta.serious - tb.serious);
  const sPts = Math.round(((4 - sDiff) / 4) * 6);
  if (sDiff >= 3) {
    add(sPts, "대화 코드 불일치", "한 명은 진지, 한 명은 장난. 대화 코드가 안 맞아서 '지금 그게 웃겨?' 나옴.");
  } else if (sDiff <= 1 && ta.serious >= 4 && tb.serious >= 4) {
    add(sPts, "둘 다 진지 모드", "둘 다 진지해서 대화가 자꾸 토론이 됨 (좋은 의미로).");
  } else if (sDiff <= 1 && ta.serious <= 2 && tb.serious <= 2) {
    add(sPts, "드립력 만렙 듀오", "둘 다 드립력 만렙이라 대화가 개그 콘서트.");
  } else add(sPts, "", "");

  for (const [P, Q] of [[A, B], [B, A]]) {
    const rel = P.relations && P.relations[Q.id];
    if (rel) add(rel.score, "작중 관계 보정", rel.text);
  }

  const score = clamp(pts.reduce((s, p) => s + p.delta, 0), 0, 40);
  return { score, pts: pts.filter((p) => p.text) };
}

/* ---------- MBTI (20) ---------- */
const MBTI_GOLD = {
  INFP: ["ENFJ", "ENTJ"], ENFP: ["INFJ", "INTJ"], INFJ: ["ENFP", "ENTP"], INTJ: ["ENFP", "ENTP"],
  ENFJ: ["INFP", "ISFP"], ENTJ: ["INFP", "INTP"], INTP: ["ENTJ", "ESTJ"], ENTP: ["INFJ", "INTJ"],
  ISFP: ["ENFJ", "ESFJ", "ESTJ"], ESFP: ["ISFJ", "ISTJ"], ISTP: ["ESFJ", "ESTJ"], ESTP: ["ISFJ", "ISTJ"],
  ISFJ: ["ESFP", "ESTP"], ESFJ: ["ISFP", "ISTP"], ISTJ: ["ESFP", "ESTP"], ESTJ: ["INTP", "ISFP", "ISTP"],
};

function scoreMbti(A, B) {
  const a = A.mbti.toUpperCase(), b = B.mbti.toUpperCase();
  const pts = [];
  const add = (delta, short, text) => pts.push({ delta, short, text });
  let s = 0;
  if ((MBTI_GOLD[a] || []).includes(b) || (MBTI_GOLD[b] || []).includes(a)) {
    s += 4;
    add(4, "MBTI 천생연분 칸", `${a} × ${b}는 MBTI 궁합표에서 '천생연분' 칸. 과몰입해도 됩니다.`);
  }
  if (a[0] !== b[0]) { s += 4; add(0, "", "E가 끌고 I가 따라가는 클래식 조합."); }
  else { s += 2; add(0, "", a[0] === "E" ? "둘 다 E라 약속 잡는 속도가 빛의 속도." : "둘 다 I라 약속 취소되면 둘 다 몰래 기뻐함."); }
  if (a[1] === b[1]) { s += 5; add(0, "", a[1] === "N" ? "둘 다 N이라 '좀비 사태 오면 어떡함?' 같은 망상 대화 가능." : "둘 다 S라 현실 얘기로 착착 통함."); }
  else { s += 1; add(-2, "S·N 대화 단절", "S와 N 조합. 대화하다 보면 '그게 왜 궁금해?'가 나올 확률 높음."); }
  if (a[2] !== b[2]) { s += 4; add(0, "", "T와 F 조합. 서로 없는 걸 배우는 관계 (가끔 '너 T야?' 시전)."); }
  else { s += 2; add(0, "", a[2] === "T" ? "둘 다 T라 팩폭 주고받아도 아무도 안 상처받음." : "둘 다 F라 공감 대잔치, 같이 울어줌."); }
  if (a[3] !== b[3]) { s += 3; add(0, "", "J와 P, 계획표 짜는 사람과 그걸 무시하는 사람."); }
  else { s += 2; add(0, "", a[3] === "J" ? "둘 다 J라 엑셀로 데이트 코스 공유함." : "둘 다 P라 약속 장소는 당일에 정함."); }
  return { score: clamp(s, 0, 20), pts };
}

/* ---------- 종합 ---------- */
// 둘 다 생일이 있으면 사주 40 + 성향 40 + MBTI 20.
// 한 명이라도 생일이 없으면 사주를 지어내지 않고 성향 70 + MBTI 30으로 환산.
function compat(A, B) {
  const traits = scoreTraits(A, B);
  const mbti = scoreMbti(A, B);
  if (!A.pillars || !B.pillars) {
    return { partner: B, saju: null, traits, mbti, total: Math.round(traits.score * (70 / 40) + mbti.score * (30 / 20)) };
  }
  const saju = scoreSaju(A, B);
  return { partner: B, saju, traits, mbti, total: Math.round(saju.score + traits.score + mbti.score) };
}

// 활동 없는 사람(inactive)은 본인 궁합은 볼 수 있지만, 다른 사람의 상대 후보로는 안 나옴
function findMatches(A, list) {
  const results = list.filter((c) => c.id !== A.id && !c.inactive).map((B) => compat(A, B));
  results.sort((x, y) => y.total - x.total || x.partner.id.localeCompare(y.partner.id));
  return { best: results[0], worst: results[results.length - 1], all: results };
}

// 점수 구간별 부적 + 무당 멘트. 최고/최악 상관없이 점수만으로 정해짐
// open: 리딩 첫 멘트, close: 마무리 멘트 (조합마다 하나씩 고정으로 골라짐)
const TIERS = [
  { min: 90, hanja: "天生緣分", ko: "천생연분", fu: "合婚符", fuKo: "합혼부",
    open: ["어머어머… 이건 신령님이 직접 엮어준 조합인데?", "와 소름. 이 둘은 전생에 무조건 아는 사이였음.", "부적 쓰다가 손 떨렸잖아요. 이 조합 뭐야…"],
    close: ["이 인연 놓치면 3대가 후회함. 부적은 지갑에 꼭 넣고 다니세요.", "오늘부터 이 사람 이름 들리면 귀 쫑긋 하세요. 신호 온 거예요."] },
  { min: 80, hanja: "百年佳約", ko: "백년가약", fu: "愛情符", fuKo: "애정부",
    open: ["이거 찐이에요. 신령님이 지금 박수 치고 계심.", "오래 볼수록 더 좋아지는 조합. 백년가약 각이에요."],
    close: ["싸워도 결국 화해하는 사이. 먼저 사과하는 쪽이 이겨요.", "지금 이 인연, 아껴 쓰세요. 오래 갑니다."] },
  { min: 70, hanja: "琴瑟相和", ko: "금슬상화", fu: "和合符", fuKo: "화합부",
    open: ["합이 잘 맞아요. 같이 있으면 둘 다 편해지는 사이.", "서로 부족한 데를 딱딱 채워주는 조합이에요."],
    close: ["사소한 건 맞춰주고, 큰 건 같이 정하면 만사형통.", "부적은 둘이 하나씩 나눠 가지세요. 효과 두 배."] },
  { min: 60, hanja: "吉緣相逢", ko: "길연상봉", fu: "因緣符", fuKo: "인연부",
    open: ["좋은 인연은 맞아요. 다만 조금 더 알아가야 하는 사이.", "첫인상보다 두 번째 만남이 더 좋은 타입이에요."],
    close: ["먼저 말 걸면 반은 성공. 나머지 반은 꾸준함.", "천천히 친해질수록 단단해지는 인연이에요."] },
  { min: 50, hanja: "無難平安", ko: "무난평안", fu: "平安符", fuKo: "평안부",
    open: ["엄청 끌리는 건 아닌데, 같이 있으면 탈은 없는 사이예요.", "불꽃은 없지만 평화는 있어요. 무난함도 복이에요."],
    close: ["큰 기대보다 편한 사이로 지내면 딱 좋아요.", "가끔 안부 묻는 사이로 오래 가요."] },
  { min: 40, hanja: "相剋注意", ko: "상극주의", fu: "和解符", fuKo: "화해부",
    open: ["잠깐만… 신령님이 고개를 갸웃하시는데요?", "기운끼리 살짝 부딪혀요. 말 한마디에 오해가 생기기 쉬운 사이."],
    close: ["말투만 조심하면 생각보다 괜찮아요. 서운한 건 바로 말하기.", "가까이보단 적당한 거리에서 오래 가는 사이예요."] },
  { min: 30, hanja: "怨嗔注意", ko: "원진주의", fu: "解怨符", fuKo: "해원부",
    open: ["이 조합은… 부적 하나로는 안 될 것 같아요.", "어우, 기운끼리 서로 할퀴고 있어요."],
    close: ["굳이 엮여야 한다면 단톡방까지만. 갠톡 금지.", "같이 있을 땐 둘 다 한 템포 쉬고 말하기. 부적은 필수."] },
  { min: 0, hanja: "厄運退散", ko: "액운퇴산", fu: "防厄符", fuKo: "방액부",
    open: ["같은 방에 두면 안 되는 조합, 축하드립니다…", "이거는 부적이 한 장 가지곤 안 되겠는데요...?"],
    close: ["마주치면 일단 웃으면서 지나가세요. 그게 최선입니다.", "이 부적 붙이면 액운 50% 감소 (신령님 피셜)."] },
];

// 최고인데 점수가 낮거나, 최악인데 점수가 높을 때 앞에 붙이는 한 줄
function contextLine(kind, total) {
  if (kind === "best" && total < 50) return "솔직히 다 고만고만한데, 이 중에선 이 사람이 제일 나아요.";
  if (kind === "best" && total < 60) return "이 명단 안에서는 제일 잘 맞는 상대예요.";
  if (kind === "worst" && total >= 60) return "다 괜찮은 편인데, 굳이 고르자면 이 사람이 제일 덜 맞아요.";
  if (kind === "worst" && total >= 50) return "최악이라기엔 무난한데, 이 중에선 제일 덜 맞아요.";
  return "";
}
const tierOf = (total) => TIERS.find((t) => total >= t.min);

function shortReason(kind, r) {
  const all = [...(r.saju ? r.saju.pts : []), ...r.traits.pts, ...r.mbti.pts].filter((p) => p.short);
  if (kind === "best") {
    const top = all.filter((p) => p.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 2);
    return top.length ? top.map((p) => p.short).join(" + ") : "기운이 무난하게 잘 섞이는 조합";
  }
  const bad = all.filter((p) => p.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 2);
  return bad.length ? bad.map((p) => p.short).join(" + ") : "딱히 싸울 이유도, 친해질 이유도 없음";
}

function reading(kind, A, r) {
  const seed = hash(A.id + r.partner.id);
  const tier = tierOf(r.total);
  const ctx = contextLine(kind, r.total);
  return {
    open: (ctx ? ctx + " " : "") + pick(tier.open, seed),
    close: pick(tier.close, seed >>> 3),
    tier,
    grade: tier.ko,
    serial: String(hash(A.id + r.partner.id + kind) % 10000).padStart(4, "0"),
    short: shortReason(kind, r),
  };
}

function selfReading(A) {
  const p = A.pillars;
  const max = Math.max(...p.counts);
  const strong = p.counts.map((c, i) => (c === max ? i : -1)).filter((i) => i >= 0);
  const lack = p.counts.map((c, i) => (c === 0 ? i : -1)).filter((i) => i >= 0);
  return {
    dayMaster: `${STEMS[p.day.s]}${ELEMENTS[p.dayEl]}(${STEMS_H[p.day.s]}${ELEMENTS_H[p.dayEl]}) 일간 · ${DAY_MASTER[p.day.s]}`,
    strong: strong.map((e) => elName(e)).join(", "),
    lack: lack.length ? lack.map((e) => `${elName(e)} → ${LACK_TEXT[e]} 충전 필요`).join(" / ") : "없음. 오행 골고루 갖춘 육각형 인간.",
  };
}
