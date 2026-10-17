# EasyWeb 단계별 진행표

최종 갱신: 2026-10-18 · RUN-008 / v0.9.0

기준: [명세](WORK_SPEC.md) · [현재 보고서](RUN_008_REPORT.md) · [예산](EXECUTION_BUDGET.md)

**완료5/10 · 전체 인수NOT_MET.** 본문관계·준비첨부·경로/펼침메뉴 구분과 노드교체 방어를 구현했다. 로컬409/409·자동접근성21조건·기존합성성능·실제공개과제15/15 PASS다. 알려진55페이지257/260정확·153/155재현과 새독립v10 첫26/28·2/15·0/5 FAIL을 구분한다. 단계수는 공수비율이 아니다.

| ID | 상태 | 증거와 남은 항목 |
| --- | --- | --- |
| S01 | DONE | 명세·예산·기준선 보존 |
| S02 | DONE | core15·이후최초분리·원본/정정판 보존, 이제고유60페이지개발노출 |
| S03 | DONE | 입력제외·원본/본문관계의 실제노드현재성·교체회귀 |
| S04 | DONE | 분류·순위·중복·최대6+다른메뉴. 새품질과검색회귀는S07 |
| S05 | DONE / 정의범위 | 위험/입력/원본액션 정책 유지, 실제업무·파일실행 보증아님 |
| S06 | NEEDS_MANUAL | 현재0.9 자동21조건미달0, 실제VoiceOver·확대NOT_RUN |
| S07 | IN_PROGRESS / NOT_MET | core45/45·기존공개15/15. 새v10 첫2/15·0/5 모든기관FAIL, knownv8검색회귀14/15 |
| S08 | NEEDS_MANUAL | 현재0.9 원래Manifest설치·toolbar·복구NOT_RUN |
| S09 | NEEDS_USER | 1인시험·정식6~8명 모두 실제0건, 준비는실증아님 |
| S10 | IN_PROGRESS | v0.9 ZIP·해시·동결·보고서제공, 필수인수미달 |

## 다음 실행

1. 새v10 첫FAIL을 보존하고12개미분류와1개첫화면밖을 고친다. [개발실행추적](evidence/run008/post-first-trace/trace.json)에서수집누락0·관찰된액션계약차이0을확인했고, [정적진단](evidence/run008/post-first-diagnosis/diagnosis.json)은원본대응모호성도분리했다. 현재60페이지는 개발자료이며 같은자료 개선을 독립통과로 부르지 않는다.
2. v8의 대학게시판검색이 문서6개때문에 추가메뉴로 밀리는15/15→14/15 회귀를 수정한다. 본문관련성을 삭제하거나 정답순서특례를 쓰지 않고 같은본문의실제제어를 함께 다룬다.
3. 전체분석+분류+순위300ms 추가진단은 기관575.9ms·범용437.9ms로FAIL이다. 현재성/입력보호를 유지하며 중복DOM순회를 줄인다. 기존분석300/준비1000ms PASS와 분리한다.
4. 컴퓨터유즈없이 계속한다. 현재설치·발화·확대NOT_RUN, 사전/정식실증0이다. [수동확인](MANUAL_CHECK.md)·[1인시험](PRETEST.md)은 실제관찰만 따로 기록한다.

## RUN-008 증거

[보고서](RUN_008_REPORT.md) · [18제품파일동결](evidence/run008/v0.9-engine-freeze.json) · [409검사](evidence/run008/local-verification.json) · [26개개발비교](evidence/run008/first-development-comparison/summary.json) · [새첫FAIL](evidence/run008/blind-v10-first-evaluated/command-completion.json) · [독립24검사](evidence/run008/independent-reading-safety/review.json) · [패키지](../output/run008/EasyWeb-0.9.0-candidate.json) · [인수](evidence/run008/release-gate.json) · [산출물감사](evidence/run008/final-review.json) · [계측경계](evidence/run008/goal-usage-snapshot.json)

자료388파일과QA는정정0으로고정했다. 첫113ms명령은동결필드형식차이로브라우저/제품실행전에종료했다. 별도동일388항목호환기록으로제품/도구/자료변경없이첫실제평가했다. 오류시도·원래동결·첫결과는읽기전용보존한다. 최대6/최초품질기준과원래10단계목표를유지한다.

