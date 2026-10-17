# 현재 검증: RUN-007 · v0.8.0

**완료5/10 · 인수NOT_MET.** [현재 보고서](RUN_007_REPORT.md): 로컬311/311, 자동접근성21조건 미달0, 합성성능3종과 실제 공개과제15/15 PASS. 기관1000제어의 기존 분석/준비 기준도PASS지만 전체pipeline300ms 추가진단은413.8ms로FAIL이다.

알려진50페이지 기관모드227/231정확·139/140재현은 개발 결과다. [새v9-v2 첫 평가](evidence/run007/blind-v9-v2-first-evaluated/evaluation-current-institution-blind-v9-v2-holdout.json)는26/30·2/15·0/5 FAIL, 추가60/73·5/15·2/5와 분리한다. 고유55페이지가 노출됐고 원본·정정판·첫FAIL을 모두 보존한다. 현재0.8 실제 설치·발화·확대NOT_RUN, 1인/정식실증 각0건. [패키지](../output/run007/EasyWeb-0.8.0-candidate.json) · [최종검토](evidence/run007/final-review.json)

---

# EasyWeb 검증 기록

## RUN-006 · v0.7.0 / 다운로드 안전 반례 해결

**현재5/10 · 전체 NOT_MET.** [보고서](RUN_006_REPORT.md)와 [S05 판정](evidence/run006/s05-resolution-root-review.json)을 따른다. 로컬237/237, 독립6/6·별도title9조건, 원본 두 다운로드 제어의 locate/직접href없음, 자동접근성21조건, 합성성능3종, 기존 공개과제15/15를 확인했다. 원본 클릭·실제 파일 실행·사람 성공을 주장하지 않는다.

core 개발 정확72/74·재현45/45는 통과했으나 v8 개발 재평가11/16·5/15·2/5는 FAIL이다. 최초 독립10/17·4/15·1/5와 모든 원본·동결·이전ZIP은 보존한다. 현재0.7 실제 설치·VoiceOver 발화·브라우저 확대는 NOT_RUN, 사전시험/정식실증 각0건이다. [개발 전체](evidence/run006/development/summary.json) · [자동 검사](evidence/run006/a11y-automated.json) · [공개 과제](evidence/run006/tasks-live-final.json) · [패키지](../output/run006/EasyWeb-0.7.0-candidate.json) · [무결성](evidence/run006/final-review.json)

아래는 각 실행 당시의 과거 기록이며 현재 단계 판정과 구별한다.

## RUN-005 · v0.6.0 / 독립 최초 품질 FAIL

2026-10-18 (한국 시간). [보고서](RUN_005_REPORT.md) · [진행표](PROGRESS.md)

**완료 4/10 · 인수 NOT_MET.** 명시적 다운로드 식별 누락 2건으로 S05를 재개했다. 로컬 최종 검사는 통과했지만 blind-v8 첫 화면 품질은 모든 5사이트 FAIL이다. 헤드리스 fixture·합성 검사·공개 과제·native 설치·사람의 성공을 구별한다.

