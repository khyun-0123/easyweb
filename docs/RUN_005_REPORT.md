# RUN-005 · v0.6.0 개발 후보 검증 기록

2026-10-18 (한국 시간) · 최종 검증·산출물 인계

**완료 4/10 · 전체 인수 NOT_MET.** 최종 로컬 222/222와 성능·자동 접근성은 통과했지만 새 blind-v8 첫 결과는 **정확 10/17(58.8%)·재현 4/15(26.7%)·과제 추천 1/5, 모든 5사이트 FAIL**이다. 명시적 다운로드 제어의 식별 누락 2건으로 S05를 IN_PROGRESS/NEEDS_FIX로 재개했고 S06/S08/S09의 실제 확인도 남았다. [진행표](PROGRESS.md) · [이전 RUN-004](RUN_004_REPORT.md)

## 변경과 수정 전 이력

카드의 고정 제목·외부 관련 제목 `relatedLabel`·탭 읽기 문맥을 제어와 연결하고, 구체적인 발급 준비·학사 달력 등 목적을 일반 안내 문맥보다 우선하도록 보강했다. 원본 근거 과제와 분류 다양성을 먼저 선택한 뒤 이미 분류된 서로 다른 후보로 빈 자리를 최대 6개까지 채운다. threshold·최대 6개·권한·action 정책은 유지했다. 분류당 3개 선택 제한의 빈 자리 결함과 RUN-004의 전체 6개 한도 진단은 별개다.

초기 범용 9회귀는 8실패·1통과에서 9/9 통과, 순위 4회귀는 3실패·1통과였다. 최초 통합 80/83의 옛 3카드 UI 가정 3개를 6개로 수정한 뒤 capacity+more-menus 15/15가 통과했다. 이 중간 결과를 최종 전체 검사로 사용하지 않는다.

- 첫 전체 204개 통과 뒤 독립 코드 검토가 aside 경계 밖 제목 차용을 재현했다. 새 반례 4개는 수정 전 3실패·1통과였고 semantic/html/body/main 경계에서 제목 탐색을 멈추도록 고쳤다. [검토 해결](evidence/run005/code-review-resolution.json) · [204개 검사 보존](evidence/run005/before-code-review-fix/)
- 이후 208개 통과·첫 v0.6 동결 뒤 기존 v3 발급 준비와 실사이트 달력 분류 회귀(공개 과제 14/15)를 발견했다. 새 blind-v8을 읽거나 실행하기 전에 구체 목적 우선 규칙과 반례를 보강했다. [재동결 경계](evidence/run005/pre-first-engine-revision.json) · [208개·개발/live 검사 보존](evidence/run005/before-development-regression-fix/). 첫 ZIP과 v1 동결·아카이브도 보존했다.

## 최종 소스와 확인 결과

[최종 14파일·아카이브 동결 v2](evidence/run005/v0.6-engine-freeze-v2.json)는 **03:25:20 KST / UTC 18:25:20.245610**이다. root·구현자는 동결 전 v8 본문·URL·정답 내용을 읽지 않았다. v1과 수정 전 증거를 덮어쓰지 않았다.

| 항목 | 최종 확인과 한계 |
| --- | --- |
| 타입·빌드·로컬 | [222/222 PASS](evidence/run005/local-verification.json), 실패·flaky·skipped 0, 테스트 32,040.867ms. 독립 품질·native 설치·사람 실증의 대체가 아님 |
| core 개발 회귀 | 정확 **72/74(97.3%)**·재현 **45/45**·과제 추천 **15/15**, 품질 PASS. 일반 문맥 확대의 오탐 2개도 포함하며 노출 자료의 회귀임 |
| 자동 접근성 | [21조건](evidence/run005/a11y-automated.json), 오류·위반·incomplete·넘침·타깃·대비 미달 0. 실제 발화·브라우저 확대와 별개 |
| 합성 성능 | 각 10표본·warmup 제외, p95 분석/준비: [mixed](evidence/run005/performance.json) **27.3/58.6ms**, [flat](evidence/run005/performance-flat.json) **39.7/95.7ms**, [table](evidence/run005/performance-table.json) **88.9/164.9ms**. 300/1,000ms 기준 PASS. 실제 로딩/native 제외, 10표본 p95는 표본 최대값 |
| 노출 자료 9suite 개발 재평가 | [최종 요약](evidence/run005/final-development/summary.json), sourceStable=true. 아래 표 참조, 새 독립 평가가 아님 |
| 실사이트 공개 과제 | [최종 15/15 PASS](evidence/run005/tasks-live-final.json), HTTP 목적지9·원본 안내6·재시도/관찰 오류0. 같은 v2 동결. 이전14/15 보존, 인증/신청 업무 완료·사람 실증·설치 확장 검사가 아님 |
| 후보 ZIP·재현성 | [v0.6 ZIP](../output/run005/EasyWeb-0.6.0-candidate.zip) **315,166bytes**, SHA256 `6ddd10dd9dd509fb7e65e84c2eb135bb97b39b445d2b28458dd92366984404a2`. 두 빌드/ZIP 동일·sourceStable. [메타데이터](../output/run005/EasyWeb-0.6.0-candidate.json). [산출물 최종 검토 PASS](evidence/run005/final-review.json), 해시305비교/불일치0·검사시점405로컬링크/깨짐0·ZIP5entry 바이트 일치. 품질 인수의 대체가 아님 |
| 수동 확인실 | [3경로 HTTP200·바이트 동일](evidence/run005/manual-fixture-final.json)만 확인. UI·스크립트·사람 시험은 실행하지 않음 |
| native·사용자 | 컴퓨터 유즈 0. 실제 설치·VoiceOver 발화·실제 브라우저 확대 NOT_RUN, 1인 사전 시험·정식 실증 각 0 |
| 관찰 구간 | [계측 경계](evidence/run005/goal-usage-snapshot.json): **03:10:33→03:31:44 KST / UTC18:10:33→18:31:44, 1,271초(21분11초)**. 이전 준비/분담과 이후 문서·산출물검토·commit 제외. 전체 RUN-005 경과가 아님 |
| 도구 누적·비용 | 누적counter **6,672,859tokensUsed / 8,825초**, RUN-004 대비 **1,168,622 / 1,559초**는 누적counter 차분일 뿐 이번 고유 사용량·생성/청구 토큰이 아님. 전체 실제 경과·계정 입력/출력/캐시/추론/청구 토큰·비용 **UNKNOWN** |