## RUN-007 과거 증거

[보고서](RUN_007_REPORT.md) · [311검사](evidence/run007/local-verification.json) · [당시50페이지비교](evidence/run007/final-development/summary.json) · [v9-v2첫26/30·2/15·0/5 FAIL](evidence/run007/blind-v9-v2-first-evaluated/command-completion.json) · [당시인수](evidence/run007/release-gate.json). 현재같은v9개발30/30·15/15·5/5는최초결과를대체하지않는다.

## RUN-006 과거 증거

v0.7 다운로드 연결 수정으로 S05를 정의 범위에서 재완료했고 당시5/10이었다. [보고서](RUN_006_REPORT.md) · [로컬237](evidence/run006/local-verification.json) · [독립 실행 검토](evidence/run006/independent-review/root-resolution.json) · [ZIP](../output/run006/EasyWeb-0.7.0-candidate.json) · [당시 검토](evidence/run006/final-review.json). v8 후속11/16·5/15·2/5 FAIL도 과거 개발 결과로 보존한다.

## 실행 기록

### RUN-005 · v0.6.0 동결 후보 / 당시 4/10·NOT_MET

- 카드 고정 제목·외부 관련 제목 `relatedLabel`·탭 읽기 문맥, 구체 목적 우선 규칙과 반례를 보강했다. 과제·분류 다양성 우선 선택 뒤 서로 다른 분류 완료 후보로 최대 6개까지 빈 자리를 채운다. threshold·권한·action 정책 유지. 사용자는 최대 6개+“다른 메뉴 보기”를 재확인했으며 기존 구현과 같아 추가 소스/UI 변경은 없다.
- 초기 204개 통과 후 독립 검토가 semantic 경계 밖 제목 차용을 발견해 반례 4개(수정 전 3실패·1통과)를 추가·수정했다. [보존](evidence/run005/before-code-review-fix/) · [해결](evidence/run005/code-review-resolution.json). 이후 208개 통과·v1 동결 뒤 기존 개발/live 분류 회귀(14/15)를 찾아 v8 미열람·첫 실행 0 상태에서 수정했다. [이전 검사·ZIP·동결 보존 경계](evidence/run005/pre-first-engine-revision.json)
- 최종 [14파일·아카이브 v2](evidence/run005/v0.6-engine-freeze-v2.json)는 **03:25:20 KST / UTC18:25:20.245610** 동결이다. root/구현자는 그 전에 v8 본문·URL·정답 내용을 읽지 않았다.
- [최종 로컬 222/222](evidence/run005/local-verification.json), fail/flaky/skipped 0, 32,040.867ms. core 정확 **72/74(97.3%)**·재현 **45/45**·과제 추천 **15/15 PASS**, 오탐 2개도 포함. 자동 접근성 21조건 미달 0.
- 성능 각 10표본 p95 분석/준비: mixed **27.3/58.6ms**, flat **39.7/95.7ms**, table **88.9/164.9ms**. 300/1,000ms 기준 PASS이며 실제 사이트 로딩·native 제외.
- [새 v8 최초](evidence/run005/blind-v8-first/evaluation-current-blind-v8-holdout.json)는 UTC18:25:41.668686→18:25:42.472586, exit1. 첫 화면 **10/17(58.8%)·4/15(26.7%)·1/5**, 모든 5사이트 FAIL. 추가 메뉴 **11/19·5/15·1/5**, unresolved/repeated 0이며 첫 화면을 대체하지 않는다. 알려진 총 **50페이지**이며 v7 정정본 추가 0개.
- [v7 별도 정정판](../evaluation/development-v7-corrected/VERSION.json)은 accepted6·expected3·SMU task2의 11필드다. fixture5개 동일·원본 freeze11입력 보존, 로그인2건/미주석 검색 입력 미해결. [프로토콜10/10](evidence/run005/v7-adjudication/validation.json)은 정적 검증이며 최초 점수를 재계산하지 않았다.
- [최종 개발9suite](evidence/run005/final-development/summary.json): v2/v3/정정v4 PASS, v5 24/25·13/15 FAIL, rawv6 25/26·11/15·4/5 FAIL, v6 category1 26/26·12/15·4/5 FAIL, fixture2 26/26·14/15·5/5 FAIL(city2/3), v7 raw/정정 둘 다13/18·11/15·4/5 FAIL. v6fixture2 추가41/41·15/15·5/5와 v7 추가13/18·11/15·4/5(unresolved1)은 첫 화면과 별도다. sourceStable=true.
- [최종 공개 과제15/15](evidence/run005/tasks-live-final.json), HTTP9·원본안내6·재시도/관찰오류0. [최종ZIP](../output/run005/EasyWeb-0.6.0-candidate.zip)315,166bytes·SHA256 `6ddd10dd…`, 두 빌드/ZIP 동일·sourceStable. [수동 확인실](evidence/run005/manual-fixture-final.json)은 HTTP3경로200·바이트 동일만 확인했다. [산출물 최종 검토](evidence/run005/final-review.json)는 **PASS**, 해시305비교/불일치0·검사시점406링크/깨짐0·ZIP5entry동일·이전기록/첫v8FAIL보존. 인수 통과와 별개다. FileDown2건은 명시 다운로드 식별 누락으로 확정해 S05를 재개했고 당시 **4/10**이다. 초기5/10은 발견 전 판정으로 보존하며 core/live15 통과는 이2건을 수행한 증거가 아니다. 컴퓨터 유즈0, native/발화/확대 NOT_RUN, 정식 실증0·1인 시험0. [계측 경계](evidence/run005/goal-usage-snapshot.json)는 **03:10:33→03:31:44 KST / UTC18:10:33→18:31:44, 1,271초(21분11초)**로 이전 준비·분담 및 이후 최종문서·검토·commit을 제외한다. 누적6,672,859tokensUsed/8,825초와 이전대비1,168,622/1,559초는 누적counter/차분일 뿐 이번 고유·생성·청구량이 아니다. 전체 실제 경과·계정 토큰·비용 UNKNOWN. [보고서](RUN_005_REPORT.md)

