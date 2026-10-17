# RUN-004 · v0.5.0 개발 후보 검증 기록

기록일: 2026-10-18 (한국 시간) · 기술 검증·정적 감사 관찰 마감: **03:05:48 KST**

인수 판정: **5/10 단계 · NOT_MET · DEVELOPMENT_CANDIDATE**. [최종 인수 기록](evidence/run004/release-gate.json)

**S07 인수 조건은 충족하지 못했다.** 로컬 189개, 자동 접근성, 합성 성능, 공개 과제 15개와 패키지 재현성은 통과했다. 같은 동결 엔진의 v7-v2 첫 결과는 정확 6/12·재현 4/15·과제 제어 추천 1/5이며 원본 정답 기준 모든 사이트가 FAIL이다. 이후 독립 static 감사가 action 정답 충돌 6건을 확인했다. 최초 점수·FAIL은 보존하지만 주석 오류의 영향을 배제한 점수는 미산정이며, 첫 점수를 순수한 제품 일반화 품질로 해석하지 않는다. 이번 checkpoint에서 데이터 정정·점수 재계산·재평가는 하지 않았다.

단계 수는 공수 비율이 아니다. 컴퓨터 유즈는 사용하지 않았고, 현재 버전의 실제 설치·VoiceOver 발화·브라우저 확대는 미검증이다. 정식 실증과 1인 사전 시험의 실제 관찰은 각각 0건이다.

## 소스 변경과 동결

소스는 **2026-10-17 17:53:53.116468 UTC = 2026-10-18 02:53:53 KST**에 [v0.5-engine-freeze.json](evidence/run004/v0.5-engine-freeze.json)의 14개 파일과 별도 아카이브로 고정했다. root와 구현자는 그 전에 v7 본문을 읽지 않았다. 첫 독립 평가 후에도 소스 변경이나 평가 재실행은 없었다. 기존 순위 정책과 평가 threshold는 유지했다.

- 문서 목적이 없다는 결과를 한 번 계산해 보관하고, 기본값과 heading을 반복 계산하던 병목을 줄였다. 공유 table/panel 문맥은 한 batch에서 재사용하되 분석·현재성 cache를 다른 batch에 공유하지 않는다.
- 동명 “자료받기” 카드에 관련 서식 제목을 안전한 정적 문맥으로 표시하고 snapshot으로 의미 변경을 차단했다. 원래 label·href·action과 초기 선택 순서는 유지한다. caption은 source 매칭을 구분하며 기존 summary·품질 지표를 바꾸지 않는다.
- 범용 회귀 13개, caption 회귀 3개, manual 옵션 회귀 1개를 추가했다. manual 옵션 검사는 사람의 실제 수동 시험이 아니다.

## 로컬·접근성·성능

| 항목 | 결과와 범위 |
| --- | --- |
| 타입·빌드·로컬 통합 | **189/189 PASS**, 실패·flaky·skipped 0. [로컬 기록](evidence/run004/local-verification.json) |
| core 개발 회귀 | 정확 **69/69**, 재현 **45/45**, 과제 제어 추천 **15/15**. [원시값](evidence/run004/core-regression/evaluation-current-all.json). 이미 노출된 자료의 회귀 |
| 자동 접근성 | **21조건**, errors·violations·incomplete·overflow·targets·contrast 미달 모두 0. 실제 발화·브라우저 확대·전체 적합성 판정과 별개 |
| 평가 프로토콜 | 정정본의 원본/정정 해시 검사와 development-only 사용을 강제한다. 초기 도구 검사 **6/6 PASS**이며 제품 품질 인수를 대신하지 않음 |

| 합성 shape | 표본 | p95 분석 | p95 화면 준비 |
| --- | --- | --- | --- |
| mixed | 혼합 1,000제어 × 10샘플 | **27.5ms** | **57.8ms** |
| flat | 평면 1,000제어 × 10샘플 | **39.6ms** | **78.4ms** |
| table | 500행 × 2제어 × 10샘플 | **89.6ms** | **146.4ms** |

