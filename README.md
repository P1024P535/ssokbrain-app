# 쏙브레인 안드로이드 앱

게임 본체(`src/game.html`)를 안드로이드 앱으로 감싼 프로젝트입니다. 운영: 쏙컴퍼니 (대표 박상철).

## 구조

| 위치 | 내용 |
| --- | --- |
| `src/game.html` | 게임 전체 (문제, 화면, 코인, 아바타). 웹에서 그대로 열어도 동작 |
| `src/native.js` | 앱 안에서 광고(AdMob), 결제(구글 플레이), 뒤로 가기 버튼을 게임에 연결 |
| `src/config.js` | 광고 단위 ID, 상품 ID 설정 |
| `scripts/build.mjs` | `www/` 폴더 생성 (글꼴을 앱 안에 포함) |
| `android/` | 안드로이드 프로젝트 (Capacitor 8) |
| `.github/workflows/android.yml` | GitHub에 올리면 자동으로 앱 파일을 만드는 설정 |

## 앱 파일 받는 법

1. 이 저장소의 `main` 브랜치에 올리면 GitHub Actions가 자동으로 빌드합니다.
2. 저장소의 Releases > "테스트용 설치 파일"에서 `ssokbrain-test.apk`를 내려받습니다.
3. 안드로이드 폰에서 그 APK를 열어 설치합니다. (테스트용이라 "출처를 알 수 없는 앱" 허용이 필요합니다.)

## 출시 전에 바꿔야 하는 값

| 무엇 | 어디 | 지금 값 |
| --- | --- | --- |
| AdMob 앱 ID, 광고 단위 ID | `strings.xml`, `src/config.js` | 쏙컴퍼니 실제 ID (테스트 파일은 자동으로 테스트 광고, 출시 파일만 실제 광고) |
| 앱 고유 이름(패키지) | `capacitor.config.json`, `android/app/build.gradle` | `com.ssokcompany.ssokbrain` (출시 후 변경 불가) |
| 버전 | `android/app/build.gradle` 의 `versionCode`, `versionName` | 1, 1.0.0 (업데이트마다 `versionCode` +1) |

## 플레이 콘솔에 등록할 상품

| 상품 ID | 종류 | 내용 |
| --- | --- | --- |
| `coins_300` | 소모성 | 코인 300개 |
| `coins_1000` | 소모성 | 코인 1,000개 |
| `coins_3000` | 소모성 | 코인 3,000개 |
| `no_ads` | 비소모성 | 광고 제거 |
| `outfit_santa` | 비소모성 | 산타 세트 |
| `outfit_astro` | 비소모성 | 우주복 |

## 출시용 파일(AAB) 만들기

저장소 Settings > Secrets and variables > Actions 에 아래 네 값을 넣으면, 빌드할 때 `ssokbrain-release-aab`도 함께 만들어집니다.

- `SSOK_KEYSTORE_BASE64`: 서명 키 파일을 base64로 바꾼 값
- `SSOK_KEYSTORE_PASSWORD`, `SSOK_KEY_ALIAS`, `SSOK_KEY_PASSWORD`

서명 키는 한 번 정하면 계속 써야 하므로 안전한 곳에 따로 보관하세요.

## 아직 없는 것

- 서버: 실제 랭킹, 기록의 서버 저장, 사람끼리 하는 대전, 결제 영수증 검증. 지금은 기록과 코인이 기기에만 저장됩니다.
- iOS 빌드: 맥과 애플 개발자 계정이 필요합니다.
- 실제 기기 검증: 광고와 결제 연결 코드는 아직 실제 폰에서 돌려 보지 못했습니다.

## 게임 수정 후 반영

`src/game.html`을 새 파일로 바꾸고 `main`에 올리면 됩니다. 로컬에서 직접 하려면:

```
npm ci
npm run sync
cd android && ./gradlew assembleDebug
```