### RUN-004 · v0.5.0 개발 후보 / 5/10·NOT_MET

- 기술 검증·정적 감사 관찰 구간은 **02:39:51→03:05:48 KST**, **1,557초(25분 57초)**다. 전체 RUN-004 시작·전체 경과가 아니며 이후 문서 마감·로컬 commit은 제외한다. [계측 범위](evidence/run004/goal-usage-snapshot.json)
- 목표 도구 누적 counter는 tokensUsed **5,504,237**·timeUsedSeconds **7,266**. RUN-003 snapshot 차분 **1,243,365**·**1,691초**는 이전 준비를 포함한 counter 차분이며 이번 고유 사용량·생성·계정 청구량이 아니다. 중복 합산하지 않는다. 전체 실제 경과·계정 토큰·비용 UNKNOWN.
- 최종 엔진은 **02:53:53 KST**에 [14파일·아카이브](evidence/run004/v0.5-engine-freeze.json)로 동결했다. root/구현자는 동결 전 v7 본문 미열람, 첫 평가 후 소스 변경·재실행 없음.
- 목적지 기본값·heading 반복 병목 개선, 한 batch의 table/panel 문맥 재사용, batch 사이 cache 비공유를 반영했다. 기존 순위·threshold는 유지했다. 자료받기 caption·snapshot은 label/href/action·초기 순서를 바꾸지 않는다.
- v6 [category v1](../evaluation/development-v6-corrected/VERSION.json)은 5필드, [fixture v2](../evaluation/development-v6-corrected-v2/VERSION.json)는 이를 유지한 city 빈 td 9개·fixture 경로 1곳만 정정했다. 원본 11파일·v1 전체 11파일 보존.
- 로컬 **189/189**, 실패·flaky·skipped 0. core 정확 **69/69**·재현 **45/45**·과제 추천 **15/15**. 자동 접근성 21조건 미달 0. 첫 도구 mock 실패는 [보존](evidence/run004/first-integration-tool-mock-failure/)하고 fixture 수정 후 통과했다.
- 성능 각 10샘플·총 30: mixed p95 분석/준비 **27.5/57.8ms**, flat **39.6/78.4ms**, table **89.6/146.4ms**. 분석 300ms·준비 1,000ms 기준 PASS, 실제 로딩/native 제외.
- [개발 재평가](evidence/run004/final-development/summary.json): raw v6 **21/22·11/15**, category v1 **22/22·12/15**, fixture v2 **24/24·14/15·5/5**. v2도 city **2/3(66.7%)**로 사이트 기준 미달. 추가 메뉴 **41/41·15/15·5/5**는 별도이며 unresolved/repeated 0. v5 첫 **16/17·8/15 FAIL**, 추가 **26/27·14/15**. core·v2·v3·정정 v4 개발 PASS는 과거 첫 실패를 대체하지 않는다.
- 구 v7 감사의 오류 0·좁은 fixed-control 허용 가능 판단과 별개로, root는 조상 평탄화·heading/form 변환이 S07 증거로 약해 [v2 복원](evidence/run004/v7-fidelity-decision.json)을 선택했다. 감사자의 필수 승인 요구가 아니다. [관찰자 교체 사건](evidence/run004/v7-observer-boundary-incident.json) 보존.
- [v7-v2 동결](evidence/run004/blind-v7-v2-freeze.json)의 확인 범위는 조상 342항목·순서 32/32·HTTP 16/16·AX role/target 32/32·AX name 정확 29/32, 공백 제외 32/32다. 원본 v7 제품 평가 0회, v2가 같은 5페이지 최초 평가다. 총 **45페이지**, 두 버전을 10개로 세지 않는다.
- [최초 결과](evidence/run004/blind-v7-v2-first/evaluation-current-blind-v7-v2-holdout.json)는 **6/12(50%)·4/15(26.7%)·과제 추천 1/5**, 원본 정답 기준 모든 5사이트 FAIL. 03:02:06 KST 종료·exit 1·같은 동결 소스. 추가 메뉴도 같은 수치이며 unresolvedMappings 1·repeatedCards 0.
- 첫 결과 후 [action 감사](evidence/run004/v7-v2-action-audit.json)에서 accepted 6충돌·expected 3건·SMU 과제 영향을 확인했다. [root](evidence/run004/v7-v2-action-root-review.json)가 별도 개발 정정 후보로 승인했으나 이번 checkpoint는 데이터 정정·재계산·재평가 없음. 로그인 2건은 계약 모호성으로 남았다. 원본 점수를 순수 제품 품질로 해석하지 않는다.
- 같은 동결 소스로 [공개 과제 **15/15 PASS**](evidence/run004/tasks-live-final.json), HTTP 9·원본 안내 6·재시도/관찰 오류 0. 인증/신청 업무 완료나 사람 실증이 아니다.
- [후보 ZIP](../output/run004/EasyWeb-0.5.0-candidate.zip)은 **275,816bytes**, SHA256 `aa94ee22…`, 두 빌드/ZIP 동일·sourceStable·현재 14파일 동결 일치. [산출물 검토](evidence/run004/final-review.json) PASS, 해시 불일치·깨진 링크 0. RUN-002/003 기록·증거·ZIP 보존.
- [확인실 3경로](evidence/run004/manual-fixture-final.json)의 HTTP 200·바이트 일치만 확인했다. 컴퓨터 유즈 0, native/발화/확대 미검증, 정식 실증 0·1인 시험 0.