총 30샘플에서 분석 300ms·준비 1,000ms 기준을 모두 통과했다. 합성·헤드리스 범위이며 실제 사이트 로딩이나 native 도구 모음 실행을 포함한 사람의 체감 성능을 뜻하지 않는다.

첫 root 통합은 185개 중 184개 PASS·도구 mock 1개 FAIL이었다. verify에 flat/table 성능 검사를 추가했을 때 가짜 benchmark fixture가 새 shape 파일을 쓰지 않아 발생한 도구 검사 실패다. [최초 실패](evidence/run004/first-integration-tool-mock-failure/)를 보존했고 fixture 수정 후 target 검사를 통과했다. 이후 caption 3개·manual 옵션 1개를 더한 최종 189개가 통과했다. 중간 worker의 185/185와 최종 결과를 구별한다.

## v6 정정: category v1과 fixture v2

| 버전 | 수정 범위와 보존 |
| --- | --- |
| [category 정정 v1](../evaluation/development-v6-corrected/VERSION.json) | public-agency accepted 4곳·expected 1곳의 category만 search→apply. 그 외 의미 차이 0, fixture 5/5·다른 site 4/4 바이트 동일. 원본 동결 11파일 해시·크기 유지 |
| [fixture 충실도 정정 v2](../evaluation/development-v6-corrected-v2/VERSION.json) | v1 category 5필드 유지. city 표 3행에 빈 td를 각 3개씩 총 9개 추가하고 city JSON의 fixture 경로 1곳만 변경. 실제 5열의 제목 index 1·첨부 index 3 복원 |
| v2 보존 검사 | 원본 11파일·v1 전체 11파일 보존. 기존 제어 DOM·label·속성·href·action·정답·과제 유지. 다른 site 4개·fixture 4개는 v1과 바이트 동일. 빈 td 9개를 제거하면 v1 HTML이 정확히 복원됨 |

v1의 [분류 감사](evidence/run003/annotation-taxonomy-audit.json)·[root 승인](evidence/run003/annotation-taxonomy-root-review.json)·[데이터 검증](evidence/run004/v6-correction-validation.json)을 보존한다. v2는 [readonly 표 관찰](evidence/run004/city-table-fidelity-observation.json)에서 실제 5열인데 축약 fixture가 2셀만 복원해 열 의미를 바꿨음을 확인하고 [최소 구조 정정](evidence/run004/v6-fixture-fidelity-validation.json)했다. 순번·담당부서·수정일 값은 만들어 넣지 않았고, 제품을 잘못 축약한 구조에 맞추는 fallback도 추가하지 않았다.

v1 VERSION SHA-256은 `0dc25561a3bc3abd2116a9fa7f350a28c6953c17ca742b26f9e645d1c78a029a`, v2 VERSION은 `87a70a1067613a95f89baa77c225a02d98fd48c0a88f58e51b7bb7d7275441ce`다. 둘 다 `ADJUDICATED_DEVELOPMENT`이며 원본·최초 실패를 대체하지 않는다.

## 같은 동결 엔진의 개발 재평가

[전체 요약](evidence/run004/final-development/summary.json)에 각 suite의 phase·exit·quality·menuFlow와 로그를 보존했다. 아래 결과는 노출된 자료의 개발 평가이며 새로운 독립 첫 결과가 아니다.

| 자료 | 첫 화면 정확 / 재현 / 과제 제어 추천 | 판정 |
| --- | --- | --- |
| [원본 v6](evidence/run004/final-development/evaluation-current-blind-v6-all.json) | **21/22 · 11/15** | 원래 category·잘못 축약한 표 유지, FAIL |
| [category v1](evidence/run004/final-development/evaluation-current-development-v6-corrected-all.json) | **22/22 · 12/15** | category만 정정하고 잘못 축약한 표 유지, FAIL |
| [fixture v2](evidence/run004/final-development/evaluation-current-development-v6-corrected-v2-all.json) | **24/24 · 14/15(93.3%) · 5/5** | city **2/3(66.7%)**가 사이트별 75% 기준에 미달해 FAIL |
| v5 | **16/17 · 8/15** | FAIL. 추가 메뉴 표시는 **26/27 · 14/15** |
| core·v2·v3·정정 v4 | 개발 평가 PASS | 과거 독립 첫 실패를 대체하지 않음 |

