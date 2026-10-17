# RUN-007 · v0.8.0 기관 의미 보정과 새 자료 검증

2026-10-18 · **완료 5/10, 전체 인수 NOT_MET.** 최대 6개와 ‘다른 메뉴 보기’를 유지했다. 알려진 자료에서는 개선됐으나 새 독립 자료의 핵심 기능을 충분히 찾지 못했다. 이 후보를 v1.0 또는 독립 품질 통과로 표시하지 않는다.

## 결과와 제공 파일

- [설치 후보 ZIP](../output/run007/EasyWeb-0.8.0-candidate.zip): **375,030 bytes**, SHA256 `0efe9a229db5622d4e41a1369ac99b7ddc3ac3590666b2a997998b1d244a9982`.
- [빌드·패키지 기록](../output/run007/EasyWeb-0.8.0-candidate.json): 두 빌드·두 ZIP 바이트 동일, sourceStable. activeTab/scripting만 유지하며 host_permissions·자동 주입 없음. 게시하지 않았다.
- [로컬 311/311](evidence/run007/local-verification.json), 실패·flaky·skip 0. 타입·빌드·기존 core 회귀·성능 3종 PASS. core 정확72/74, 재현45/45, 과제 추천15/15는 이미 노출된 개발 자료다.
- [자동 접근성 21조건](evidence/run007/a11y-automated.json): 오류·위반·미판정 0. 실제 VoiceOver 발화·실제 확대·현재 후보의 네이티브 설치는 NOT_RUN.
- [기존 실제 공개 과제 15/15](evidence/run007/tasks-live-final.json): HTTP 목적지9, 원본 위치 안내6, 재시도·관찰 오류0. 인증·신청·다운로드 실행 또는 사람의 성공이 아니다.
- [새 자료 첫 결과](evidence/run007/blind-v9-v2-first-evaluated/evaluation-current-institution-blind-v9-v2-holdout.json): **정확26/30(86.7%), 재현2/15(13.3%), 과제 추천0/5, 모든 사이트 FAIL**. 추가 메뉴는 정확60/73·재현5/15·추천2/5, 대응 미해결·반복 카드0이다. 추가 메뉴 결과로 첫 화면 기준을 바꾸지 않았다.

## 구현과 검토

`institution-evidence.ts` ADAPTER_VERSION2가 실제 기관 페이지의 제한된 관계를 의미 근거로 제공한다. 국민안전 교육 메뉴·내용 패널, 연금 설명 탭과 유일한 패널, 대학 IT 문서의 공지/설명 목적, 대학 학사 탭과 선택 내용 제목, 도서관 안내서와 설명 탭을 다룬다. 호스트·경로만으로는 보정하지 않는다. 평가 ID·문서 번호·불투명 query 값·정답 위치를 분류 규칙으로 쓰지 않는다.

공통 위험 URL·스크립트·입력 보호가 보정보다 먼저 적용된다. action/href/target은 원본 후보 그대로이며, 일반 HTTP(S)는 직접 이동, 명시적 팝업·handler·다운로드·SSO·같은 문서 fragment는 원본 위치 안내를 유지한다. 의존 노드·fingerprint·관계 성립을 다시 확인해 같은 내용의 제목·패널 교체도 stale로 차단한다. 기관 관계 캐시 최적화는 이번에 적용하지 않았고 매 재검사에서 다시 계산한다.

범용 경로에는 준비 서류 제목·서식 다운로드 읽기와 신청 내역/결과 확인 제어를 보완했다. 같은 form·목록의 정확히 동점인 검색 필터는 짧은 이름보다 원본 목록 순서를 따른다. 다른 점수·목적·목록의 순위, 최대6개·분류 다양성·추가 메뉴 전체 탐색은 유지한다.

[기관 모듈45검사](evidence/run007/institution-module/v2/handoff.json), [필터 수정 전4실패/3통과→관련80통과](evidence/run007/filter-ordering/handoff.json), [초기 독립 통합14검사](evidence/run007/integration-review/review.json), [최종 통합16검사](evidence/run007/integration-review/v2-currentness.log)를 보존했다. 초기 독립 실행 검토는 모듈v1 대상이며 이후v2의 전체 최종 검증과 구별한다. [최종 정적 소스 검토](evidence/run007/final-source-review/review.json)는 동결15파일과 아카이브 일치·구체적 새 결함 미발견이며 자동 인수 승인이 아니다.