### RUN-003 · v0.4.0 메뉴 탐색·일반화·검증

- 시작 시각을 별도 계측하지 않아 실제 경과 시간은 UNKNOWN. 이전 실행의60분을 이번 묶음 시간으로 사용하지 않는다. 계정 입력/출력/캐시/청구 토큰·비용은 UNKNOWN.
- 02:37:35 KST 목표 도구 **누적** 집계는 tokensUsed **4,260,872** / timeUsedSeconds **5,575**. 앞선 작업/도구 보고 하위 처리를 포함하며 RUN-003 별도 계측이나 청구량이 아니다. [범위·스냅샷](evidence/run003/goal-usage-snapshot.json)
- 최종 소스 고정: **2026-10-18 02:34:37 KST** (UTC17:34:37), classifier `b68994f3…`, analyzer `668650ca…`, ranker `acaeb5fd…`. [최종 동결](evidence/run003/final-engine-freeze.json). v6 첫 평가 당시 엔진은 별도 보존
- 구현: 지역 제목·h4~h6/heading 역할, 본문 신청 진입/발급·정보 주제, 관련 collection 근거와 WeakMap 배치 현재성, 지연 생성 “다른 메뉴 보기”/이전/다시 찾기 및 stale 방어.
- 로컬 검증: **172/172**, 실패/flaky/skip0. core69/69정확·45/45재현·과제추천15/15. 자동 접근성21조건 오류/위반/incomplete0. 첫 대비 incomplete1은 원본을 보존하고 검사 시 전체 dialog를 드러내 재검사. 합성1000제어10회 p95분석 **248.1ms**, 준비 **276.5ms**.
- 독립 첫 결과: v5(v0.3) 정확7/8·재현4/15, v6(v0.4) 정확9/9·재현5/15. v6 실제 추가 메뉴 UI 표시 관찰은 정확13/13·재현5/15이며 첫 화면 결과를 대체하지 않는다. 모두 S07 인수 미달.
- 실제 공개 과제: **최종15/15**, 목적지9·원본안내6·재시도0, 관찰오류0. 첫 후보14/15는 보존. 공유하기 제어의 잘못된 예약 우선순위 회귀를 재현·수정한 뒤 같은 최종 소스로 전체 통과. [현재 기록](evidence/run003/tasks-live-final.json)
- 후보: [EasyWeb-0.4.0-candidate.zip](../output/run003/EasyWeb-0.4.0-candidate.zip), SHA256 `feac9d08…`; 두 빌드/두 ZIP 동일·소스 안정 확인. DEVELOPMENT_CANDIDATE이며 인수 통과 아님.
- 원격 게시·연락·유료 API 사용 없음. native UI 자동화 중단 유지. 최종 v0.4 수동 확인실 HTTP3경로의200·로컬 바이트 일치만 확인했고 사람의 실제 결과는0이다. [HTTP 증거](evidence/run003/manual-fixture-final.json)
- 상세·잔여 항목: [RUN-003 보고서](RUN_003_REPORT.md). 이전 기록은 아래 보존한다.