| 항목 | 확인한 결과와 범위 |
| --- | --- |
| 최종 소스 동결 | [v2 14파일·아카이브](evidence/run005/v0.6-engine-freeze-v2.json), **03:25:20 KST / UTC18:25:20.245610**. root/구현자는 동결 전 v8 본문·URL·정답 미열람. v1 보존 |
| 수정 전 이력 | 초기 204개 PASS 뒤 aside 경계 밖 제목 차용을 발견·수정. 208개 PASS 뒤 기존 개발의 발급 준비·live 학사 달력 분류 회귀로 14/15가 되어 v8 미열람·첫 실행0 상태에서 재수정. [204 보존](evidence/run005/before-code-review-fix/) · [208·개발/live·ZIP 보존](evidence/run005/pre-first-engine-revision.json) |
| 타입·빌드·로컬 | [최종 222/222 PASS](evidence/run005/local-verification.json), 실패·flaky·skipped0, 테스트32,040.867ms. 중간204/208을 최종으로 쓰지 않음 |
| core 개발 회귀 | 정확 **72/74(97.3%)**·재현 **45/45**·과제 추천 **15/15**, 품질 PASS. 오탐2개 포함. 이미 노출된15페이지의 축약 fixture 회귀 |
| 자동 접근성 | [21조건](evidence/run005/a11y-automated.json), 오류·위반·incomplete·넘침·타깃·대비 미달0. 실제 VoiceOver 발화·브라우저 확대와 별개 |
| 합성 성능 | 각10표본·warmup 제외, p95분석/준비 [mixed](evidence/run005/performance.json) **27.3/58.6ms**, [flat](evidence/run005/performance-flat.json) **39.7/95.7ms**, [table](evidence/run005/performance-table.json) **88.9/164.9ms**. 300/1,000ms 기준 PASS. 실제 로딩/native 제외, p95는10표본 최대값 |
| v8 독립 최초 | [첫 결과](evidence/run005/blind-v8-first/evaluation-current-blind-v8-holdout.json), UTC18:25:41.668686→18:25:42.472586·exit1. **정확10/17(58.8%)·재현4/15(26.7%)·과제추천1/5, 모든5사이트 FAIL**. 같은 최종 동결 사용 |
| v8 추가 메뉴 | 정확 **11/19(57.9%)**·재현 **5/15(33.3%)**·과제추천 **1/5**, unresolvedMappings0·repeatedCards0. 첫 화면 인수를 대체하지 않음 |
| v8 static QA | 작성자 보고320/320, 전체89제어 accepted50/rejected39. 제품 품질·전체 사이트 재현·사람 성공의 증거가 아님 |
| v7 정정본·프로토콜 | [VERSION](../evaluation/development-v7-corrected/VERSION.json)은 **ADJUDICATED_DEVELOPMENT / freshHoldout=false**, accepted6·expected3·SMU task2의11필드. [정적 검증](evidence/run005/v7-adjudication/validation.json)·[10/10](evidence/run005/v7-adjudication/protocol-tests.log): fixture5개 동일·원본freeze11입력 SHA 보존. 로그인2건/미주석 검색 입력 미해결 |
| 실사이트 공개 과제 | [최종15/15 PASS](evidence/run005/tasks-live-final.json), HTTP9·원본안내6·재시도/관찰오류0. 최종v2동결 일치. 이전14/15 보존, 사람 업무 성공·인증/신청 완료·설치확장 검사와 별개 |
| 후보 패키지 | [ZIP](../output/run005/EasyWeb-0.6.0-candidate.zip)315,166bytes·SHA256 `6ddd10dd9dd509fb7e65e84c2eb135bb97b39b445d2b28458dd92366984404a2`, 두 빌드/ZIP 동일·sourceStable. [메타](../output/run005/EasyWeb-0.6.0-candidate.json). [산출물 최종 검토 PASS](evidence/run005/final-review.json), 해시305비교/불일치0·검사시점406링크/깨짐0·ZIP5entry동일·과거체크포인트/첫v8FAIL보존. 인수 통과와 별개 |
| 수동 확인실 | [3경로](evidence/run005/manual-fixture-final.json) HTTP200·바이트 동일만 확인. 실제 UI·스크립트 실행·사람 관찰0 |
| S05 다운로드 반례 | `/cmm/fms/FileDown.do` + `i.ir-download`인 2개 명시적 제어가 navigate로 처리됨. [root 판정](evidence/run005/file-download-root-review.json)에서 원본 안내 요구 미충족으로 IN_PROGRESS/NEEDS_FIX, 현재4/10. MIME/body·실제 실행/피해 미관찰. core/live15는 해당2건 수행 증거가 아님 |
| 개발9suite | [최종 요약](evidence/run005/final-development/summary.json)·sourceStable=true. v2/v3/정정v4 PASS. v5 24/25·13/15·5/5 FAIL. rawv6 25/26·11/15·4/5, category1 26/26·12/15·4/5, fixture2 26/26·14/15·5/5 모두 FAIL. rawv7-v2/정정v7 둘 다13/18·11/15·4/5 FAIL |
| 개발 추가 메뉴 | v6fixture2 41/41·15/15·5/5·unresolved0, v7두버전13/18·11/15·4/5·unresolved1. v6fixture2 첫 화면city2/3 등 첫 품질 미달을 대체하지 않음 |
| 관찰 경계 | [스냅샷](evidence/run005/goal-usage-snapshot.json): **03:10:33→03:31:44 KST / UTC18:10:33→18:31:44, 1,271초(21분11초)**. 이전 준비·분담과 이후 최종문서·산출물검토·commit 제외. 전체 RUN-005 경과 아님 |
| 누적counter·비용 | 6,672,859tokensUsed/8,825초, RUN-004대비1,168,622/1,559초 차분은 이번 고유·생성·청구량 아님. 계정 입력/출력/캐시/추론/청구 토큰·비용과 전체 실제 경과 UNKNOWN |
| native·사용자·계측 | 컴퓨터 유즈0. 실제 설치·발화·브라우저 확대 NOT_RUN, 1인시험0·정식실증0. 전체 실제 경과·계정 토큰·비용 UNKNOWN |

