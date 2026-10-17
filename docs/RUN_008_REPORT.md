# RUN-008 · v0.9.0 본문 관계·추가 메뉴 회귀

2026-10-18 · **완료5/10, 전체 인수NOT_MET.** 최대6개와 다른 메뉴 보기/이전 메뉴, 일반 링크 직접 이동을 유지했다. 이전 실패 자료를 개선했으나 새 독립 자료의 핵심 기능은 충분히 찾지 못했다.

## 제공 파일과 판정

- [설치 후보 ZIP](../output/run008/EasyWeb-0.9.0-candidate.zip): **478,876bytes**, SHA256 `23e6f3e03d3aee061a2cd1912bed6612dce18853579ba8f85e41b1a39ed68c08`. [두 빌드·두 ZIP 동일/sourceStable](../output/run008/EasyWeb-0.9.0-candidate.json), 원래activeTab/scripting 권한 유지, 게시0.
- [로컬409/409](evidence/run008/local-verification.json), 실패·flaky·skip0. 타입·빌드·core72/74정확·45/45재현·15추천·기존합성성능3종PASS. 개발자료 회귀이며 독립 인수가 아니다.
- [자동접근성21조건](evidence/run008/a11y-automated.json) 오류·위반·미판정0. 현재 후보 설치·실제VoiceOver·실제확대는NOT_RUN, 사전시험/정식6~8명 관찰 각0건.
- [기존 실제공개과제15/15](evidence/run008/tasks-live.json): HTTP목적지9·원본위치안내6, 재시도/관찰오류0. 실제 업무·파일실행·사람의 성공은 아니다.
- [새v10 첫 실제평가](evidence/run008/blind-v10-first-evaluated/evaluation-current-institution-blind-v10-holdout.json): **정확26/28(92.9%), 재현2/15(13.3%), 과제추천0/5, 모든기관FAIL**. 추가메뉴32/40·3/15·0/5는 별도이며 대응모호9/반복표시4가 있어 원본대응 진단이 필요하다. 원본 동일제어의 제품중복으로 단정하지 않는다.

## 구현과 안전 검토

기관모듈v3는 실제 readonly 설명패널, 선택된 인쇄/복사 안내, 행동요령 자료/시작 제어, 같은본문의 안전한 서비스 진입관계를 구분한다. 연금 탭은 유일한 localfragment·실제패널·같은고정제목을 확인한다. readonly 납부기한 문구의 좁은 예외는 설명읽기/locate에만 적용하며 위험URL·query·script 검사를 우회하지 않는다. ARIA의 대화형 역할이나 실제 입력/업무 제어가 들어간 패널은 예외를 받지 않는다.

범용 준비서류 첨부는 실제표·유일한제목/첨부열·고정준비제목·서식종류·명시적다운로드 anchor로만 읽기근거를 만든다. POST wrapper의 기본submit 제목은 새 카드로 승격하지 않는다. 입력 value/checked나 편집문구를 읽지 않으며 실제 파일을 받거나 실행하지 않았다.

본문관련성은 이미 분류된 제어에만 붙는다. 선택주제·문서그룹/명시적준비첨부(level2), 기관본문관계(level1)를 먼저 보며 같은tier 안에서는 분류다양성을 확보한다. 근거가 있는 본문은 최대6개를 채울 수 있고, 근거가 없는 후보에는 종전 과제/분류다양성/빈자리채움 정책을 유지한다. 고정된 분류당3개를 전체한도로 쓰는 정책은 아니며 최초6개의 품질 기준은 그대로다. [정책검토](evidence/run008/content-relevance/policy-final-review.json).

경로Home·실제breadcrumb·landmark건너뛰기는 기능카드에서 제외한다. 하위메뉴펼침에는 넓은본문읽기근거를 전파하지 않되 직접의미가 있는 링크/FAQ/정보패널은 보존한다. 원본action/href/target을 바꾸거나 원본제어를 자동클릭하지 않는다.

