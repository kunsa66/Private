# 이 저장소

- 사이트 두 개가 한 Cloudflare Worker("private")에 들어 있음. 주소: https://private.kunsa6667.workers.dev
  - `/` 폐미부 궁합소 (`public/index.html`, `app.js`, `engine.js`, `card.js`)
  - `/pair/` 태풍고 틀 생성기 (`public/pair/`)
- `main`에 푸시하면 1~2분 뒤 자동 배포됨.
- 사용자는 개발자가 아님. 항상 한국어로, 쉬운 말로 답하기.

## "A × B 써줘" = 태풍고 틀 생성기 썰 쓰기

사용자가 두 캐릭터 이름을 주면 페어 썰을 써서 `public/pair/stories.json`에 넣고 푸시한다.

### 1. 캐릭터 찾기
- `public/data.js`의 `CHARACTERS`에서 이름으로 찾기. 사용자가 성을 틀리게 말할 때가 있음 → 이름(뒤 두 글자)으로 찾고, 후보가 여럿이면 물어보기.
- `public/pair/roster.js`의 `PAIR_ROSTER`에 없는 사람이면 알려주고, 그래도 쓸지 물어보기.
- 참고할 것: `grade`(2026년 기준 1학년 17세, 2학년 18세), `gender`, `mbti`, `traits`, `values`, `keywords`, `oneLiner`, `relations`(둘 사이 작중 관계가 있으면 꼭 반영).
- MBTI는 궁예 값. 본인이 고친 값이 https://private.kunsa6667.workers.dev/api/mbti 에 있으면 그걸 우선 (못 가져오면 data.js 값).

### 2. 겹침 확인 (가장 중요)
- `public/pair/stories.json`을 전부 읽고, 기존 썰의 `hook`과 `parts`를 확인.
- 새 썰은 **만남 계기·장소, 썸 사건, 연애 에피소드, 헤어짐 이유**가 기존 썰과 겹치면 안 됨. 문장 패턴이나 표현 반복도 피하기.
- 여러 쌍을 한 번에 쓸 때는 그 쌍들끼리도 겹치지 않게.

### 3. 쓰는 규칙
- 배경: 태풍고(고등학교) 1·2학년 학교생활 (급식, 야자, 동아리, 체육대회, 수행평가, 기숙사, 축제, 방학 등).
- 두 사람의 키워드·한줄소개·성향을 구체적으로 써서, 이 둘만의 이야기가 되게.
- 말투: 짧은 썰체, 음슴체 ("~함", "~했음", "~임"). 담백하고 귀엽게.
- 헤어짐: 씁쓸하지만 너무 비극적이지 않게. 사망·폭력·성적 묘사 금지.
- 분량
  - `parts`: 각 60~95자 (공백 포함), 2~3문장 — 카드에 7줄까지만 들어감
  - `views`: 각 20~40자 — 이 사람이 상대를 보는 시선
  - `lines`: 각 8~20자 — 말풍선 대사 한마디
  - `name`: 페어명 2~6자 — 두 이름을 섞거나 관계를 상징하는 말
  - `tags`: 3개, `#`로 시작, 띄어쓰기 대신 `_`, 각 10자 이내

### 4. 형식
키는 두 id를 알파벳순으로 정렬해서 `|`로 이은 것. 기존 항목(`"eunchan|eunjae"`)과 똑같은 모양으로.

```json
"eunchan|eunjae": {
  "name": "은은",
  "tags": ["#동급생", "#가오vs의리", "#주머니에_흙"],
  "lines": { "eunjae": "대사", "eunchan": "대사" },
  "views": { "eunjae": "은재가 은찬을 보는 시선", "eunchan": "은찬이 은재를 보는 시선" },
  "parts": { "meet": "첫 만남", "some": "썸", "love": "연애", "end": "헤어짐" },
  "hook": "만남/썸/연애/이별 핵심 설정 한 줄 (겹침 확인용)",
  "at": "YYYY-MM-DD"
}
```

### 5. 저장하고 올리기
1. JSON이 깨지지 않았는지 확인: `node -e "JSON.parse(require('fs').readFileSync('public/pair/stories.json','utf8'))"`
2. `public/pair/stories.json`만 커밋. 메시지: `썰: 김은재 × 배은찬`
3. `main`에 푸시. main 푸시가 막히면 사용자에게 알리고 PR을 만들어서 머지하게 안내.
4. 사용자에게 페어명과 네 파트를 채팅으로 보여주고, "1~2분 뒤 사이트에서 '새 썰 확인'을 누르세요"라고 안내.

- "다시 써줘": 같은 키를 새 내용으로 바꾸기 (이전 내용·다른 썰과도 겹치지 않게).
- 썰 요청에는 다른 파일을 건드리지 않기.

## 하면 안 되는 것
- `/api/birthdays`, `/api/hours`, `/api/mbti`에 POST 금지 (친구들이 넣은 실제 데이터). 읽기(GET)만.
- `/api/sd`(SD 이미지)는 사용자가 사이트에서 직접 올림. 건드리지 않기.
- `wrangler.jsonc`의 `name`("private") 바꾸지 않기.