## 노출 자료 개발 재평가

같은 최종 동결 소스로 실행한 [9suite](evidence/run005/final-development/summary.json)의 최초 화면이다. 과거 독립 첫 실패를 대체하지 않는다.

| suite | 정확 | 재현 | 과제 추천 | 품질 |
| --- | --- | --- | --- | --- |
| v2 | 22/22 | 11/11 | 5/5 | PASS |
| v3 | 18/18 | 11/11 | 5/5 | PASS |
| v4 정정 | 15/15 | 13/13 | 5/5 | PASS |
| v5 | 24/25 | 13/15 | 5/5 | FAIL |
| v6 원본 | 25/26 | 11/15 | 4/5 | FAIL |
| v6 category v1 | 26/26 | 12/15 | 4/5 | FAIL |
| v6 fixture v2 | 26/26 | 14/15 | 5/5 | FAIL / city2/3 |
| v7-v2 원본 | 13/18 | 11/15 | 4/5 | FAIL |
| v7 action 정정 | 13/18 | 11/15 | 4/5 | FAIL |

v6 fixture v2 추가 메뉴는 **41/41·15/15·5/5**, unresolved0이지만 첫 화면 city2/3 미달을 대체하지 않는다. v7 원본/정정본 추가 메뉴는 둘 다 **13/18·11/15·4/5**, unresolved1이며 category·매핑 미해결을 action 정정만으로 통과 처리하지 않는다.

## 독립 최초 결과와 데이터 경계

[blind-v8 첫 결과](evidence/run005/blind-v8-first/evaluation-current-blind-v8-holdout.json)는 UTC **18:25:41.668686→18:25:42.472586**, exit 1이며 같은 최종 동결 소스를 사용했다. 최초 화면은 **10/17·4/15·1/5 FAIL**, 추가 메뉴 표시도 **11/19(57.9%)·5/15(33.3%)·1/5**로 별도 기록한다. unresolvedMappings 0·repeatedCards 0이며 추가 메뉴가 첫 화면 인수를 대신하지 않는다. static QA 320/320(전체 89제어, accepted 50/rejected 39)은 작성자 보고로서 제품 품질·전체 페이지 재현의 증거가 아니다.

알려진 페이지는 이제 **50개 = 기존 45+새 v8 5**다. v7 원본/v2/정정본은 같은 5페이지이며 추가 0개다. 첫 결과를 본 v8의 후속 재평가는 개발용이다. RUN-004 v7-v2 첫 raw **6/12·4/15·과제 1/5 FAIL**과 action 주석 충돌의 해석 한계, RUN-002/003/004 원본 보고서·첫 실패·동결·ZIP을 보존한다.

[v7 action 정정본](../evaluation/development-v7-corrected/VERSION.json)은 **ADJUDICATED_DEVELOPMENT / freshHoldout=false**이며 accepted 6·expected 3·SMU task 2의 **11필드만** 정정했다. [정적 검증](evidence/run005/v7-adjudication/validation.json)과 [프로토콜 10/10](evidence/run005/v7-adjudication/protocol-tests.log)은 fixture 5개 바이트 동일·원본 freeze 11입력 해시·기타 의미 필드 보존을 확인했다. 로그인 2건과 미주석 검색 입력은 미해결이다. 이 정정 작업은 제품 실행이나 최초 점수 재계산이 아니며 후속 개발 평가는 원본 첫 판정을 대체하지 않는다.

## 남은 인계와 다음 작업

[산출물 최종 검토](evidence/run005/final-review.json)는 PASS이며 과거 증거·첫 v8 FAIL 보존도 확인했다. 산출물 무결성 검사가 S05/S07 실패나 실제 검증 미실시를 해소하지 않는다.

v8의 `/cmm/fms/FileDown.do`와 `i.ir-download`가 함께 있는 2개 제어를 navigate로 처리한 식별 누락은 S05의 명시적 다운로드 원본 안내 요구에 대한 미해결 반례다. [root 판정](evidence/run005/file-download-root-review.json)에 따라 S05를 IN_PROGRESS/NEEDS_FIX로 재개해 초기 5/10 판정을 현재 4/10으로 정정한다. 응답 MIME/body는 미관찰이며 실제 파일 실행·피해를 주장하지 않는다. 기존 core/live15 통과는 정해진 과제 범위로 이 2건의 수행 결과가 아니다.

다음 첫 작업은 별도 v0.7에서 FileDown 경로와 다운로드 아이콘의 결합 근거를 보수적인 locate로 식별하고 일반 반례·유사 일반 링크 반례·stale 회귀로 검증하는 것이다. 그 뒤 범용 규칙과 명세가 허용하는 기관별 adapter를 분리 평가한다. 현재 동결·첫 결과는 보존한다. 실제 설치·보조기술·사용자 검증은 [PRETEST.md](PRETEST.md) 등 기존 절차에 따라 실제 관찰이 올 때만 기록한다.