v6-v2의 실제 추가 메뉴 UI 표시는 정확 **41/41**·재현 **15/15**·과제 제어 추천 **5/5**, unresolved/repeated 0이다. 동명 “자료받기” 3개의 fallback key를 관련 제목 caption으로 구별했다. 첫 화면 판정은 그대로이며, 이 표시 coverage는 링크 실행·원본 안내 도달·사람의 업무 성공을 뜻하지 않는다.

## v7 독립성·복원 경계

사전 노출로 관찰 담당자를 교체한 [경계 사건](evidence/run004/v7-observer-boundary-incident.json)을 보존한다. 절차 선언과 해시만으로 독립성이 저절로 증명되지는 않으며 한계를 숨기지 않는다.

구 v7 감사는 category/action 확정 오류 0이며 좁은 fixed-control 평가를 허용할 수 있다고 보았다. 다만 32/32 제어의 조상 평탄화와 heading/form 변환이 있었다. root는 의미 구조에 의존하는 S07 일반화 증거로는 약하다고 판단해 [별도 결정](evidence/run004/v7-fidelity-decision.json)으로 v2 재구성을 선택했다. 감사자의 필수 승인 요구와 root의 증거 범위 판단을 구별한다.

원본 v7·동결·정답을 보존하고, 제품 평가와 결과 노출 전에 독립 작성자가 같은 5페이지·15기대 그룹·32accepted의 원본 조상·heading·list·control 구조를 복원했다. [v2 동결](evidence/run004/blind-v7-v2-freeze.json) SHA-256은 `c0a385e094b34d360129d56c34c9ea736cda98eee04f5b316cab77acf1b46f44`다. 확인 범위는 조상 342항목·제어 순서 32/32·readonly HTTP 16/16·AX role/target 32/32·AX name 정확 29/32, 공백 제외 32/32다. 전체 사이트나 실제 설치 동작을 입증한 것은 아니다.

원본 v7의 제품 평가는 0회이며 v2가 같은 5페이지의 최초 평가다. 알려진 자료는 기존 40+새 5=**45페이지**이고 두 버전을 10페이지로 합산하지 않는다. 문서 담당자는 첫 결과 공개 후 요약·quality·menuFlow·명령 메타데이터만 읽었고 source/fixture 본문·URL은 열지 않았다.

## v7-v2 첫 독립 평가와 해석 한계

[첫 명령](evidence/run004/blind-v7-v2-first/first-command.json)은 **2026-10-17 18:02:05.920372 UTC** 시작, **18:02:06.554752 UTC = 2026-10-18 03:02:06 KST** 종료, exitCode 1·sourceFreezeMatched=true를 기록한다. [최초 결과](evidence/run004/blind-v7-v2-first/evaluation-current-blind-v7-v2-holdout.json)와 [로그](evidence/run004/blind-v7-v2-first/first.log)를 보존한다.

| 경로 | 정확도 | 재현율 | 과제 제어 추천 | 판정·한계 |
| --- | --- | --- | --- | --- |
| 첫 화면 | **6/12(50.0%)** | **4/15(26.7%)** | **1/5** | 모든 5사이트 FAIL |
| 추가 메뉴 UI 표시 | **6/12(50.0%)** | **4/15(26.7%)** | **1/5** | 별도 coverage, unresolvedMappings 1·repeatedCards 0 |

| 사이트 | 첫 화면 정확도 | 첫 화면 재현율 | 품질 |
| --- | --- | --- | --- |
| city | 1/3(33.3%) | 1/3(33.3%) | FAIL |
| government | 추천 0개로 정확도 미정 | 0/3 | FAIL |
| library | 1/3(33.3%) | 0/3 | FAIL |
| public-agency | 3/5(60.0%) | 3/3(100%) | FAIL |
| smu | 1/1(100%) | 0/3 | FAIL |