‘신청/예약 안내’를 일괄 help로 우선하는 시험 변경은 기존 공지·과제 계약과 충돌했다. [시험 분기와 실패](evidence/run007/guidance-trial-rejected/decision.json)를 보존하고 제거했다. 시험 자체는 로컬313통과/3실패였고, 복원한 최종 소스311/311을 다시 통과했다. 중간 검증은 [기관 추가 전](evidence/run007/before-known-extensions/source.json), [시험 변경 전](evidence/run007/before-guidance-fix/source.json)에 각각 남겼다.

## 같은 소스의 개발 비교

[24회 비교](evidence/run007/final-development/summary.json)는 generic/institution 각12suite를 같은15파일로 실행했다. 원본·정정판을 모두 보고하며 50페이지 합계에서는 같은 페이지를 한 번만 센다. `npm run compare:development -- --output-dir=<새 빈 경로>`로 재생성한다. 이 명령은 새 독립 자료를 실행하지 않는다.

| 평가 | generic 정확 / 재현 | institution 정확 / 재현 | 기관 모드 판정 |
| --- | --- | --- | --- |
| core |72/74 ·45/45|72/74 ·45/45|PASS|
| v2 |22/22 ·11/11|22/22 ·11/11|PASS|
| v3 |18/18 ·11/11|18/18 ·11/11|PASS|
| 정정v4 |15/15 ·13/13|15/15 ·13/13|PASS|
| v5 |24/25 ·13/15|26/26 ·14/15|FAIL: 한 사이트의 첫6개 재현 미달|
| rawv6 |25/26 ·12/15|25/26 ·12/15|FAIL|
| 정정v6-1 |26/26 ·13/15|26/26 ·13/15|FAIL|
| 정정v6-2 |26/26 ·15/15|26/26 ·15/15|PASS|
| rawv7-v2 |13/18 ·11/15|16/24 ·12/15|FAIL|
| 정정v7-1 |13/18 ·11/15|20/24 ·15/15|FAIL|
| 정정v7-2 |16/18 ·11/15|23/24 ·15/15|PASS|
| v8 |13/17 ·7/15|25/26 ·15/15|PASS|
| 고유50페이지 합계 |206/215 ·126/140|227/231 ·139/140|합계·기관별 기준PASS, 독립 인수 아님|

고유50페이지 합계의 과제 추천은 generic46/50, institution50/50이다. v5의 동일 중요도 설명 탭 중 뒤쪽 한 개는 추가 메뉴에서 접근 가능하나 첫6개 재현은 미달이다. 정답 위치를 앞세우는 특례로 고치지 않았다. raw/정정판 개별 FAIL과 과거 모든 최초 FAIL은 합계 통과로 대체하지 않는다.

v7의 일반 로그인2개와 미주석 검색 입력1개는 [독립 정적 감사](evidence/run007/v7-contract-static-review/audit.json) 후 [별도 개발v2](../evaluation/development-v7-corrected-v2/VERSION.json)로만 정정했다. expected15·task5·기존 category는 유지하고 NPS 입력의 평가 marker만 추가했다. 원본·v1 21파일은 해시 동일하다. 첫 독립 점수는 재계산하지 않았다.

## 새로운 평가의 독립 경계

독립 관찰자가 종전50 URL을 제외한 5기관의 새 페이지를 제품 코드·결과 없이 수집했다. 전체 본문·조상·표·form·ARIA·가시성 관계를 보존하며 실제 원본 스크립트 실행과 입력값은 차단/정리했다. 새 자료는 5페이지·15기대·5과제·291가시 제어다.

