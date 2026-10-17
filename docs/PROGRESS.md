# EasyWeb 단계별 진행표

최종 갱신: 2026-10-18 (한국 시간) · RUN-004 / v0.5.0 개발 후보

기준 명세: [WORK_SPEC.md](WORK_SPEC.md) · 예산: [EXECUTION_BUDGET.md](EXECUTION_BUDGET.md) · [최신 보고서](RUN_004_REPORT.md) · [이전 후보 기록](RUN_003_REPORT.md)

**완료 단계: 5/10 · 인수 NOT_MET.** S01~S05는 완료했다. v0.5 로컬 189/189·자동 접근성·합성 성능·공개 과제 15/15·패키지 재현성은 통과했다. v7-v2 원본 첫 점수는 정확 6/12·재현 4/15·과제 추천 1/5로 FAIL이다. 이후 action 주석 충돌 6건이 확인돼 점수의 해석에는 한계가 있다. 원본·첫 실패는 보존하고 정정·재계산·재평가는 하지 않았다. S06/S08/S09 실제 확인과 S07 품질 인수가 남으며 단계 수는 공수 비율이 아니다. [인수 판정](evidence/run004/release-gate.json)

## 상태

- DONE: 해당 인수 조건과 증거 충족.
- IN_PROGRESS: 구현·검증 또는 인수 조건이 남음.
- NEEDS_USER / NEEDS_ENV / NEEDS_MANUAL: 구체적인 사용자·환경·수동 증거가 필요함. 독립 작업의 중단을 뜻하지 않음.

| ID | 단계 | 상태 | 완료 증거 / 남은 항목 |
| --- | --- | --- | --- |
| S01 | 기준선·작업명세 | DONE | 명세·예산·진행표·초기 재현 증거 보존 |
| S02 | 5개 사이트 정답표 | DONE | core 15페이지·45기대·15과제와 원래 10/5 분리 보존. 후속 독립 첫 자료·결과·동결 보존. v6 category v1/fixture v2 분리, v7/v2 같은 5페이지로 알려진 자료 총 45페이지 |
| S03 | 입력 보호·DOM 분석 | DONE | 편집 입력 비수집·안전한 정적 문맥·현재성 batch 재검사·stale 방어. 다른 batch에 cache 공유하지 않음 |
| S04 | 분류·순위·중복 | DONE | 범용 문맥·본문 과제·중복·결정적 순위 회귀. 첫 순위 정책과 별도 추가 메뉴 유지. S07 독립 품질은 별개 |
| S05 | 원본 연결·복귀 | DONE | 액션·가림·초점 변경·실패 복구 회귀. 일반 링크 직접 이동은 사용자 선택이며 원본 JS 식별 한계 명시 |
| S06 | UI·접근성 | NEEDS_MANUAL | 자동 21조건 오류·위반·incomplete·넘침·타깃·대비 미달 0. 실제 VoiceOver 발화·브라우저 200/400% 확대 NOT_RUN |
| S07 | 회귀·성능 | IN_PROGRESS / NOT_MET | 로컬·core·성능 3종·공개 과제 통과. v7-v2 첫 raw 6/12·4/15·1/5 FAIL, action 충돌 6건은 별도 개발 정정 후보 승인. 보정 점수 미산정. v6-v2 city 2/3도 미달 |
| S08 | 배포본 실제 설치 | NEEDS_MANUAL / NOT_RUN | 컴퓨터 유즈 중단 유지. 현재 후보의 원래 Manifest 실제 설치·toolbar·단축키·이동·복구 미검증. v0.3 부분 관찰은 이력 |
| S09 | 사용자 실증 | NEEDS_USER | 정식 6~8명·1인 시험 모두 실제 결과 0. 확인실·양식 준비는 실증이 아님 |
| S10 | 파일럿 인계 | IN_PROGRESS | v0.5 ZIP·해시·두 빌드/ZIP 동일·산출물 검사 PASS. S06/S07/S08/S09 필수 조건 미달로 DONE 불가 |

## 다음 첫 작업

1. [정적 원인 진단](evidence/run004/v7-failure-diagnosis.md)에 따라 범용 서비스 카드·안내 탭·지역 제목과 제어를 연결하는 근거 및 반례 회귀를 개선한다. 현재 45페이지의 결과에 맞춘 라벨 추가를 목표로 삼지 않는다. 첫 6개 제한이 원인이 아니며 분류 전 trace가 없는 정적 추론임을 유지한다.
2. [독립 action 감사](evidence/run004/v7-v2-action-audit.json)와 [root 검토](evidence/run004/v7-v2-action-root-review.json)의 accepted 6건·expected 3건·SMU 과제 영향 및 로그인 2건의 계약 모호성을 별도로 보존한다. 후속 개발 정정본은 근거·범위를 분리하고 원본과 첫 점수를 덮어쓰지 않는다.
3. 컴퓨터 유즈를 사용하지 않는다. 실제 발화·확대·현재 후보 설치·정식 실증·[1인 사전 시험](PRETEST.md)은 실제 관찰이 올 때만 기록한다.

## 실행 기록

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

> WORK_SPEC·PROGRESS·RUN_004_REPORT를 읽고 현재 45페이지에 맞춘 라벨 추가가 아니라 범용 카드·탭·제목과 제어를 연결하는 근거 개선부터 이어서 진행해줘. v0.5 동결과 v7-v2 첫 raw 6/12·4/15·과제 추천 1/5 FAIL을 보존해. 독립 감사가 accepted action 충돌 6건·expected 3건·SMU 과제 영향을 확인했으나 이번에는 정정·재계산·재평가하지 않았고 로그인 2건은 모호성이 남는다. 원본 점수를 순수 제품 일반화 품질로 단정하지 마. 알려진 45페이지는 개발 자료이며 원본 v7/v2의 같은 5페이지를 10개로 세지 마. v6 category v1/fixture v2·관찰자 교체·root 복원 판단도 보존해. 완료 5/10·NOT_MET은 공수 비율이 아니다. 컴퓨터 유즈를 재개하지 말고 실제 설치·발화·확대·1인 시험·정식 실증은 관찰이 올 때만 기록해. 25분 57초는 기술 검증·정적 감사 관찰 경계이고 전체 작업 시간이 아니며 계정 토큰·비용은 UNKNOWN이야.
