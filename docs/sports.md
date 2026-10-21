# 실제 야구 라이브

## 구현

메뉴 마지막의 **스포츠**(`/sports`)에서 실제 YouTube 라이브 후보를 검색합니다. MLB 일정·예시 경기·임의 시청자 수와 이전 게스트/SSE 채팅은 제거했습니다. 기존 영화·TV 메뉴, Google 로그인과 Firebase 프로젝트를 재사용합니다. 로그인 페이지를 스포츠에서 열면 로그인 후 `/sports`로 돌아오며, Firebase 세션도 새로고침 시 복원합니다.

화면은 조회 중, 결과 없음, 키 누락, API 권한 실패, 할당량 초과, 네트워크 실패, 플레이어 실패, 방송 종료를 구분합니다. 원본 영상 링크를 항상 제공합니다. 모바일에서는 플레이어 아래에 채팅이 표시됩니다.

## 데이터 출처와 검증 범위

공식 API 사양:

- https://developers.google.com/youtube/v3/docs/search/list
- https://developers.google.com/youtube/v3/docs/videos/list
- https://developers.google.com/youtube/v3/docs/channels/list
- https://developers.google.com/youtube/iframe_api_reference
- WBSC 채널 식별 대상: https://www.youtube.com/@WBSC
- 공식 단체 홈페이지: https://www.wbsc.org/

이 클라우드에서 Google 문서·YouTube 페이지 요청은 프록시 403, WBSC 홈페이지 요청은 CloudFront 403이었습니다. 따라서 해당 페이지 내용과 WBSC 소유권을 이 세션에서 직접 재확인했다고 주장하지 않습니다. WBSC 필터는 실행 시 `channels.list(forHandle=WBSC)`로 정확한 채널 ID를 확인한 뒤 검색과 결과에 그 ID를 강제합니다. 클라우드 직접 API 검증은 키 등록 후 `npm run verify:sports:live`로 수행해야 합니다. 기존 Vercel 운영 환경에는 키가 있었으며 배포 API 조회와 WBSC 채널 ID UC-UXjExO348UiOCxazH69hA 확인이 성공했습니다. 운영 검색 결과에 섞인 카드 개봉·지연 중계·경기장 카메라·ActionSims 등은 추가 제외 규칙과 회귀 테스트로 반영했습니다.

`/api/live-baseball`은 서버에서 다음 절차를 수행합니다.

1. `search.list`: `q=baseball` 및 `q=야구`, `type=video`, `eventType=live`, `videoEmbeddable=true`, `order=viewCount`, `regionCode=KR`, 페이지당 50개. 검색어별 최대 2페이지를 읽고 중복을 제거합니다. WBSC 필터는 해당 채널 내 `baseball`만 검색합니다.
2. `videos.list`: `snippet,status,liveStreamingDetails,contentDetails`로 공개 여부, 임베드 허용, 실제 방송 시작 시각, 종료 시각, 현재 live 상태와 알려진 한국 지역 제한을 확인합니다.
3. 게임 카테고리·MLB The Show·시뮬레이션·게임플레이·카드 개봉·경기장 카메라·지연 중계·하이라이트·입중계·문자중계·해설·분석·재방송·소프트볼 등 명확한 제외 키워드를 제목/설명에서 거릅니다. 키워드 분류는 완벽한 의미·중계권 검증이 아닙니다. 제목을 속인 방송이 통과할 가능성이 있으므로 운영 시 신고·검수 정책이 필요합니다.
4. 공개된 `concurrentViewers` 내림차순으로 정렬합니다. 공개 숫자가 있는 실제 방송만 TOP 5에 포함합니다. 5개 미만이면 그 개수만, 시청자 수가 비공개면 ‘비공개’로 표시합니다. 0명으로 꾸미지 않습니다.

‘전체’는 YouTube 전체를 완전히 열거한다는 의미가 아니라 검색 범위 안에서 재검증된 모든 결과입니다. 후보 상한은 전체 200개, WBSC 100개이며 페이지가 더 있으면 화면에 알립니다. 검색 호출의 할당량 비용이 높으므로 5분 갱신만으로도 기본 일일 할당량을 소진할 수 있습니다. 초과하면 오류를 숨기지 않습니다.

