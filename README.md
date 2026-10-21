# 폐미부 궁합소

캐릭터 이름을 고르면 사주·성향·MBTI로 최고/최악 궁합을 보여주고 부적 이미지를 만들어주는 사이트.

- 사이트: https://private.kunsa6667.workers.dev
- GitHub `main`에 올라오면 Cloudflare가 `public/` 폴더를 자동으로 다시 배포함

## 파일

| 파일 | 내용 |
|---|---|
| `public/data.js` | 캐릭터 명단 (이름·학년·생일·MBTI·성향·사진). **보통 이것만 고치면 됨** |
| `public/photos/` | 두상 이미지 |
| `public/engine.js` | 사주 계산, 궁합 점수, 리딩 문구, 점수 구간별 부적(`TIERS`) |
| `public/card.js` | 부적 PNG 이미지 그리기 |
| `public/app.js` / `index.html` / `style.css` | 화면 |
| `src/worker.js` | `/api/birthdays`: 친구들이 입력한 생일을 Cloudflare KV(pemibu-birthdays)에 저장·공유. 처음 입력된 값만 저장 |
| `wrangler.jsonc` | Cloudflare 배포 설정 (프로젝트 이름 `private`, KV 연결) |

생일 우선순위: `data.js`에 적힌 생일 > 친구가 입력한 생일 > 없음(사주 빼고 성향 70 + MBTI 30)

## 내 PC에서 미리 보기

`서버실행.bat` 더블클릭 → http://localhost:8080

## 태풍고 틀 생성기 (`/pair/`)

주소: https://private.kunsa6667.workers.dev/pair/

1. 이름 두 개 고르기 (명단은 `public/pair/roster.js`)
2. SD 이미지 올리기: 작은 SD / 길쭉한 SD. 흰 배경은 자동으로 지우고 여백을 잘라서 저장 (Cloudflare KV, `/api/sd`). 한 번 올리면 다음부터는 자동으로 나옴
3. 썰: 폰 Claude 앱 → Code 탭 → `kunsa66/Private` 세션에서 "A × B 써줘" → Claude가 `public/pair/stories.json`에 넣고 푸시 (규칙은 `CLAUDE.md`)
4. 사이트에서 "새 썰 확인" → 미리보기 → PNG 저장 (2000×1560)

- 틀 디자인: `public/pair/frame.js`
- 화면: `public/pair/index.html`, `pair.js`, `pair.css`
