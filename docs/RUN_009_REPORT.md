# RUN-009 · v0.10.0 현재 버전 마감

2026-10-18. 사용자 요청에 따라 **이번 버전의 수정·검증·패키지를 마감하고 장기 작업을 일시 정지**한다. 전체 10단계의 인수 상태는 **5/10 · NOT_MET**이다. 다음 버전과 새 독립 자료 수집은 시작하지 않았다.

## 결과와 파일

- [설치 후보 ZIP](../output/run009/EasyWeb-0.10.0-candidate.zip): **605,239 bytes**, SHA256 `ce0650d3a747da1c9b157a77db7fbaae11a99cda2a40f7d46ef22662cfdf403b`. [두 빌드·두 ZIP 동일](../output/run009/EasyWeb-0.10.0-candidate.json), sourceStable이며 원래 activeTab/scripting 권한을 유지했다. 외부 게시0.
- [로컬493/493](evidence/run009/local-verification.json): 실패·flaky·skip0, 타입·빌드·core72/74정확·45/45재현·15/15추천 PASS. [실행 전후21파일 동일](evidence/run009/verification-command-completion.json).
- [자동 접근성21조건](evidence/run009/a11y-automated.json): 오류·위반·미판정0. [기존 실제 공개 과제15/15](evidence/run009/tasks-live.json): HTTP목적지9·원본위치6, 재시도/관찰오류0. 인증·신청·다운로드 실행이나 사람의 성공을 뜻하지 않는다.
- [동일 소스60페이지 개발 비교](evidence/run009/closing-development-comparison/summary.json): 기관모드 **286/290정확·169/170재현·60/60추천**, 범용263/272·148/170·53/60이다. 원본/정정판을 중복 계산하지 않은 합계이며 개별FAIL은 유지했다.
- 이전 실패 v10의 현재 개발 재평가는 **29/30정확·15/15재현·5/5추천 PASS**, 추가메뉴89/93·15/15·5/5, 대응모호/반복0이다. v8 검색 회귀도 **15/15재현 PASS**로 복구했다.

## 구현과 검증 범위

새 범용 관계 모듈은 같은 본문 업무 탭, 소식/사진/영상 보기, 한 서비스의 상세/발급/미리보기 제어, 문서종류 목록표, 정보 디렉토리 표, 학업지원 규정 PDF와 선택된 학업지원 문서 탭을 다룬다. 실제 caption·열 정렬·고정 행이름·제목·선택 항목·원본 제어의 역할을 함께 확인한다. 층수 열의 유일한 수직병합만 정렬해 처리하고 의미열 병합은 거절한다. PDF의 실제 행제목을 관련 항목으로 표시하며 작성된 접근성 이름은 보존한다.

공통 위험URL/query/script/문구 검사 뒤에만 관계를 사용한다. 원본action/href/target을 바꾸거나 원본을 자동 활성화하지 않는다. 의존하는 실제 노드·고정 하위이름·fingerprint를 다음 검사에서 다시 계산한다. 행·제목·동료제어를 같은 마크업으로 교체해도 이전 카드는 차단한다. 사적 value/checked·편집내용을 읽지 않는다.

같은 본문의 검색은 고정 검색 이름·실제 form 소유·legend/본문제목 또는 일치하는 유일한 선택주제·후속 본문목록으로 증명한다. GET 검색과 명시적 non-submit 검색버튼의 POST 검색을 지원하며 기본 POST 제출에는 새 관련성 근거를 주지 않는다. 페이지 번호와 빈 버튼목록은 본문목록과 구분한다. 같은 검색 form의 입력/버튼은 본문tier를 채울 때 한 목적 그룹으로 다룬다. **최대6개+다른메뉴/이전메뉴와 최초6개 품질 기준은 유지**한다.

반복 목록 자식 열거는100만→0, p가 없는 flat 구조의 반복 조회 반환도100만1000→0으로 줄였다. navigation/context/institution/content 요약은 한 동기 batch 안에서만 공유한다. 다음 카드·메뉴·focus 후 검사에는 새 캐시를 만든다. form의 고정 action/method/onsubmit은 runtime snapshot에 포함하고 observer에서도 감시한다. snapshot은 진단 직렬화에서 제외한다.

메뉴 진단은 이름으로 원본을 추측하던 방식에서 실제 렌더링 카드와 원본의 WeakMap 결속으로 바꿨다. 제품 DOM에 평가 ID를 추가하지 않는다. 원본 평가 식별자가 없으면 여전히 정답으로 세지 않는다. 이전 대응모호9/반복표시4를 제품 중복으로 확정하지 않았으며, 새 대응 결과로 과거 점수를 다시 쓰지 않았다.

