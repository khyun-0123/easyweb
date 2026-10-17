# RUN-006 · v0.7.0 다운로드 연결 수정

2026-10-18 (한국 시간). **완료 5/10 · 전체 인수 NOT_MET.** RUN-005에서 재개한 S05의 두 다운로드 반례와 추가 검토 결함을 수정했다. S07 품질, 실제 보조기술·현재 후보 설치·사용자 실증은 남아 있다. [진행표](PROGRESS.md) · [직전 기록](RUN_005_REPORT.md)

## 변경과 검토

완전한 HTTP(S) `FileDown`/`FileDown.do` 경로와 해당 링크의 다운로드 아이콘 또는 고정 명령 이름을 함께 확인하면 원본 위치를 안내한다. 아이콘은 링크 자체 또는 편집 영역을 제외한 로컬 자손에서만 읽는다. 안내·부정·비활성 이름의 유사 아이콘과 일반 링크는 새 다운로드 근거로 쓰지 않는다. 고정 이름은 전체 긍정 명령 문법으로 읽고 기존 title의 명시적 부정문도 제외한다. 기존 긍정 title·download 속성은 유지한다.

근거를 최대 8개 아이콘·아이콘당 4개 토큰·토큰당 64자로 한정해 현재성 스냅샷에 포함했다. 이름·URL이 같거나 locate가 유지되더라도 근거가 바뀌면 이전 카드를 차단한다. 원본 click·폼 제출을 대신 실행하지 않는다. [소스 스냅샷](evidence/run006/source-snapshot.json)은 개발 검증용이며 새로운 blind 동결이 아니다.

수정 전 원래 7개 검사에서 5실패·2통과를 재현했다. 초기 shadowRoot 조회의 검사 코드 실수와 중간 아이콘 규칙 실패도 [인계 기록](evidence/run006/download-safety/review-handoff.json)에 구별해 보존했다. 독립 검토의 6개 중 3개가 링크 자체의 아이콘 누락·같은 프레임의 낡은 이동·부정 문구 오인을 재현했다. 수정 후 동일 6개는 전부 통과했고 별도 title 9조건도 통과했다. 원본 독립 테스트는 바꾸지 않았다. [초기 검토](evidence/run006/independent-review/review-initial.json) · [실행 증거 검토](evidence/run006/independent-review/root-resolution.json)

## 최종 확인

| 항목 | 결과와 범위 |
| --- | --- |
| 타입·빌드·로컬 | [237/237 PASS](evidence/run006/local-verification.json), 실패·flaky·skipped 0. 이 중 새 자체 9개·독립 6개 포함 |
| 원래 문제 제어 | [두 원본 제어 재생](evidence/run006/known-download-controls.json): 둘 다 locate·직접 카드 href 없음·원본 markup 동일. 분석 메타데이터 검증이며 모두 추천됐다는 뜻이 아님. 요청 차단·원본 클릭0, 파일 응답/실행 미관찰 |
| core 개발 회귀 | 정확72/74(97.3%)·재현45/45·과제 추천15/15 PASS. 오탐2개 포함, 노출 자료임 |
| 자동 접근성 | [21조건](evidence/run006/a11y-automated.json), 오류·위반·incomplete·넘침·타깃/대비 미달0. 실제 발화·브라우저 확대와 별개 |
| 합성 성능 | 각10표본·warmup 제외, p95 분석/준비: [mixed](evidence/run006/performance.json)28.0/60.4ms, [flat](evidence/run006/performance-flat.json)42.7/107.9ms, [table](evidence/run006/performance-table.json)89.7/163.9ms. 300/1,000ms 기준 PASS, 실제 사이트 로딩/native 제외 |
| 기존 공개 과제 | [15/15 PASS](evidence/run006/tasks-live-final.json): 실제 카드의 HTTP 목적지9·원본 안내6, 재시도/관찰 오류0. 별도 headless 문맥이며 설치 확장·사람 업무 완료 증거가 아님 |
| 패키지 | [v0.7 ZIP](../output/run006/EasyWeb-0.7.0-candidate.zip)322,116bytes, SHA256 `97bd0c3fb35d4230c84a4e2e4bed52408293afff1396d312d66b4c9815098371`. [메타데이터](../output/run006/EasyWeb-0.7.0-candidate.json): 두 빌드/ZIP 동일·sourceStable, activeTab+scripting 유지 |
| 산출물·수동 확인실 | [무결성 검토 PASS](evidence/run006/final-review.json): 해시166비교·불일치0, 로컬442링크·깨짐0, ZIP5항목 일치. [로컬 HTTP 3경로](evidence/run006/manual-fixture-final.json) 참조. HTTP 바이트 확인은 UI·실제 수동 시험의 대체가 아님 |

원본 fixture의 `script-src 'none'` 때문에 최초 재생 검사에서 inline 주입이 차단됐다. 이후 검사 문자열의 문법 오류를 수정하고 기존 평가기처럼 별도 isolated world에서 자체 분석기를 실행했다. 원본 CSP·자료는 유지했고 실패 로그도 보존했다. 이 두 검사 준비 오류를 제품 실패나 다운로드 실행으로 세지 않는다.

## 품질과 단계 판정

이미 노출된 v8 개발 재평가는 **정확11/16(68.8%)·재현5/15(33.3%)·과제 추천2/5 FAIL**이다. 추가 메뉴도 **12/18·6/15·2/5**로 별도 기록한다. [10suite 개발 요약](evidence/run006/development/summary.json)의 앞선 9suite 수치는 v0.6과 같으며 v5/v6/v7의 첫 화면 품질도 미달이다. core 포함 고유 페이지는 여전히50개다.

v0.6의 독립 첫 결과 **10/17·4/15·1/5 FAIL**과 당시 동결·원본 정답·ZIP·커밋 `6129140`은 그대로 보존했다. 이번 v8 재평가는 새 독립 인수가 아니다. [S05 root 판정](evidence/run006/s05-resolution-root-review.json)은 정의한 액션·현재성·복귀 범위의 재완료이며, 모든 불투명 다운로드·숨은 이벤트 식별을 보증하지 않는다. 파일 응답 MIME·본문·실제 실행·피해는 관찰하지 않았다.

실제 설치·VoiceOver 발화·실제 브라우저 확대는 NOT_RUN, 1인 시험·정식 실증은 각각0건이다. 컴퓨터 유즈·native/보이는 브라우저 제어는0이며 기존 사용자의 브라우저를 조작하거나 서버를 재시작하지 않았다.

다음 작업은 [기관별 의미 보정 구현안](INSTITUTION_ADAPTER_PLAN.md)이다. 공통 안전 검사 다음의 작은 보정 계층을 만들고 같은 소스의 generic/institution 모드로50페이지를 비교한 뒤 새 독립 자료로 검증한다. 이 계획은 아직 구현 결과가 아니다.

[계측 기록](evidence/run006/goal-usage-snapshot.json)의 관찰 구간은 UTC18:34:08.194772→18:44:21, 약10분12.8초다. 앞선 준비·분담과 이후 최종 문서·무결성 검토·commit은 제외하며 전체 RUN-006 경과가 아니다. 목표 도구 누적7,056,593tokensUsed/9,550초와 이전 대비383,734/725초 차분은 이번 고유 사용량·청구 토큰이 아니다. 전체 실제 경과·계정 토큰 세부·비용은 UNKNOWN이다.
