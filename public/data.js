/* =========================================================
   캐릭터 명단 — 이 파일만 고치면 됩니다.
   ---------------------------------------------------------
   name      : 입력할 때 쓰는 이름 (공백 무시하고 매칭)
   grade     : 1 또는 2 (학년). 2026년 기준 1학년=2010년생, 2학년=2009년생
   birth     : "YYYY-MM-DD" 양력
   birthUnknown : true면 프로필에 생일이 없어서 임시로 넣은 날짜
   mbti      : 궁예 MBTI (프로필에 적혀 있으면 그대로)
   traits    : 1~5 점수
               energy  조용함 1 ↔ 5 텐션 MAX
               warmth  냉철 1 ↔ 5 다정
               order   즉흥 1 ↔ 5 계획/원칙
               serious 장난 1 ↔ 5 진지
   values    : 가치관 태그. 아래 단어 중에서 2~3개
               정의 질서 자유 혼돈 사랑 가족 우정 책임 복수 재미 지식 진실 성공 권력 평화 예술
   keywords  : 성격 키워드 (리딩 문구·화면에 사용)
   relations : (선택) 작중 관계 보정. { 상대id: { score: -10~10, text: "설명" } }
   emoji / color : 사진 없을 때 증명사진 자리에 들어감
   photo     : (선택) "photos/파일명.jpg" — 서버실행.bat으로 열어야 저장 가능
   ========================================================= */

window.SITE = {
  title: "폐미부 궁합소",
  titleHanja: "廢美部 宮合所",
  seal: "符",
  subtitle: "구관 귀신도 인정한 궁합 부적",
  footer: "폐미부 궁합소 · 2026",
};

window.CHARACTERS = [
  {
    id: "yuhyun",
    name: "유현",
    hanjaName: "柳賢",
    grade: 2, gender: "남",
    birth: "2009-01-02",
    birthNote: "프로필 기재 (01.02)",
    mbti: "ENTP",
    traits: { energy: 4, warmth: 3, order: 2, serious: 1 },
    values: ["재미", "성공", "자유"],
    keywords: ["말빨 만렙", "눈치 백단", "가짜 영안", "매점빵 복채", "구관 러버"],
    oneLiner: "영험한 척 부적 써주고 매점빵 받아먹는 가짜 당집 아들",
    emoji: "🔮", color: "#3B2A4A", photo: "photos/yuhyun.png",
  },
  {
    id: "jinoh",
    name: "김진오",
    grade: 1, gender: "남",
    birth: "2010-04-19",
    birthUnknown: true,
    birthNote: "생일 미기재 · 임시",
    mbti: "ISTP",
    traits: { energy: 1, warmth: 3, order: 1, serious: 2 },
    values: ["평화", "자유"],
    keywords: ["산은 산이요", "귀차니즘", "늘 비니", "장식용 책", "안 닮은 쌍둥이"],
    oneLiner: "산은 산이요 물은 물이로다, 만사 느긋한 비니남",
    emoji: "🧢", color: "#4A5A4A", photo: "photos/jinoh.png",
  },
  {
    id: "hansol",
    name: "문한솔",
    grade: 2, gender: "여",
    birth: "2009-02-18",
    birthNote: "프로필 기재 (2.18 물병자리)",
    mbti: "ISFJ",
    traits: { energy: 3, warmth: 4, order: 4, serious: 3 },
    values: ["우정", "가족", "책임"],
    keywords: ["생색형 다정", "경상도 사투리", "벌레 퇴치 담당", "얼빠", "장녀병"],
    oneLiner: "귀찮은 척 다 해주고 \"끝이가?\" 하며 반응 기다리는 해결사",
    emoji: "🧰", color: "#7A4A2A", photo: "photos/hansol.jpg",
  },
  {
    id: "bongchun",
    name: "곽봉춘",
    grade: 1, gender: "남",
    birth: "2010-02-17",
    birthNote: "프로필 기재 (02.17)",
    mbti: "ESTJ",
    traits: { energy: 3, warmth: 2, order: 5, serious: 4 },
    values: ["질서", "성공"],
    keywords: ["중증 결벽", "잔소리 장인", "걱정 인형", "허당 완벽주의", "꿈은 건물주"],
    oneLiner: "50만원짜리 이름 달고 건물주를 꿈꾸는 허당 결벽왕",
    emoji: "🧽", color: "#2A4A6A", photo: "photos/bongchun.png",
  },
  {
    id: "yujin",
    name: "기유진",
    grade: 2, gender: "남",
    birth: "2009-07-23",
    birthNote: "프로필 기재 (7.23 사자자리)",
    mbti: "ISFP",
    traits: { energy: 3, warmth: 3, order: 1, serious: 3 },
    values: ["예술", "자유"],
    keywords: ["나의 세상", "제멋대로", "뮤직 프로듀서 지망", "셀프 커트", "장르 잡식"],
    oneLiner: "자연에서 영감 찾으러 온 마이웨이 뮤지션 지망생",
    emoji: "🎧", color: "#5A3A2A", photo: "photos/yujin.png",
  },
  {
    id: "sari",
    name: "송사리",
    grade: 1, gender: "여",
    birth: "2010-11-02",
    birthNote: "프로필 기재 (11.02)",
    mbti: "INFP",
    traits: { energy: 2, warmth: 5, order: 3, serious: 4 },
    values: ["우정", "평화"],
    keywords: ["겁쟁이", "부끄럼쟁이", "귀신 보임 (착각)", "인형 기도", "부적 붙여줌"],
    oneLiner: "귀신 보인다고 믿는 겁쟁이, 그래도 친구 위해선 부적부터 붙여줌",
    emoji: "🐟", color: "#2A5A5A", photo: "photos/sari.png",
  },
];