[서비스34검사](evidence/run009/service-relations/handoff.json)·[문서20검사](evidence/run009/document-relations/handoff.json)·[분석배치41검사](evidence/run009/analyzer-performance/handoff.json)·[독립통합10검사](evidence/run009/final-integration-review/review.json)·[root12검사](evidence/run009/root-integration/resolution.json)를493검사에 통합했다. 독립10검사의 최초 별도 실행은 마지막 pagination 수정 전이며, 해당 bundle 파일은 후속 전체검사에서 최신 소스로 교체됐다. 최종493검사에 포함된 해당10개도 통과했으며 [교체 경위와 해시 관계](evidence/run009/artifact-audit/integration-bundle-supersession.json)를 남겼다. 확인된 새 P1/P2는 없으나 모든 경우를 증명한 것은 아니다.

첫 전체 실행의491통과/1실패는 기존 메뉴 진단의 모호성 가정을 새 실제원본결속에 맞춰 정정해야 했던 항목이다. [원래 실행/검사 보존](evidence/run009/before-menu-contract-update/) 후 실제 결속·목적지 중복제거를 검사하고, 식별자가 없는 경우의 미판정 음성 검사를 추가해493개를 다시 통과했다. [정정 근거](evidence/run009/menu-contract-clarification.json). 이는 품질 기준 완화나 과거 첫 결과 정정이 아니다.

## 성능

기존1000제어 각10회 p95 분석/준비(ms): mixed27.2/106.9, flat29.7/142.4, table93.0/273.9. 기존300/1000ms 기준은 모두PASS다.

[기관 근거가 실제1000개에 적용된 별도 측정](evidence/run009/institution-performance-final/performance.json):

| 모드 | 분석 | 전체 분석+분류+순위 | 화면 준비 | 일괄 현재성 | 전체300ms 추가진단 |
| --- | ---: | ---: | ---: | ---: | --- |
| institution |206.3ms|284.2ms|305.9ms|241.9ms|PASS|
| generic |206.0ms|327.1ms|349.4ms|178.4ms|FAIL|

이전 기관575.9ms·범용437.9ms보다 전체처리가 줄었지만 **범용 추가진단은 미달**이다. 두 모드 전체를 묶은 진단 status/명령 exit는FAIL이며 숨기지 않는다. 기본 기관모드 통과와 기존 analyzer/준비 기준 통과를 구분한다. 합성 헤드리스 각10표본의 p95는 최대 관측값이며 실제 사이트/native/OS 전체 성능은 아니다. 다른 브라우저 검사 종료 후 순차 측정했고 사용자의 다른 OS 부하는 통제하지 않았다.

## 인수와 남은 항목

새 독립 평가를 이번 버전에 실행하지 않았다. v0.9에서 고정한 [v10 최초 결과](evidence/run008/blind-v10-first-evaluated/evaluation-current-institution-blind-v10-holdout.json)는 **26/28정확·2/15재현·0/5추천 FAIL**, SHA`e469fe25011392ea61be795a00d552e02ef7aa7d23789c1e9db08973c5a1c131` 그대로다. 현재60페이지는 모두 노출된 개발 자료이며15/15 개발 결과를 독립 통과로 바꾸지 않는다. 모든 이전 원본·정정판·동결·첫실패·ZIP·태그도 보존한다.

v5의 동률 읽기 탭1개는 계속 첫6개밖이라 해당 사이트의 첫화면 재현 기준에 미달한다. rawv6/중간v6정정·rawv7/중간v7정정의 개별FAIL도 남긴다. 60페이지의 표시 오분류4개에는 정부 소식보기의 help 분류가 포함된다. 추가메뉴 접근이나 합계PASS로 이 항목들을 지우지 않는다.

현재0.10의 실제 Manifest 설치·toolbar·수동복구, 실제VoiceOver 발화, 실제200/400%확대는NOT_RUN이다. 1인 사전시험·정식6~8명 실증은 각각0건이다. 준비된 [사전시험](PRETEST.md)·[수동절차](MANUAL_CHECK.md)를 관찰 결과로 채우지 않았다. S06~S10의 원래 인수 조건과10/10 목표는 그대로 남는다.

[21제품·17도구 동결](evidence/run009/v0.10-engine-freeze.json)과 아카이브, [최종 감사](evidence/run009/final-review.json), [인수 판정](evidence/run009/release-gate.json), [사용자 마감 경계](evidence/run009/user-stop-boundary.json)를 따른다. 컴퓨터유즈/native/기존프로필 조작0, 기존4173/4183 서버 유지, 외부 게시/연락/유료API0이다. [시간/토큰 경계](evidence/run009/goal-usage-snapshot.json)는 전체작업 시작/경과·계정 청구량이 아니다. 계정입력/출력/캐시/청구토큰·비용은UNKNOWN이다. 로컬 저장·인계 후 장기목표를 사용자 요청으로 일시 정지한다.