서버 메모리 캐시·동시 요청 합치기와 Vercel CDN 캐시를 5분 적용합니다. 브라우저는 목록과 선택 방송 상태를 5분마다 갱신합니다. 수동 재확인도 유효한 서버 캐시를 우회하지 않습니다. 플레이어의 실제 종료 이벤트는 즉시 반영합니다. 목록에서 사라졌다는 사실만으로 ‘방송 종료’라고 판정하지 않습니다. IFrame API의 실제 재생 이벤트와 임베드 실패를 구분하며, iframe 로드만으로 재생 성공이라고 표시하지 않습니다.

## 환경 변수와 실행

키 값은 Git·문서·로그·채팅에 넣지 않습니다. 환경 설정의 안전한 값 입력 경로만 사용하세요.

- **필수:** 서버 전용 `YOUTUBE_API_KEY`. YouTube Data API v3 활성화 및 서버 사용에 맞는 키 제한이 필요합니다. 키 누락은 실제 API 조회를 막습니다.
- **이행 호환:** 이미 서버에 주입된 `VITE_YOUTUBE_API_KEY`도 읽을 수 있으나, `VITE_` 값은 기존 앱의 브라우저 코드에 포함될 수 있으므로 새 검색용 키는 서버 전용으로 설정하세요. 기존 에피소드 YouTube 검색은 여전히 `VITE_YOUTUBE_API_KEY`를 사용합니다.
- **기존 영화:** `VITE_TMDB_API_KEY`는 별도입니다.
- **Firebase:** 기존 `src/firebase/firebase.js` 설정을 재사용합니다. 해당 프로젝트의 Google 로그인·승인 도메인과 Firestore 규칙이 필요합니다. Firebase 웹 구성의 기존 공개 값은 이번 변경에 새로 복사하지 않았습니다.

설정 후 개발 서버 재시작 또는 Vercel 재배포가 필요합니다. 네트워크 대상은 `www.googleapis.com`, `www.youtube.com` 및 YouTube 플레이어·미디어 호스트, 기존 Firebase 인증·Firestore 호스트입니다. YouTube 미디어 URL은 제공자가 동적으로 정하며, 실제 재생 시 필요한 호스트는 브라우저 오류로 확인해야 합니다.

```sh
npm ci
npm run dev -- --host 0.0.0.0
# 또는 독립 Node 서버
npm run build
npm start
```

Vite 개발·프리뷰와 독립 Node 서버 모두 같은 라이브 API를 사용합니다. Vercel은 `api/live-baseball.js` 함수와 `vercel.json`의 SPA 라우팅을 사용합니다. 비밀 키를 `vercel.json`에 넣지 않습니다.

## 회원 채팅과 기존 규칙 보존

`auth.onAuthStateChanged`로 기존 Firebase 사용자를 확인합니다. 비로그인 사용자는 채팅 구독·쓰기를 시작하지 않고 기존 Google 로그인으로 안내합니다. 방송 ID별 `liveBaseballRooms/{videoId}/messages`에 `onSnapshot`을 연결합니다. 방송·사용자 변경과 언마운트 때 구독을 해제합니다. 최근 100개, 300자 제한, 전송 중·실패, 1.5초 클라이언트 전송 간격을 제공합니다. 클라이언트 전송 간격은 서버 측 속도 제한이 아닙니다.

**운영 규칙은 자동 배포하지 않았습니다.** 현재 운영 규칙 전체를 읽거나 배포할 Firebase 관리자 인증이 없습니다. `firebase/live-baseball.rules.fragment`의 match 블록을 기존 `match /databases/{database}/documents` 안에 병합해야 합니다. 기존 users 등 규칙을 덮어쓰지 마세요. 이 파일은 다음을 강제합니다.