기준은 전체 정확 90%·재현 85%, 사이트별 정확 80%·재현 75%다. 이 표는 고정된 원본 정답으로 계산한 첫 기록이다. 아래 감사에서 확정한 주석 오류의 영향을 포함하며, 오류를 제거한 점수로 바꾸거나 통과를 추정하지 않는다.

### 첫 결과 이후의 독립 action 감사

[독립 static 감사](evidence/run004/v7-v2-action-audit.json)는 제품 결과·추천·다른 진단을 읽거나 제품·네트워크·UI를 실행하지 않고 동작 정책과 정적 원본 근거를 검토했다. 감사 SHA-256은 `41ced3f106af3112a2f014baa862363dd289aaea7856b82ce87cfbc324f000c9`다. [root 검토](evidence/run004/v7-v2-action-root-review.json)는 다음 6건을 별도 개발 정정본의 후보로 승인했다.

- city 예약 안내 1건: 명시적 role/ARIA 제어이므로 **navigate→locate**.
- SMU 다른 문서 fragment 5건: 일반 HTTP 링크이며 다른 pathname이므로 **locate→navigate**. expected 3건과 SMU 과제 지시문도 영향받는다.
- 로그인 2건은 공개 로그인 폼 이동과 실제 인증 개시를 동일하게 볼 수 있는지 불명확해 **계약 범위 모호성**으로 남겼다. 확정 주석 오류가 아니다.

`smu-second`는 실제 원본 문서의 같은 문서 fragment이므로 locate가 맞다. 별도 parity 관찰의 about:blank와 제품 평가 문서 문맥을 혼동하지 않는다. root가 정적 코드로 확인한 평가는 route 후 실제 URL로 이동하는 방식이며 이 확인을 위해 새 제품 실행은 하지 않았다.

구 v7의 오류 0 감사는 구 fixture 대상이고 v2 action 정합까지 보증하지 않는다. 원본 v7/v2·동결·최초 결과는 수정하지 않았다. 별도 정정 버전도 이번 checkpoint에서는 만들지 않았다. 6건 충돌과 로그인 모호성은 관찰된 분류 누락·오분류를 없던 것으로 만들지 않지만, 원본 점수에 모두 제품 책임을 부여해서도 안 된다.

### 정적 원인 진단과 다음 개선 범위

[readonly 원인 진단](evidence/run004/v7-failure-diagnosis.md)과 [구조화 기록](evidence/run004/v7-failure-diagnosis.json)은 동결 소스·기존 첫 결과·fixture를 읽은 **정적 코드 경로 추론**이다. 분류 전 후보 trace나 새 제품 실행 결과가 아니다.

- 모든 페이지의 분류 수와 표시 수가 같고 선택은 0~5개, 다음 메뉴도 없어 첫 6개 제한이 주된 원인이 아니다. 정부 수집 후보 8개에서 추천 0개, SMU 수집 후보 7개에서 추천 1개가 나왔다.
- 긴 서비스 카드의 45점/55점 채택 경계, 안내 페이지의 주제 search/help 혼동, 떨어진 제목·탭 문맥 연결이 원인 후보다. 임계값을 낮추거나 캡처 문구·site ID에 맞추는 변경으로 해결하지 않는다.
- 추가 메뉴의 unresolved 1건은 public-agency의 실제 검색 입력이 accepted에 없던 매핑 문제다. 입력값 유출 증거가 아니다. 고정 이름의 입력·검색 버튼을 과제로 묶는 기준을 따로 검토한다.

다음 기술 작업은 범용 서비스 카드·안내 탭·지역 제목과 제어를 연결하는 근거를 개선하는 것이다. 현재 45페이지 결과에 맞춘 라벨 추가를 목표로 삼지 않는다. 승인된 action 충돌과 로그인 진입 계약은 별도 주석·정책 문제로 분리한다. 무관한 뉴스·위험 동작·편집 입력을 반례로 포함하고 최초 점수·threshold·순위 정책을 임의로 바꾸지 않는다.

