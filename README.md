# 폐미부 궁합소

캐릭터 이름을 고르면 사주·성향·MBTI로 최고/최악 궁합을 보여주고 부적 이미지를 만들어주는 사이트.

- 사이트: https://patient-haze-9493.kunsa6667.workers.dev
- GitHub `main`에 올라오면 Cloudflare가 `public/` 폴더를 자동으로 다시 배포함

## 파일

| 파일 | 내용 |
|---|---|
| `public/data.js` | 캐릭터 명단 (이름·학년·생일·MBTI·성향·사진). **보통 이것만 고치면 됨** |
| `public/photos/` | 두상 이미지 |
| `public/engine.js` | 사주 계산, 궁합 점수, 리딩 문구, 점수 구간별 부적(`TIERS`) |
| `public/card.js` | 부적 PNG 이미지 그리기 |
| `public/app.js` / `index.html` / `style.css` | 화면 |
| `wrangler.jsonc` | Cloudflare 배포 설정 |

## 내 PC에서 미리 보기

`서버실행.bat` 더블클릭 → http://localhost:8080