실제 운영의 새 채팅 경로에 비로그인 REST 읽기가 HTTP 200으로 성공하여, 로그인 UI만으로 보안이 강제되지 않는 상태를 확인했습니다. 따라서 앱은 기본적으로 채팅 구독·입력을 시작하지 않습니다. 관리자 권한으로 기존 규칙을 안전하게 병합하고 비로그인·UID 위조 거부를 운영에서 검증한 뒤에만 Vercel 환경에 **`VITE_LIVE_CHAT_RULES_CONFIRMED=true`**를 설정하고 재배포하세요. 이 플래그는 보안 규칙을 대체하지 않으며 공개 데이터베이스에 회원 메시지를 보내지 않기 위한 앱 측 준비 상태입니다.

- 인증된 사용자만 읽기/작성, 발신 UID와 `request.auth.uid` 일치
- 메시지 필드·타입·이름/본문 길이·서버 시각 검증
- 수정·삭제 금지

Firestore는 겹치는 `allow`를 OR로 평가합니다. 기존 `match /{document=**} { allow ...: if true; }` 같은 광범위 허용이 있으면 새 블록만 추가해도 보안이 강제되지 않습니다. 해당 허용의 범위를 좁히되 기존 앱 경로에 필요한 권한은 보존해야 합니다. 기존 규칙을 읽지 못했으므로 안전한 전체 병합 결과를 만들었다고 주장하지 않습니다. 제공된 테스트는 독립 규칙 조각을 에뮬레이터에 적용한 결과이며 운영 규칙 검증을 대신하지 않습니다.

Firebase Authentication의 승인 도메인에 실제 배포 호스트가 필요할 수 있습니다. 운영 Google 계정 두 개를 이용한 실제 로그인·채팅 확인은 관리자 설정과 사용자 로그인이 필요한 별도 검증입니다.

## 반복 가능한 검증

```sh
npm run test:sports          # 주입한 모의 YouTube 응답, 실제 API 성공을 뜻하지 않음
npm run test:rules           # Java 21, Firestore 에뮬레이터; 실 운영 접근 없음
npm run build
npx eslint src/pages/Sports.jsx src/pages/Login.jsx src/store/useAuthStore.js src/features/sports/*.js src/features/sports/*.jsx server/*.js server/*.mjs api/*.js vite.config.js
PORT=3001 npm start          # 브라우저 검증용 별도 터미널
npm run test:sports:browser  # 시스템 Chromium 필요, 기본 3001/sports
npm run verify:sports:live   # 실제 키 필요; 누락/실패는 종료 코드 1
```

브라우저 테스트는 실제 서버의 missing_key 응답을 먼저 확인하고, 이후 테스트 전용 API/플레이어를 주입합니다. TOP5/전체, WBSC, 선택, 로그인 유도, 할당량 오류, 모바일 가로 넘침을 검증하며 실제 YouTube 영상 재생 성공으로 계산하지 않습니다. 스크린샷 경로는 테스트 출력에 표시합니다. 테스트 ID·가짜 응답은 운영 API 경로에 내장하지 않습니다.

2026-10-21 검증: 모의 API 테스트 6개 통과, 에뮬레이터 두 사용자 송수신·방별 격리·비로그인/UID 위조/길이/시각/추가 필드/수정/삭제 거부 통과, 브라우저 모의 동작 통과, 빌드·변경 코드 린트 통과. 현재 클라우드에 YouTube 키가 없어 직접 조회는 missing_key입니다. Vercel 운영 API는 실제 조회에 성공했고, 강화한 제외 규칙 적용 후 라이브 후보 3개(공개 시청자 수 순위 2개), WBSC 0개, 개별 영상 live 상태를 확인했습니다. 수량은 조회 시점마다 변합니다. 실제 플레이어 API와 embed 요청은 클라우드에서 HTTP 403으로 차단되어 실제 영상 재생을 검증하지 못했습니다. 운영 Firebase 관리자 인증과 실제 두 Google 사용자 로그인도 없어 운영 규칙·채팅은 미검증이며 준비 상태로 제한합니다. 배포 검증 결과는 작업 최종 보고 및 Git 커밋을 확인하세요.