알려진 자료는 **50페이지 = 기존45+v8의5**다. v7 원본/v2/정정본의 같은5페이지는 한 번만 센다. v8 첫 FAIL을 본 후 재평가는 개발용이다. RUN-004 원본 첫6/12·4/15·과제1/5 FAIL과 주석 충돌의 해석 한계를 보존하며 v7 정정 작업의 정적 검증은 최초 점수 재계산이 아니다.

## RUN-004 · v0.5.0 / 독립 품질 FAIL 이력

2026-10-18 (한국 시간). [전체 보고서](RUN_004_REPORT.md) · [진행표](PROGRESS.md)

**완료 5/10, S07 품질 인수 FAIL.** 같은 동결 엔진의 v7-v2 첫 결과는 정확 6/12·재현 4/15·과제 제어 추천 1/5로 모든 사이트가 미달했다. 이후 독립 감사가 accepted action 충돌 6건·expected 3건·SMU 과제 영향을 확인했다. 원본 점수는 그 주석 오류를 포함하며 보정 점수는 미산정이다. 최초 점수·FAIL을 보존하고 정정·재계산·재평가는 하지 않았다. 단계 수는 공수 비율이 아니다.

| 항목 | 결과와 범위 |
| --- | --- |
| 소스 동결 | [14개 파일·아카이브](evidence/run004/v0.5-engine-freeze.json), UTC 17:53:53.116468/02:53:53 KST. root/구현자는 그 전에 v7 본문 미열람. 첫 평가 후 소스 변경·재실행 없음 |
| v6 category v1 | category 5필드만 정정. 그 외 의미 차이 0·fixture 5/5 바이트 동일·원본 11파일 유지. [버전](../evaluation/development-v6-corrected/VERSION.json) · [검증](evidence/run004/v6-correction-validation.json) |
| v6 fixture v2 | v1 category 유지. city 3행에 빈 td 9개·fixture 경로 1곳만 복원해 실제 5열·제목 index 1·첨부 index 3 일치. 기존 제어·정답·과제, 원본 11파일·v1 전체 11파일 유지. [버전](../evaluation/development-v6-corrected-v2/VERSION.json) · [검증](evidence/run004/v6-fixture-fidelity-validation.json) |
| 타입·빌드·로컬 | **189/189 PASS**, 실패·flaky·skipped 0. 범용 13개·caption 3개·manual 옵션 1개 회귀 추가. 옵션 검사는 사람 시험이 아님. [기록](evidence/run004/local-verification.json) |
| core 개발 회귀 | 정확 **69/69**·재현 **45/45**·과제 추천 **15/15**. [노출 자료의 결과](evidence/run004/core-regression/evaluation-current-all.json) |
| 자동 접근성 | **21조건**, 오류·위반·incomplete·넘침·타깃·대비 미달 0. 실제 VoiceOver 발화·브라우저 확대·전체 적합성 판정과 별개 |
| 합성 성능 | 각 10샘플·총 30. p95 분석/준비 mixed 1,000제어 **27.5/57.8ms**, flat 1,000제어 **39.6/78.4ms**, table 500행×2제어 **89.6/146.4ms**. 300/1,000ms 기준 PASS. 실제 로딩/native 제외 |
| 도구 첫 실패 | root 184/185의 mock 1개 실패는 가짜 benchmark fixture의 새 shape 파일 누락. [원본](evidence/run004/first-integration-tool-mock-failure/) 보존·수정 후 target PASS·최종 189/189 |
| 개발 재평가 | [요약](evidence/run004/final-development/summary.json): raw v6 **21/22·11/15**, category v1 **22/22·12/15**, fixture v2 **24/24·14/15·5/5**. 모두 FAIL이며 v2는 city **2/3(66.7%)**가 사이트 75% 기준 미달 |
| v6 추가 메뉴 표시 | 정확 **41/41**·재현 **15/15**·과제 추천 **5/5**, unresolved/repeated 0. caption으로 동명 자료 3개 구별. 첫 화면 판정·초기 순서·label/href/action 유지 |
| 다른 개발 자료 | v5 첫 화면 **16/17·8/15 FAIL**, 추가 메뉴 **26/27·14/15**. core·v2·v3·정정 v4 개발 PASS. 과거 독립 첫 실패를 대체하지 않음 |
| v7 복원 판단 | 구 감사는 category/action 오류 0·좁은 fixed-control 평가 허용 가능으로 보았음. root는 32/32 조상 평탄화·heading/form 변환을 S07 일반화 증거로 약하다고 판단해 [v2 재구성](evidence/run004/v7-fidelity-decision.json) 선택. 감사자의 필수 승인 요구가 아님 |
| v7-v2 복원 범위 | 같은 5페이지·15기대·32accepted. 조상 342항목·순서 32/32·HTTP 16/16·AX role/target 32/32·AX name 정확 29/32, 공백 제외 32/32. [자료 동결](evidence/run004/blind-v7-v2-freeze.json) SHA256 `c0a385e0…`. 전체 사이트/설치 입증은 아님 |
| v7-v2 최초 평가 | [첫 결과](evidence/run004/blind-v7-v2-first/evaluation-current-blind-v7-v2-holdout.json): **정확 6/12(50%)·재현 4/15(26.7%)·과제 추천 1/5**, 모든 5사이트 FAIL. 03:02:06 KST 종료·exit 1·sourceFreezeMatched=true |
| v7-v2 추가 메뉴 | **6/12·4/15·1/5**, unresolvedMappings 1·repeatedCards 0. 첫 화면과 별도이며 품질 미달을 해소하지 못함 |
| v2 action 독립 감사 | [감사](evidence/run004/v7-v2-action-audit.json)·[root 검토](evidence/run004/v7-v2-action-root-review.json): city 예약 안내 1건 navigate→locate, SMU 다른 문서 fragment 5건 locate→navigate. expected 3건·SMU 과제 영향. 별도 개발 정정 후보 승인만 했고 데이터/점수/평가 미변경. 로그인 2건은 계약 모호성 |
| 자료 수·관찰 경계 | 알려진 **45페이지** = 기존 40+새 5. 원본 v7 실행 0회, v2가 같은 5페이지의 최초 평가이며 두 버전을 10페이지로 세지 않음. [관찰자 교체 사건](evidence/run004/v7-observer-boundary-incident.json) 보존 |
| 실제 공개 과제 | 같은 동결 소스로 **15/15 PASS**, HTTP 9·원본 안내 6·재시도/관찰 오류 0. [기록](evidence/run004/tasks-live-final.json). 인증/신청 업무 완료나 사람 실증이 아님 |
| 후보 ZIP | [v0.5.0 ZIP](../output/run004/EasyWeb-0.5.0-candidate.zip), **275,816bytes**, SHA256 `aa94ee22…`. 두 빌드/ZIP 동일·sourceStable·현재 14파일 동결 일치. 개발 후보 |
| 산출물 검토 | [PASS](evidence/run004/final-review.json), 해시 불일치·깨진 로컬 링크 0, ZIP 5entry 바이트 일치·RUN-002/003 보존. 최종 개수는 해당 JSON 기준 |
| 수동 확인실 | [3경로](evidence/run004/manual-fixture-final.json)의 HTTP 200·바이트 일치만 확인. 실제 사람 시험 0 |
| native·사용자 | 컴퓨터 유즈 0. 실제 설치·VoiceOver 발화·브라우저 200/400% 확대 미검증. 정식 실증 0·1인 시험 0 |
| 시간·토큰 | [계측](evidence/run004/goal-usage-snapshot.json): 02:39:51→03:05:48 KST, **1,557초(25분 57초)**의 기술 검증·정적 감사 관찰 경계. 전체 시작/경과가 아니며 이후 문서 마감·commit 제외. 누적 counter 5,504,237/7,266초와 이전 대비 1,243,365/1,691초 차분은 이번 고유/생성/청구량 아님. 계정 토큰·비용 UNKNOWN |

