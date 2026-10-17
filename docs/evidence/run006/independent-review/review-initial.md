# RUN-006 독립 다운로드 안전 검토 · 첫 결과

고정 인계 소스로 독립 headless 반례 6개를 실행해 **3실패·3통과**를 확인했다. 제품 소스·작업자의 기존 테스트는 수정하지 않았다. 모든 페이지 요청을 차단했고 실제 다운로드·native UI·사용자 입력 접근은 없었다.

- **R006-IR01 / HIGH:** FileDown 경로의 원본 anchor 자체 `class="ir-download"`는 navigate지만 같은 class의 자손 i는 locate다. 기존 navigate 후보에 anchor class를 동기 추가해도 `isCandidateCurrent=true`, 제품 카드의 `defaultPrevented=false`였다. 검사자가 기본 동작을 마지막에 막았으므로 실제 이동·파일 실행은 하지 않았다.
- **R006-IR02 / MEDIUM:** 안전한 고정 이름 `Do not download`, `No download`, `Never download now`, `금지된 다운로드`를 모두 새 다운로드 양성 근거로 잘못 읽는다. 이는 과잉 원본 안내이며 자동 실행 사고를 뜻하지 않는다.

경로/query/hash/class lookalike와 외부 아이콘, 편집/입력 금지 getter 및 snapshot 비수집, 초점 중 marker 변경 시 원본 클릭·submit 없는 changed 처리는 통과했다.

원시 결과는 `first.log`와 `first-results.json`, 입력 해시·재현·판정 경계는 `review-initial.json`이다. root가 두 결함을 수정 대상으로 수락했다. 제품 수정 인계 후 동일 6개 테스트를 변경 없이 재검사한다.