## 공개 과제·확인실·후보 ZIP

같은 동결 소스로 공개 과제 **15/15 PASS**, HTTP 목적지 9·원본 위치 안내 6·재시도 0·관찰 오류 0을 확인했다. [기록](evidence/run004/tasks-live-final.json)과 [로그](evidence/run004/tasks-live-final.log)를 보존한다. 인증·결제·삭제·최종 제출·신청 업무 완료가 아니라 공개 목적지/원본 제어 도달이다.

[수동 확인실](evidence/run004/manual-fixture-final.json)은 새 manual 옵션으로 만든 3경로의 HTTP 200·로컬 바이트 일치만 확인했다. 사람의 실제 시험은 0건이며 native·발화·브라우저 확대·사용자 실증을 대신하지 않는다.

후보는 [EasyWeb-0.5.0-candidate.zip](../output/run004/EasyWeb-0.5.0-candidate.zip), **275,816bytes**, SHA-256 `aa94ee228bab7ce796793999021bc2d3941162acc1e1f19c7d83d643569ef8f2`다. 두 빌드·두 ZIP 동일, sourceStable=true이며 현재 14개 소스 파일은 동결과 같다.

- sourceDigest: `3adb3e0d7b1a85e9c75699fdda4755f08d1ecee5014202f7b55de44ca414ab3b`
- buildDigest: `04f10769505a6eeea78929a146fc33d099cb372e5af3e40aa96116a500eb7733`

[산출물 검토](evidence/run004/final-review.json)는 **PASS**, 해시 불일치·깨진 로컬 링크 0이다. ZIP 5entry의 바이트 일치와 RUN-002/003 보존도 확인했다. 문서 갱신을 포함한 최종 해시·링크 개수는 해당 JSON을 기준으로 한다. 후보 ZIP과 검사 통과는 전체 인수 통과를 뜻하지 않는다.

## 계측과 남은 인수 조건

[계측 기록](evidence/run004/goal-usage-snapshot.json)의 기술 검증·정적 감사 관찰 구간은 **2026-10-17 17:39:51→18:05:48 UTC**, 즉 **2026-10-18 02:39:51→03:05:48 KST**, **1,557초(25분 57초)**다. 전체 RUN-004의 실제 시작·전체 경과가 아니며 이후 문서 마감·로컬 commit은 포함하지 않는다.

목표 도구의 누적 counter는 tokensUsed **5,504,237**·timeUsedSeconds **7,266**이다. RUN-003의 17:37:35.721 UTC snapshot 대비 차분은 **1,243,365**·**1,691초**다. 이 차분은 이번 관찰 경계 전 준비도 포함하므로 RUN-004 고유 사용량, 생성 작업량, 입력/출력/캐시/추론/청구 토큰 또는 비용이 아니다. 이전 누적값과 중복 합산하지 않는다. 전체 실제 경과·계정 토큰·비용은 **UNKNOWN**이다.

S06 실제 발화·확대, S07 독립 품질과 action 정합 후의 일반화 검증, S08 현재 버전 실제 설치·복구, S09 사용자 참여, S10 통합 인수는 남는다. [1인 사전 시험](PRETEST.md)은 아직 결과가 없고 정식 6~8명 실증으로 합산하지 않는다. RUN-003 보고서·원본 실패·동결·증거·ZIP은 보존했다.

다음 첫 작업은 현재 45페이지에 맞춘 라벨 추가가 아니라 범용 카드·탭·제목과 제어를 연결하는 근거 및 반례 회귀를 개선하는 것이다. action 정정 후보와 로그인 진입 계약은 별도 근거로 분리해 보존한다. 알려진 45페이지는 개발 자료이며, 이후 새 독립 평가는 새 미노출 자료와 엔진을 각각 동결한 뒤 진행한다. 컴퓨터 유즈를 재개하지 않으며 문서 담당자는 제품 검사·소스 변경·외부 게시·연락·유료 API를 실행하지 않았다.