정정본은 `ADJUDICATED_DEVELOPMENT`이며 최초 실패를 대체하지 않는다. 첫 화면과 추가 메뉴, 개발 재평가와 독립 첫 평가, 헤드리스 관찰과 사람의 실제 성공을 구별한다. 구 v7 오류 0 감사는 구 fixture 대상이다. v2의 같은 문서 fragment인 smu-second는 locate이며 about:blank parity와 실제 URL의 평가 문맥을 혼동하지 않는다. [정적 원인 진단](evidence/run004/v7-failure-diagnosis.md)은 분류 전 trace가 아닌 코드 경로 추론이다. 첫 6개 제한보다 범용 카드·탭·제목 연결과 action 계약을 먼저 다룬다. unresolved 1건은 accepted에 없는 실제 검색 입력의 매핑이며 입력값 유출 증거가 아니다. 문서 담당자는 제품 검사나 소스 변경을 실행하지 않았다.

아래는 각 과거 버전의 기록이다. 현재 인수 판정과 혼용하지 않는다.

## v0.4.0 · RUN-003 이력

2026-10-18 (한국 시간). [전체 보고서](RUN_003_REPORT.md) · [진행표](PROGRESS.md) · 최종 소스 동결 02:34:37 KST

**완료5/10, 개발 후보이며 인수 미통과다.** v5/v6 독립 첫 재현율 미달, 실제 보조기술·브라우저 확대·설치·사용자 관찰이 남는다. 아래는 최종 고정 소스의 수치다.