[원래v9 동결](evidence/run007/blind-v9-freeze.json)과 [첫 독립 정적 QA](evidence/run007/blind-v9-independent-static-qa.json)를 보존했다. 제품 실행 전에 확인된 이름3개와 범위1개를 [별도v2](evidence/run007/blind-v9-v2-provenance.json)로 고쳤다. HTML·action·expected·task는 그대로이며132accepted/159rejected다. [v2 QA PASS](evidence/run007/blind-v9-v2-independent-static-qa.json), [130항목 동결](evidence/run007/blind-v9-v2-freeze.json)을 확인했다. 같은5페이지의 v9/v2는 두 독립 표본이 아니다.

제품15파일은 **04:08:33 KST** [최초 동결](evidence/run007/v0.8-engine-freeze.json) 이전에 root/구현자가 새 URL·이름·본문·주석을 읽지 않았다. 첫 명령은 수집자가 고정한 flat 경로와 평가기의 `sites/` 가정이 달라 **브라우저/제품 실행 전 ENOENT**로 종료했다. [오류 시도](evidence/run007/blind-v9-v2-first/command-completion.json)는 점수나 품질 실패가 아니다.

자료를 바꾸지 않고 평가기의 flat 경로만 지원해 **04:11:30 KST** [도구 수정 동결v2](evidence/run007/v0.8-engine-freeze-v2.json)를 만들었다. 제품15파일·아카이브는 동일하다. root는 경로명과 JSON 키 구조만 확인했고 새 값·URL·본문은 보지 않았다. [첫 실제 평가 시작/종료](evidence/run007/blind-v9-v2-first-evaluated/command-start.json)는 독립 자료의 첫 제품 실행임을 기록한다. **04:11:41 KST 종료·exit1**, source/tools/dataset 모두 안정, 첫FAIL을 읽기 전용으로 보존했다. [프로토콜 검사](evidence/run007/protocol-final-layout.log)는10/10이다.

이제 새5페이지는 개발에 노출됐다. 전체 고유 개발 페이지는 **55**이며, 같은 자료의 후속 개선은 독립 품질 증거가 아니다. [기관 진단](evidence/run007/post-first-institution-diagnosis.json)은13개 최초 누락을 추가메뉴3개/모든메뉴미분류10개로 구분했다. 현재 페이지의 설명 패널·인쇄/복사 안내·행동요령 자료와 실제 업무 제어를 분리해 다음 버전에서 개선한다. 수집/정답을 불리한 결과 때문에 바꾸지 않는다.

## 성능과 남은 인수

기존1000제어 각10회 p95 분석/준비(ms): mixed27.9/56.7, flat41.0/109.7, table92.7/191.8. 300/1000ms 기준 모두 PASS다. [기관 보정이 실제1000개에 적용된 별도 측정](evidence/run007/institution-performance-final/performance.json)도 분석203.4/준비437.1ms로 기존 기준PASS다.

별도 더 엄격한 **분석+분류+순위 전체300ms 진단은413.8ms로FAIL**이다. generic 전체256.8ms와 구별한다. 기관 currentness 일괄 검사376.1ms도 별도로 기록했다. 이 추가 진단을 숨기거나 기존 analyzer-only 기준으로 바꾸어 보고하지 않는다. 실제 사이트 로딩·native 시작은 제외한 합성 헤드리스 소표본이며 OS의 다른 부하는 완전히 통제하지 않았다.

S01~S05는 DONE/정의 범위 유지, S06 실제 발화·확대, S07 새 독립 품질, S08 동일 후보 실제 설치·복구, S09 실제 사용자, S10 통합 인수가 남아 있다. 1인 사전 시험·정식6~8명 실증의 실제 관찰은 각각0건이다. 컴퓨터유즈·native UI·기존 브라우저 조작0, 기존4173/4183 서버 유지, 원격 게시·연락·유료 API 사용 없음.

[계측 범위](evidence/run007/goal-usage-snapshot.json)는 초기 읽기·분담·일부 통합 이후의 기록 경계이며 전체 작업 시작이 아니다. 계정 입력/출력/캐시/청구 토큰·비용·전체 실제 경과는 UNKNOWN이다. 누적 목표 도구 counter를 청구량으로 쓰지 않는다. [인수 판정](evidence/run007/release-gate.json)과 [산출물 검토](evidence/run007/final-review.json)를 따른다. 다음 실행에서도 본래10/10 목표와 원래 인수 조건을 유지한다.