[기관65검사](evidence/run008/institution-module/handoff.json)·[준비첨부11검사](evidence/run008/preparation-attachments/handoff.json)·[관련성검토](evidence/run008/content-relevance/handoff.json)·[경로구분13검사](evidence/run008/navigation-utility/handoff.json)를 전체409검사로 통합했다. 각handoff의 sourcehash는 중간단계이며 최종18파일은 [엔진동결](evidence/run008/v0.9-engine-freeze.json)을 따른다.

독립검토가 readonly ARIA누락9종·목록부모/기관제목/범용제목의 동일내용노드교체 누락을 발견했다. 공통 evidenceNodes로 실제부모·고정이름하위노드(SVG포함)를 추적해 수정했다. 편집하위트리는 제외하고 제목당64방문/장식256한도에서 새근거를 포기한다. 이는 전체dependency256한도라는 뜻이 아니다. [독립최종24/24·소스안정](evidence/run008/independent-reading-safety/review.json), [root이전/이후10검사](evidence/run008/root-integration/resolution.json)를 보존했다. 하네스의 shadowroot/안내시점 가정 수정도 제품수정과 구분했다.

## 같은 소스 개발 비교와 남은 회귀

[26회비교](evidence/run008/first-development-comparison/summary.json)는 generic/institution 각13suite를 동일18파일로 실행했다. 원본/정정판을 모두 남기고 같은원본은 한 번만 센다. 고유55페이지 기관합계 **257/260정확·153/155재현·55/55추천**, 범용234/242·133/155·48/55다. 합계PASS는 개별FAIL이나 독립 인수를 대체하지 않는다.

|자료|generic 정확/재현|institution 정확/재현|기관판정|
|---|---|---|---|
|core|72/74 ·45/45|72/74 ·45/45|PASS|
|blind-v2|22/22 ·11/11|22/22 ·11/11|PASS|
|blind-v3|18/18 ·11/11|18/18 ·11/11|PASS|
|development-v4-corrected|15/15 ·13/13|15/15 ·13/13|PASS|
|blind-v5|24/25 ·13/15|26/26 ·14/15|FAIL|
|blind-v6|25/26 ·12/15|25/26 ·12/15|FAIL|
|development-v6-corrected|26/26 ·13/15|26/26 ·13/15|FAIL|
|development-v6-corrected-v2|26/26 ·15/15|26/26 ·15/15|PASS|
|blind-v7-v2|13/18 ·11/15|16/24 ·12/15|FAIL|
|development-v7-corrected|13/18 ·11/15|20/24 ·15/15|FAIL|
|development-v7-corrected-v2|16/18 ·11/15|23/24 ·15/15|PASS|
|blind-v8|13/16 ·7/15|25/25 ·14/15|FAIL|
|blind-v9-v2|28/28 ·7/15|30/30 ·15/15|PASS|

이전v9-v2 첫FAIL26/30·2/15·0/5는 그대로다. 같은자료의 현재개발결과30/30·15/15·5/5 PASS는 개선증거다. v5의 동률탭 뒤쪽1개는 계속 첫6개밖이다. **v8은15/15에서14/15로 회귀**했다. 대학게시판문서6개가 먼저 선택돼 같은게시판검색이 두번째화면으로 밀린다. 추가메뉴로 찾을 수 있어도 첫화면실패를 지우지 않는다. 본문관련성과 해당본문의 실제제어를 함께 다루는 후속수정이 필요하다.

## 새 자료의 독립 경계

수집자는 이전55원본페이지/57URL별칭만 제외조건으로 받았고 제품/과거정답을 읽지 않았다. 새5기관·5페이지·15기대·5읽기과제·가시333제어의 전체본문/조상/form/표/ARIA/가시성을 보존했다. 원본스크립트/handler실행과 개인입력값은 차단/정리했다. [원래동결388파일](evidence/run008/blind-v10-freeze.json) SHA`611ad5bd…8bc44`, [독립정적QA](evidence/run008/blind-v10-independent-static-qa/report.json)는 확인오류/필수정정0·비차단불확실성1을 기록했다. 결과를 보고 주석을 바꾸지 않았다. [불확실성 맥락](evidence/run008/post-first-qa-context.json)은 홈페이지를가리키는canonical메타데이터에관한것이며 중복콘텐츠/주석결함이확인된것은아니다. 첫점수를조정할근거가없다.