| 항목 | 확인한 결과와 한계 |
| --- | --- |
| 타입·빌드·로컬 | **172/172**,실패/flaky/skip0. [요약](evidence/run003/local-verification.json) |
| core 개발용 | 정확69/69·재현45/45·과제제어추천15/15. 이미 노출된 자료의 회귀 |
| 새 독립 첫 결과 | v5(v0.3)정확7/8·재현4/15, v6(첫v0.4)정확9/9·재현5/15. 두 결과 모두 미달, 첫 엔진/자료/결과 보존 |
| 추가 메뉴 UI 표시 | v6 실제 헤드리스 추가 메뉴 경로 정확13/13·재현5/15. 첫화면9/9·5/15를 대체하지 않고 링크/원본 안내 실행이나 사람 성공이 아님 |
| 실제 공개 과제 | **최종15/15**,목적지9·원본안내6·재시도0·관찰오류0. 첫14/15 회귀 원본 보존. 인증/신청 업무 완료나 사람 실증 아님. [기록](evidence/run003/tasks-live-final.json) |
| 자동 접근성 | **21조건**,위반/오류/incomplete/넘침/48px타깃/대비미달0. 첫 대비 incomplete1을 보존하고 전체 dialog 대비를 별도로 재검사. [원시값](evidence/run003/a11y-automated.json) |
| 합성 성능 | 1천혼합제어10회 p95분석 **248.1ms**,화면준비 **276.5ms**. headless Chromium·warmup1회제외·실제사이트로딩/native툴바제외. [원시값](evidence/run003/performance.json) |
| native/보조기술 | v0.4 실제 설치·단축키·실제브라우저200/400%확대·VoiceOver발화 **NOT_RUN**. 사용자 요청에 따라 UI자동화 중단 유지; v0.3부분관찰 전이 금지 |
| 수동 확인실·실증 | 최종v0.4의127.0.0.1:4183 HTTP3/3응답200·로컬바이트일치,브라우저/스크립트실행없음. [최종HTTP증거](evidence/run003/manual-fixture-final.json). 이전v0.3준비기록도보존. 사람시험0·정식실증NOT_RUN |
| 후보 패키지 | 최종v0.4 ZIP SHA256 `feac9d08…`,239945bytes·두빌드/ZIP동일·소스안정·원래Manifest일치. [보고서](../output/run003/EasyWeb-0.4.0-candidate.json). DEVELOPMENT_CANDIDATE이며 전체 인수 미통과 |
| 시간·토큰 | RUN-003시작별도계측없어경과UNKNOWN. 목표도구누적4,260,872tokensUsed/5,575초는이전작업포함·이번묶음별도사용량아님. 입력/출력/캐시/청구토큰·금액UNKNOWN. [집계범위](evidence/run003/goal-usage-snapshot.json) |

추가 메뉴는 첫 화면 밖 후보로 가는 경로다. 첫 화면 품질을 추가 메뉴 합집합으로 바꾸거나, RUN-003 당시 알고 있던 40페이지 재평가를 새 독립 검증으로 표시하지 않는다. `npm run verify` PASS도 S06~S10 전체 인수 통과가 아니다. [RUN-003 당시 인수 판정 5/10·NOT_MET](evidence/run003/release-gate.json)

초기 전체169개 중4건의 접근성 검사 실패는 숨긴 이전 메뉴도 AX에 나와야 한다는 검사 오류였다. 실제 숨김 제어가 AX에서 제외되는지를 확인하도록 고친 후170개가 통과했고, 실제 공유 제어 회귀를 추가한 최종172개도 통과했다. 별도 평가 프로토콜5/5도 통과했다. [최초 실패 보존](evidence/run003/verify-first-integration-failure/local-verification.json)

아래 RUN-002와 이전 기록은 당시 버전의 이력이다. 최신 v0.4의 native 설치나 사용성 결과로 사용하지 않는다.

## v0.3.0 · RUN-002 이력

2026-10-18 (한국 시간). [전체 보고서](RUN_002_REPORT.md) · [진행표](PROGRESS.md) · 기술 검증 기록 기준 02:04:05 KST

**개발 후보이며 v1.0 인수 미통과다.** 로컬 회귀와 개발 자료의 결과가 좋아졌지만, 독립 페이지 재현율·실제 VoiceOver 발화·일부 native 재실행 경로·정식 사용자 실증이 남아 있다.

