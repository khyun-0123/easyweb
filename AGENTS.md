# EasyWeb 작업 안내

## 작업 활동과 재개

- 사용자는 2026-10-18 **현재 진행 중인 v0.10까지만 마감하고 중지**하도록 요청했다. 이번 버전 인계 후 장기 목표를 일시 정지한다. 사용자 재개 지시 전에는 다음 버전·새 독립 자료 수집·장기 작업을 자동으로 시작하지 않는다.
- 재개 시 `docs/WORK_SPEC.md`, `docs/PROGRESS.md`, `docs/RUN_009_REPORT.md`, `docs/evidence/run009/user-stop-boundary.json`을 먼저 읽는다. 전체 인수는5/10·NOT_MET이며 원래10/10 목표나 기준을 축소하지 않는다.
- CUA/native/보이는 브라우저·창·초점·키보드·기존Chrome프로필을 건드리지 않는다. CLI·별도headless만 사용하고 기존4173/4183 서버를 중지·재시작하지 않는다.

## 현재 v0.10

- 로컬493/493, 실패/flaky/skip0. core72/74정확·45/45재현·15추천, 자동접근성21조건 미달0, 기존합성성능3종, 기존공개과제15/15 PASS다. HTTP9/원본안내6은 설치·업무완료·사람의 성공과 별개다.
- 범용 서비스관계3종·문서관계4종을 공통안전검사 뒤에 연결했다. 원본 label/action/href/target은 보존하고 고정 관련제목만 별도 전달한다. 실제노드/고정하위이름/fingerprint를 다음검사에서 재계산한다.
- 같은본문 검색은 form소유·고정검색명·legend/제목/유일선택주제·실제후속본문목록으로 증명한다. GET과 명시적non-submit POST검색을 다루며 기본POST제출에는 새근거를 주지 않는다. paging/빈버튼목록은 본문이 아니다. 입력/버튼은 본문tier 채움에서 같은검색목적 그룹으로 다룬다.
- Navigation/Context/Institution/Content 캐시는 한 동기batch 전용이다. 다음 card/menu/afterfocus/currentness마다 fresh. 전역/프레임간 semanticcache를 만들지 않는다. form action/method/onsubmit은runtime snapshot과observer대상이며 snapshot은진단출력에서제외한다.
- 메뉴흐름 진단은 이름추측 대신 렌더링 카드의 실제원본 WeakMap결속을 쓴다. 제품DOM에 평가ID를넣지 않는다. 원본평가식별자가없으면미판정으로남긴다.
- 최종 전체검사는493개다. 최초491PASS/1FAIL은옛이름대응 가정을 새실제원본결속에맞춰정정하고 미식별ID 음성검사를추가한뒤재검증했다. 원본실행/검사는run009/before-menu-contract-update에보존한다.
- 독립통합10검사의별도bundle은 마지막pagination수정전이다. 최신소스 전체493검사에 그10개도포함했다. 중간worker해시를최종동결해시로주장하지않는다.

## 제품 기준

- 최대6+다른메뉴/이전메뉴는 사용자 확정 정책이다. 추가메뉴 합집합으로 최초6개 품질 기준을 대체하지 않는다. 같은tier내 분류다양성을 확보하고, 3/category는 전체강제한도가 아닌 fallback예약정책이다.
- 일반HTTP(S)는 직접이동. 명시JS/handler/팝업/다운로드/SSO/같은문서fragment는원본위치안내. 일반로그인폼링크·다른문서fragment는일반링크다. 자동원본활성화·제출·결제·삭제·인증 없음. stale를모든실행경로에서차단한다.
- input/textarea/contenteditable/편집role/중첩사적값을 후보·UI·로그·저장소에 넣지 않는다. 고정메타데이터와 안전한이름만 읽고 value/checked/편집내용을 읽지 않는다.
- 근거없는 기능·불필요한 권한·평가ID/문서번호/불투명query/정답순서 매핑을 만들지 않는다. 읽기예외로 위험URL/query/script를 우회하지 않는다. 납부기한의좁은readonly정보예외는 실제업무/대화형패널을 되살리지 않는다.

## 검증·보존·한계

- `npm run verify`는 타입·빌드·로컬·노출core·합성성능이다. 접근성/공개과제/독립품질/native/발화/확대/사람실증은 서로 대체하지 않는다. 통과검사를 근거없이 반복하지 않는다.
- `npm run compare:development -- --output-dir=<새 빈 경로>`는 노출60페이지 양쪽mode 각14suite,28회다. 원본/정정판 개별FAIL을 남기고 같은원본은한번만센다. 기관286/290·169/170·60추천, 범용263/272·148/170·53추천은 개발결과다.
- v10현재개발29/30·15/15·5/5 PASS, 추가89/93·15/15·5/5 및 대응모호/반복0. v8검색회귀15/15복구. v5동률탭1개는계속첫6개밖이며 해당사이트FAIL이다. raw/중간v6/v7 FAIL도보존한다. 60페이지표시오분류4개(정부소식view help포함)도남는다.
- 기존성능analyzer≤300ms/준비≤1초는모두PASS. 기관1000제어 전체pipeline300ms 추가진단은284.2ms PASS, 범용327.1ms FAIL이다. 두모드전체diagnostic status/명령exit는FAIL이며숨기지않는다. 기관currentness241.9/범용178.4ms도별도다.
- 새독립수집/평가를이번버전에하지않았다. v0.9의v10첫26/28·2/15·0/5 FAIL SHAe469fe25011392ea61be795a00d552e02ef7aa7d23789c1e9db08973c5a1c131, 이전메뉴9/4와모든원본/동결/첫FAIL/ZIP/태그는불변이다. v9/v2·v6/v7정정판은새표본이아니다. 개발15/15로첫FAIL을대체하지않는다.
- 최종21제품파일·17도구·42test파일은run009/v0.10-engine-freeze.json, source/tool아카이브는v0.10-final-engine이다. 이전bdc3e1c와모든이전immutable증거를보존한다.
- 현재0.10 실제설치·VoiceOver발화·브라우저200/400%확대NOT_RUN, 1인/정식6~8명 관찰각0건. `PRETEST`·`MANUAL_CHECK`는준비자료다. 실제결과만별도기록한다.
- 계측경계는run009/run-start.json과goal-usage-snapshot.json이다. 전체시작/경과·계정입력/출력/캐시/청구량·비용UNKNOWN. 누적goalcounter는청구량이아니다. 보고서/ZIP/시간만으로10/10완료를선언하지않는다.
- 외부게시/배포/연락/유료API는 해당행동의사용자지시범위를따른다. 이번작업에서는없다.