### RUN-002 · S05~S10 이어서 진행

- 시작: **2026-10-18 01:04:05 KST** (UTC 2026-10-17 16:04:05). 사용자는 10/10까지 이어서 진행하도록 요청했으며 이번 묶음에 별도 4시간 상한을 다시 지정하지 않았다.
- 사용자 결정: 일반 링크 직접 이동 유지. 사용자 본인이 먼저 시험 가능하며 정식 대상 사용자 6~8명 확보나 실험 완료를 뜻하지 않는다.
- 구현: 원본 연결/복구, 접근성·입력 보호 보강, 현재 페이지 과제 우선순위, 실행/평가/실증/패키지 도구와 인계 자료.
- 확인된 독립 평가: 원래 holdout 재현 8/15, blind-v2 5/11, v3 4/11, v4 5/13. 최초 결과·자료·엔진 보존. 노출 후 개선한 재평가는 개발용으로 분리한다.
- 최종 소스 고정: 01:57:18 KST, classifier `2815c540…` 및 전체 파일 해시 보존. 로컬 **128/128**, core 69/69 정확·45/45 재현, 접근성17조건 오류0, 합성 p95 분석 **119.4ms**/화면 준비 **135.7ms** 통과.
- 실제 공개 과제 **최종 15/15 도달**, 공개 목적지9·원본 안내6·재시도0. 중간14/15 퇴행과 이전15/15 결과는 `priorSnapshots`에 보존. 인증·신청 업무 완료가 아니다.
- 후보 패키지: `output/run002/EasyWeb-0.3.0-candidate.zip`, SHA256 `bd29be89…`; 두 빌드·두 ZIP 동일. 전체 해시는 RUN-002 보고서 참조.
- 기술 검증 기록 기준: **2026-10-18 02:04:05 KST**, 시작부터 **60분**. 이후 문서·로컬 인계 작업 시간은 별도다. 목표 도구 집계 **tokensUsed 2,243,533 / timeUsedSeconds 3,571**; 입력/출력/캐시별 사용량과 실제 계정 청구 토큰·비용은 UNKNOWN. [계측 범위](evidence/run002/goal-usage-snapshot.json)
- 사용자 최신 요청: 컴퓨터로 다른 작업을 해야 하므로 컴퓨터 유즈를 되도록 사용하지 않음. 모든 native UI 자동화를 중단했고 S08의 남은 항목을 수동 확인으로 남겼다.
- 최종 결과·패키지는 [RUN_002_REPORT.md](RUN_002_REPORT.md)에 기록한다. 로컬 Git 복구 태그는 `run-002-v0.3.0-dev`다. 원격 게시 없음.