| 항목 | 확인한 결과와 한계 |
| --- | --- |
| 타입·빌드·로컬 회귀 | **최종128/128**, 실패·flaky·skip0. 같은 고정 소스의 검사. [요약](evidence/run002/local-verification.json) |
| 액션·원본 복구 | 일반 링크 직접 이동은 사용자 선택. 명시적 JS/팝업/다운로드/인증은 원본 안내. 자동 click/submit 없음. 가림·화면 밖·초점 중 변경·후속 스타일 보존·안내창 정리 회귀. [정책](ACTION_POLICY.md) |
| 입력 보호 | 편집 영역·사용자 입력은 읽지 않고 정적 메뉴 문맥 사용. 숨긴 문맥·역할 대소문자·현재성 변경·읽기 금지 getter 검사 |
| core 개발용 전체 | 정확도 69/69, 재현율 45/45, 과제 제어 추천 15/15. 이미 사용한 축약 자료이며 실제 전체 사이트 품질 아님 |
| 독립 첫 평가 | 원래 holdout 8/15(53.3%), blind-v2 5/11(45.5%), v3 4/11(36.4%), v4 5/13(38.5%) 재현. 미달 원본과 엔진 보존. v4 정확도 7/8(87.5%). 정답 항목 1건 search→apply를 별도 개발용 정정 버전으로 보존. 첫 원본 판정 유지 |
| 실제 공개 과제 | **최종15/15 도달**, 공개 목적지9·원본 안내6·재시도0. 중간14/15 퇴행도 priorSnapshots에 보존. 공개 목적지/원본 초점이며 인증·신청 업무 완료나 사람 실증 아님. [기록](evidence/run002/tasks-live-final.json) |
| 접근성 자동 | 17조건 위반·serious/critical·incomplete·넘침·48px 미만 타깃·대비 미달 0. [원시 결과](evidence/run002/a11y-automated.json). 전체 적합성 판정 아님 |
| native 확대·VoiceOver | 이전 해시의 예비 설치본에서만 200/400% 확대·Tab 확인, 최종 빌드 통과로 이전하지 않음. VoiceOver 켜기/초점 시도 후 원래 OFF 복원, 실제 발화·상태 안내 미확인. S06 미통과 |
| 합성 성능 | 1천 혼합 제어·10회 p95 분석119.4ms, 화면 준비135.7ms. headless Chromium·표본10개·제3자 로딩 제외. [환경/원시값](evidence/run002/performance.json) |
| 실제 설치 | 최종 빌드·원래 Manifest 재로드, 5기관6/2/5/6/6카드·Esc후AX제목부재, 제한 페이지 오류/일반 페이지 복구 확인. 단축키·새로고침·페이지 이동 후 재실행은 미판정. 사용자 요청으로 UI 자동화 중단. **S08 PARTIAL/NEEDS_MANUAL**. [최종 기록](evidence/run002/native-ui-final.json) |
| 작업 계측 | 시작01:04:05→기술 기록마감02:04:05 KST,60분. 목표 도구 집계2,243,533 tokensUsed/3,571초이며 계정 청구량 아님. 청구 토큰·비용과 입력/출력/캐시 세부 UNKNOWN. [스냅샷](evidence/run002/goal-usage-snapshot.json) |
| 후보 ZIP | v0.3.0, 두 빌드·두 ZIP 동일·원래 Manifest 일치·SHA256 확인. [패키지 보고서](../output/run002/EasyWeb-0.3.0-candidate.json). DEVELOPMENT_CANDIDATE이며 전체 인수 미통과 |
| 실제 사용자 | 정식 실증 NOT_RUN, 실제 관찰0. 1인 사전 테스트 준비. 빈 실증 양식 분석은 사용성 효과 증거가 아님 |

`npm run verify`는 로컬 회귀·core 개발용 평가·합성 성능만 재생성한다. 실패를 본 뒤 수정한 자료의 재평가를 새 독립 검증으로 계산하지 않는다. API 모형, localhost 권한 추가 확장 검사, CDP isolated-world 실사이트 검사, 원래 Manifest의 native 도구 모음 클릭, 실제 사용자 관찰은 서로 다른 증거다.

아래 v0.2/v0.1 기록은 당시 확인 범위를 남긴 이력이다. 그 안의 “미실시/다음 작업/현재” 표현은 해당 시점 기준이며 최신 판정은 이 절과 RUN-002 보고서를 따른다.

## v0.2.0 · RUN-001 이력

2026-10-17 (한국 시간). [전체 보고서](RUN_001_REPORT.md) · [진행표](PROGRESS.md)