최종제품18파일·도구13개는 **04:38:43 KST** [동결](evidence/run008/v0.9-engine-freeze.json)했다. 정확한시각은JSON을 따른다. 그전에root/구현자는 새URL·이름·본문·주석값을 읽지 않았고 제품실행0이었다. 첫명령은113ms에 동결의 필드형식차이로 **브라우저/제품실행 전** 종료했고 [오류기록](evidence/run008/blind-v10-first/command-completion.json)에 품질report가 없다.

원래동결·데이터·제품·도구를 그대로 두고 동일388개 path/hash의 [프로토콜호환동결](evidence/run008/blind-v10-freeze-protocol.json)을 별도로 만들었다. 원래동결을 덮어쓰지 않았다. 이후 [첫실제평가](evidence/run008/blind-v10-first-evaluated/command-start.json)는 **04:41:04 KST 종료·exit1**, source/tools/dataset안정이다. 첫report SHA`e469fe25011392ea61be795a00d552e02ef7aa7d23789c1e9db08973c5a1c131`을 읽기전용 보존했다. 지금은 총 **60고유페이지가 개발노출**이며 같은자료의 후속수정은 독립검증이 아니다. 비교명령은 현재종전55페이지만 실행한다.

## 성능과 다음 작업

기존1000제어 각10회 p95분석/준비(ms): mixed29.1/71.9, flat44.4/139.2, table94.4/225.5. 300/1000ms 기준PASS다. [기관근거가실제1000개적용된측정](evidence/run008/institution-performance-first/performance.json)은 분석264.3/준비604.7ms로 기존기준PASS다.

별도더엄격한 **전체분석+분류+순위300ms 진단은 기관575.9ms·범용437.9ms로FAIL**이다. currentness일괄은 기관485.9ms·범용238.4ms다. 이전보다 증가했으며 캐시/중복DOM순회 개선이 필요하다. 기존기준PASS로 이진단FAIL을 숨기지 않는다. 합성헤드리스 각10표본p95는 최대관측값이며 실제사이트/native/OS부하 전체를 대표하지 않는다.

[독립정적진단](evidence/run008/post-first-diagnosis/diagnosis.json)과 별도 [개발단계실행추적](evidence/run008/post-first-trace/trace.json)으로13누락을구분했다. 실제추적에서12개는수집됐으나분류되지않았고1개는분류됐으나첫화면밖이다. 수집누락/관찰된액션계약차이0이다. 추적은새품질평가가아니며소스/도구/첫결과를바꾸지않았다. 다음기술작업은이12미분류·1순위누락·추가메뉴대응모호성, 본문검색회귀, 구조근거계산의성능이다. S06실제발화/확대·S08동일후보설치/복구·S09사람실증은 여전히 필요하다. [사전시험](PRETEST.md) 준비와 실제관찰0건을 구분한다. 컴퓨터유즈/native/사용자브라우저조작0, 기존4173/4183서버유지, 외부게시/연락/유료API0이다. [로컬HTTP대조](evidence/run008/local-preview-http-final.json)는200/파일바이트일치만 증명한다.

[인수판정](evidence/run008/release-gate.json)·[최종산출물감사](evidence/run008/final-review.json)·[계측경계](evidence/run008/goal-usage-snapshot.json)를 따른다. 기록경계는04:19:53.927→04:44:03 KST의24분9.073초이며 초기준비와후속문서/감사/commit을제외한다. 전체RUN경과가아니다. 전체10/10목표와 원래기준은 유지한다. 계정입력/출력/캐시/청구토큰·비용·전체작업경과는UNKNOWN이며 목표도구누적counter는 청구량이 아니다.