### RUN-001 · 첫 4시간 묶음

- 시작: 2026-10-17 23:26:55 KST (UTC 14:26:55). 최대 작업 창은 2026-10-18 03:26:55 KST이며, 정한 작업을 더 빨리 완료하면 검증·기록 후 종료한다.
- 범위: S03.1 우선 수정, S02 정답 데이터, S03 나머지와 S04의 가능한 개선, 관련 회귀·빌드·진행 기록.
- 병렬 분담: 공개 사이트 관찰 2개 작업, 분류·순위 개선 1개 작업. 동일 소스 파일 동시 편집 없음.
- 기준선 보존: `docs/evidence/run001/baseline/`에 분석·분류·순위·타입·Manifest 원본 보관.
- 실제 소비 토큰: UNKNOWN. 계획상 50,000 수준의 생성 작업 예산이며 계정 청구량 실측값이 아니다.
- 결과: v0.2.0, S02~S04 완료. 상세 변경·수치·미해결은 [RUN_001_REPORT.md](RUN_001_REPORT.md).
- 검증·패키지 기록 마감: 2026-10-17 23:55:55 KST. 시작부터 29분, 로컬 커밋·인계까지 약 30분. 정한 범위가 먼저 완료되어 최대 4시간을 채우지 않음.
- 최종 검사: 타입·빌드 통과, **46/46 테스트**, 개발용 평가 37/37 정확·23/30 재현, 분석 smoke p95 60.4ms, 상명대 HTTP 200·6카드 표시, ZIP/해시/로컬 링크 검증 통과.
- 복구 지점: 로컬 Git 태그 `run-001-v0.2.0-dev`. 원격 게시 없음.
- 다음 첫 작업: S05의 JavaScript 이벤트 링크·SPA·팝업 액션 실패 재현과 처리 정책.

### PLAN-001 · 2026-10-17

- 범위: 작업명세서·10단계 인수 조건·4시간 실행 묶음·토큰 추정·진행표 작성.
- 기준선: `npm run typecheck` 통과, `npm test` 11개 통과. 기존 제품 코드 기능 변경 없음.
- 추가 확인: 가상 DOM에서 B01 입력 내용 읽힘, B02 의미 기반 입력창 누락, B03 URL 단독 분류 미채택을 재현.
- 증거: [planning-baseline.json](evidence/planning-baseline.json), 코드 검토, 기존 [VALIDATION.md](VALIDATION.md).
- 실제 경과 시간·소비 토큰: 계측하지 않았으므로 UNKNOWN. 예산표는 계획 추정이다.
- 완료: S01. 나머지 9개 단계와 실제 4시간 개발 묶음은 아직 수행하지 않음.
- 다음 작업: S03.1부터 시작.

## 재개용 지시문

> WORK_SPEC·PROGRESS·RUN_008_REPORT와run008 post-first 진단을 읽고 개발을 계속해줘. 현재v0.9·5/10·NOT_MET, 고유60페이지개발노출이야. 모든원본/동결/첫FAIL/ZIP을보존해. v10첫26/28·2/15·0/5, 추가32/40·3/15·0/5(대응모호9/반복표시4)와분리해. 같은본문검색회귀(v8 15→14/15)와 전체pipeline300ms초과를 고쳐. max6+다른메뉴·일반링크직접이동·입력/위험/현재성보호를유지하고 정답위치/불투명query특례를만들지마. 현재설치/발화/확대NOT_RUN·사람실증0건이며 컴퓨터유즈없이 원래10/10목표와인수조건을유지해.