| 항목 | 결과와 한계 |
| --- | --- |
| 타입 검사·빌드 | 통과 |
| 자동 테스트 | **46/46 통과**, [로그](evidence/run001/tests.log) |
| 입력 보호 | native/custom 편집 제어·실제 키보드 숫자 입력·중첩 label/alt/제목, 읽기 금지 getter 검사 |
| 동적 화면 | 변경 감지·동일 프레임 실행 방어·낡은 href 제거·우클릭/드래그 방어·감시 정리 검사 |
| 개발용 10페이지 축약 메뉴 | 정확도 37/37, 재현율 23/30(76.7%), 실제 전체 사이트/업무 성공률 아님 |
| 보류용 5페이지 | 현재 엔진 미평가, S07에 보존 |
| 분석 성능 smoke | 합성 1천 제어 10회 p95 **60.4ms**. 화면 준비·실제 사이트 대표 성능은 미검증 |
| 상명대 실제 공개 페이지 | HTTP 200, 6카드 표시, page error 0, [관찰값](evidence/run001/live-check.json) |
| 확장 통합 검사 | localhost 권한이 추가된 테스트 복사본만 검증. 동일 배포본 도구 모음/activeTab은 S08 미완료 |
| 접근성·사용성 | 키보드/너비 자동 회귀 외 수동 VoiceOver·확대·강제 색상·실제 사용자 실증 미실시 |

입력 내용 읽힘 B01, 검색 제어 누락 B02, URL 단독 분류 B03, stale 후보 B04, 중복 정책 B05를 수정했다. S05의 JavaScript 위임/속성 이벤트·SPA·다운로드·팝업 전체 액션 검증은 진행 중이다. B06 실제 설치 경로와 B07 대비는 미해결이다. 정량 목표 미달·미검증 항목을 포함하므로 v1.0 인수 통과 상태가 아니다.

## v0.1 당시 기록 · 이력

아래는 RUN-001 이전의 11개 테스트와 첫 관찰 기록이다. `evidence/live-check.json`·`smu-*.png`는 검증 명령이 최신 관찰로 갱신하는 파일이며 현재 v0.2 결과다. 첫 관찰의 3개 카드 수치는 아래 텍스트 이력으로 구별하고, v0.2 증거는 `evidence/run001/`을 사용한다.

확인일: 2026-10-17 (한국 시간)

## 확인한 결과

| 확인 항목 | 결과 | 범위 |
| --- | --- | --- |
| TypeScript 타입 검사 | 통과 | `npm run typecheck` |
| 확장 프로그램 빌드 | 통과 | Manifest와 JS가 `dist/`에 생성됨 |
| 자동 테스트 | 11개 통과 | 아래 항목 참고 |
| 확장 서비스 워커 | 실제 Chromium에서 로딩 | 격리된 테스트 프로필 사용 |
| Chrome scripting 주입 | 통과 | 테스트 복사본에 localhost 접근 권한을 추가하여 검사 |
| 상명대 공개 홈페이지 | HTTP 200, 탐지·표시 성공 | 읽기 전용, 로그인/신청 실행 없음 |
| 화면 검토 | 데스크톱·390px 모바일 이미지 확인 | 원본 기기 스크린리더 및 고령층 사용성 검증 아님 |
| 기존 Chrome의 로컬 시연 | 실제 UI에서 버튼 클릭 후 6개 기능 표시 확인 | 확장 설치가 아닌 로컬 시연 페이지 |

## 자동 테스트 11개

1. 도구 모음 이벤트 핸들러의 주입 요청과 오류 배지 처리 (Chrome API 모형).
2. 주요 기능 6개 탐지, 주요 메뉴 우선, 중복·숨김·비활성 제외, 접근성 트리의 모달 노출.
3. Esc 종료 시 원본 DOM·초점·스크롤 유지, 재주입 시 중복 방지.
4. 일반 링크가 올바른 로컬 목적지로 이동.
5. 원본 버튼 위치 안내 후 사용자 Enter로 실제 동작 실행. 위치 안내 시 자동 실행 없음.
6. 원본 DOM 변경 후 다시 찾기와 화면 복귀.
7. 탐지 실패 시 기능을 지어내지 않고 원본 복귀 제공.
8. 입력값 접근 시 예외를 발생시키는 테스트로 비수집 확인. 비밀번호 필드 제외, 위험 동작 추천 제외, 비HTTP 링크는 자동 이동하지 않음.
9. Tab/Shift+Tab 초점이 쉬운 화면 내부에서 순환.
10. 1440/390/320px에서 가로 스크롤 없음.
11. 실제 확장 서비스 워커 로딩과 content script 주입·재주입 종료 (localhost 한정 테스트 권한).

## 상명대 실제 페이지 관찰

대상: <https://www.smu.ac.kr/> → <https://www.smu.ac.kr/kor/index.do>

첫 관찰에서 보이는 요소 95개를 후보로 수집하고, 분류 후보 6개 중 중복을 제거해 3개를 표시했습니다. 휴리스틱 점수는 정확도 확률이 아닙니다.

| 표시 기능 | 원본 문구 | 처리 방식 | 확인 범위 |
| --- | --- | --- | --- |
| 학사정보 | 학사안내 | 원본 URL 링크 | 추출 URL과 화면 표시 확인 |
| 검색 | 검색 열기 | 원본 요소 위치 안내 | 탐지·화면 표시 확인 |
| 로그인 | 로그인 새창열림 | 원본 요소 위치 안내 | 탐지·화면 표시 확인 |

원본 페이지에는 자체 팝업이 있었습니다. **실제 로그인, 검색 실행, 학사 업무 완료를 확인한 결과가 아닙니다.** 첫 관찰에서 공지사항은 표시되지 않았으며, 다음 개선 대상으로 남겨둡니다. 현재 페이지에서 보이는 요소만 분석하므로 동적 메뉴·다른 섹션·하위 페이지의 기능을 놓칠 수 있습니다.

원시 관찰값: [live-check.json](evidence/live-check.json)

화면: [원본](evidence/smu-original.png) · [쉬운 화면](evidence/smu-easy-mode.png) · [로컬 예시](evidence/demo-desktop.png) · [모바일 너비 예시](evidence/demo-mobile.png)

## 아직 확인하지 않은 항목

- 사용자의 기존 Chrome 프로필에서 도구 모음 클릭으로 activeTab이 허용되는 전체 흐름. 테스트는 사용자 프로필을 변경하지 않았습니다.
- 실제 대학 계정의 로그인·인증·업무 성공, 팝업에 가려진 원본 메뉴 조작.
- 교차 출처 iframe과 닫힌 Shadow DOM의 내부 요소.
- 원본 사이트의 비동기 메뉴·화면 갱신 전반. 현재는 사용자가 다시 찾기를 눌러 갱신합니다.
- 다른 4개 기관 사이트의 정확도, 탐지 정답 데이터셋.
- VoiceOver/NVDA, 200~400% 확대, 고대비 환경의 수동 검증과 정식 접근성 적합성 평가.
- 실제 대상 사용자의 과제 성공률·완료 시간·오클릭 개선.

## 다음 검증 과제

1. README대로 확장을 설치하고 상명대 사이트에서 도구 모음 실행 → 원본 복귀를 확인.
2. 공지사항 누락 원인을 조사하고 숨김 메뉴·팝업·사이트 구조 변화 사례를 기록.
3. 추가 사이트마다 목표 기능 정답을 먼저 지정한 뒤 탐지 결과와 비교.
4. 초기 사용자에게 동일 과제를 일반 화면/EasyWeb 순서를 바꾸어 수행하게 하고 성공률·시간·오클릭 기록.

## 추가 계획 검토에서 확인한 한계 · 2026-10-17

기존 11개 테스트는 재실행 시에도 통과했습니다. 다만 일반 HTML input의 `value` 비수집 테스트만으로 모든 입력 제어의 비수집이 입증되지는 않습니다. 가상 DOM에서 `contenteditable[role=searchbox]`의 입력 내용이 후보 문구로 읽히는 결함을 재현했습니다. 별도 서버 전송은 확인된 현상이 아니며, 입력 내용의 읽힘 자체를 우선 수정할 예정입니다.

같은 재현에서 placeholder 없이 aria-label만 있는 일반 텍스트 검색창의 누락, URL 단독 분류의 미채택을 확인했습니다. [재현 결과](evidence/planning-baseline.json)와 [작업명세서](WORK_SPEC.md)에 우선순위·인수 조건을 기록했습니다. 당시 계획 작성에서는 제품 소스 코드를 수정하지 않았습니다. 이 결함은 이후 RUN-001에서 수정했습니다.

## 현재 판정으로 돌아가기

아래 RUN-005 당시 상태는 과거 기록이며 현재 상태는 [RUN-007](RUN_007_REPORT.md)과 [진행표](PROGRESS.md)를 따른다. RUN-005 당시 완료4/10·NOT_MET(S05 재개), 최종222/222와 v8 첫10/17·4/15·1/5 모든사이트FAIL을 함께 기록한다. 알려진50페이지에서 v7정정본은 새 자료가 아니다. [RUN-004 인수 판정](evidence/run004/release-gate.json)·첫 raw FAIL·해석 한계와 수정전204/208·live14/15·ZIP·동결v1/v2를 보존한다. RUN-004의25분57초를 RUN-005 경과로 쓰지 않으며 전체 경과·계정 토큰·비용은 UNKNOWN이다.
