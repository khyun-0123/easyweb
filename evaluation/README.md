# 공개 사이트 평가 자료

현재 상태: **v0.8.0 개발 후보 / 완료5/10**. [RUN-007](../docs/RUN_007_REPORT.md)을 따른다. core15+v2~v9각5, 총 **55고유페이지**가 개발에 노출됐다. v7 원본/구조복원/정정판, v9/v2는 같은 원본을 중복 계산하지 않는다. 이전 동결·첫FAIL·ZIP을 보존하며 재평가를 독립 결과로 부르지 않는다.

RUN-007은 먼저 알려진50페이지를 동일소스 양쪽mode로 비교했다. 기관 모드227/231정확·139/140재현·50과제추천이며 일부 개별suite FAIL도 보존한다. [정적 감사](../docs/evidence/run007/v7-contract-static-review/audit.json)의 로그인2·입력1 정정은 `development-v7-corrected-v2`로 분리했고 expected/task/category는 바꾸지 않았다.

새 v9는 전체 원본 구조를 유지한5페이지/15기대/5과제다. 독립 정적QA의 이름3·범위1 보정을 제품 실행 전 별도v2로 고정했다. 첫 명령의 flat경로 ENOENT는 제품/브라우저 실행 전 오류로 보존했고 평가기 경로만 수정했다. 동일15제품파일·수정toolhash를 다시 고정한 [첫 실제 평가](../docs/evidence/run007/blind-v9-v2-first-evaluated/evaluation-current-institution-blind-v9-v2-holdout.json)는 **26/30정확·2/15재현·0/5추천**, 모든사이트FAIL이다. 추가 메뉴60/73·5/15·2/5는 별도다. [원본동결](../docs/evidence/run007/blind-v9-freeze.json) · [v2동결](../docs/evidence/run007/blind-v9-v2-freeze.json) · [독립QA](../docs/evidence/run007/blind-v9-v2-independent-static-qa.json) · [도구수정 경계](../docs/evidence/run007/v0.8-engine-freeze-v2.json)

`npm run compare:development -- --output-dir=<새 빈 경로>`는 명시적으로 노출된 v2~v8과 원본/정정suite를 비교하는 명령이다. v9는 이checkpoint의 독립 첫 결과로 따로 보존했으므로 이 명령에 아직 합치지 않았다.

## 원래 core v1.1

수집일: 2026-10-17 (한국 시간). 비로그인 공개 페이지를 읽기 전용으로 관찰하여 **제품 분류기를 실행하기 전에** 정답과 최소 재현 메뉴를 작성했습니다.

| 유형 | 사이트 | 페이지 수 | 분리 |
| --- | --- | --- | --- |
| 대학 | 상명대학교 | 3 | 개발용 2 / 보류용 1 |
| 지자체 | 천안시청 | 3 | 개발용 2 / 보류용 1 |
| 정부 서비스 | 국민안전24 | 3 | 개발용 2 / 보류용 1 |
| 공공기관 | 국민연금공단 | 3 | 개발용 2 / 보류용 1 |
| 도서관 | 국립중앙도서관 | 3 | 개발용 2 / 보류용 1 |

정부24는 실제 접속에서 차단 안내 화면으로 전환되어 같은 정부 서비스 유형의 국민안전24로 대체했습니다. 차단을 우회하지 않았습니다. 국립중앙도서관은 브라우저 DOM 관찰로 원래 후보를 유지했습니다. 접근 경과와 페이지별 제한은 관찰 증거에 기록했습니다.

- `sites/*.json`: 15개 페이지, 기대 기능 45개 그룹, 공개 목적지/원본 제어 도달 과제 15개. 일부 기대 기능은 같은 기능의 여러 원본 제어를 대안으로 허용합니다.
- `fixtures/*.html`: 실제 관찰한 메뉴의 **선택된 일부 제어와 조상 구조를 재구성한 축약 예시**입니다. 전체 사이트 사본, 실제 사이트 화면/레이아웃, 로그인 상태, 이벤트 구현, 입력 내용이 아닙니다.
- v1.1 충실도 수정: 국립중앙도서관 첫 화면의 한 제어에서 원본 `href="#"`와 inline 클릭 존재 신호가 생략된 것을 바로잡았습니다. 타사 핸들러 코드 대신 부작용 없는 `onclick="return false"` 표시만 사용합니다. 정답·과제·분리는 변경하지 않았고 비교 양쪽을 같은 수정 자료로 재평가합니다. [변경 증거](../docs/evidence/run001/fixture-correction-v1.1.json)
- `data-eval-id`: 정답 대응을 위한 평가 식별자입니다. 제품은 이 속성을 분석·분류에 사용하지 않습니다.
- `accepted`: 축약 예시에 있는 추천 가능한 제어의 분류·행동 정답. `expected`: 그중 놓치지 않아야 할 핵심 기능. 추가로 올바른 추천이 나온 경우 정답 판정과 변경 사유를 남겨야 합니다.
- `task`: 공개 링크 또는 원본 제어까지의 목표입니다. 인증·실제 신청·검색 제출·다운로드 실행은 포함하지 않습니다.

## 평가

```bash
# 보존한 v0.1 기준선, 전체 15개
npm run evaluate -- --engine=baseline --split=all

# 같은 개발용 10개 페이지끼리 전후 비교
npm run evaluate -- --engine=baseline --split=calibration
npm run evaluate -- --engine=current --split=calibration

# 원래 holdout 5개: 현재는 개발용 회귀
npm run evaluate -- --engine=current --split=holdout
```

기본 명령은 current/calibration입니다. fixture 재생은 실제 공개 페이지와 같은 URL을 사용하되 요청을 로컬 HTML로 대체하여 제3자 통신을 차단합니다. 평가 결과에 코드·정답·fixture의 해시를 기록합니다.

표시 정확도는 `(소스 ID, 분류, 이동/위치 안내)`가 accepted와 맞고 일반 링크의 목적지가 원본 링크와 일치하는 추천 비율입니다. 재현율은 expected 그룹 중 추천된 대안이 하나 이상 있고 명시한 목적지도 일치하는 그룹 비율입니다. 기능이 같은 다른 버튼이 있어도 정답에 대안으로 고정하지 않았다면 누락으로 남으므로, UI의 일반적인 유용성과 같은 수치가 아닙니다.

`tasksRecommended`는 과제에 대응하는 제어가 추천됐는지의 값이며 **실제 과제 완료 수가 아닙니다**. 원본 위치 안내나 링크를 실행하여 실제 목적지에 도달했는지는 별도 검증해야 합니다. 메뉴 축약 예시의 수치를 실제 전체 사이트 정확도·범용성·접근성·사용성으로 일반화하지 않습니다.

v0.4.0부터 처음 최대 6개 메뉴와 **다른 메뉴 보기 / 이전 메뉴** 흐름을 제공합니다. v0.6은 본문 과제와 분류 다양성을 확보한 뒤 별도 후보로 빈자리를 최대 6개까지 채우도록 순위를 보완했으며, 최초 6개 표시 정확도·재현율 기준은 변경하지 않습니다. RUN-003의 첫 v6 추가 메뉴 흐름 coverage는 **5/15**였으며 최초 독립 품질 미달이 해결된 것으로 판정하지 않습니다. RUN-004의 첫 v7-v2 추가 흐름도 **4/15**로 첫 화면과 같고 source 매칭 미해결 1개를 별도로 남깁니다.

RUN-001에서는 기준선 전체와 개발용 전후 비교를 기록하고 보류용 현재 성능을 사용하지 않았습니다. RUN-002의 첫 규칙 고정 평가에서는 보류용 재현율이 8/15(53.3%)로 실패했습니다. 당시 코드와 결과는 `docs/evidence/run002/first-frozen-engine/`, `holdout-first-frozen.json`에 보존했습니다. 이후 원래 15페이지 전체는 개발용으로 사용합니다. 같은 `split=holdout`을 다시 실행하더라도 독립 검증으로 부르지 않습니다. 정답·fixture·원래 분리는 변경하지 않았습니다.

## 추가 자료와 노출 이력

별도 관찰자가 해당 시점의 개선 엔진·결과를 보지 않고 각 자료를 작성했고, 평가 전에 정답·fixture와 엔진 해시를 고정했습니다. 각 첫 평가의 재현율이 목표에 미달했고, 원인을 본 뒤 개선에 사용했으므로 현재는 모두 개발용입니다.

| 자료 | 페이지 / 기대 그룹 | 최초 정확도 | 최초 재현율 | 최초 과제 제어 추천 | 품질 판정 / 현재 용도 |
| --- | --- | --- | --- | --- | --- |
| core의 원래 holdout | 5 / 15 | 12/12 | 8/15 | — | FAIL / 노출된 개발 회귀 |
| blind-v2 | 5 / 11 | 14/14 | 5/11 | — | FAIL / 노출된 개발 회귀 |
| blind-v3 | 5 / 11 | 10/10 | 4/11 | — | FAIL / 노출된 개발 회귀 |
| blind-v4 | 5 / 13 | 7/8 | 5/13 | — | FAIL / 원본 정답·첫 결과 보존, 개발 회귀 |
| blind-v5 | 5 / 15 | 7/8 | 4/15 | 2/5 | FAIL / 원본 정답·첫 결과 보존, 개발 회귀 |
| blind-v6 | 5 / 15 | 9/9 | 5/15 | 2/5 | FAIL / 원본 정답·첫 결과 보존, 개발 회귀 |
| blind-v7-v2 | 5 / 15 | 6/12 | 4/15 | 1/5 | FAIL / 같은 v7 페이지의 최초 제품 평가, 원본·복원판·첫 결과 보존 |
| blind-v8 | 5 / 15 | 10/17 | 4/15 | 1/5 | FAIL / 원본·첫 결과 보존, 현재 노출된 개발 자료 |

v5·v6의 최초 과제 제어 추천 수는 [RUN-003](../docs/RUN_003_REPORT.md)의 실행 범위와 함께 읽습니다. 추천 수는 실제 링크 실행이나 원본 제어 도달 수가 아닙니다. 별도로 기록한 실제 공개 과제 도달도 현재 v0.8.0 네이티브 설치 경로나 실제 사용자 과제 성공으로 합산하지 않습니다.

v7은 제품·결과를 보지 않은 새 관찰자가 작성했습니다. 관찰자 교체 경계 사건과 원본의 조상 구조 평탄화 한계를 보존한 뒤, 제품 첫 실행 전에 같은 5페이지·15 expected·32 accepted를 유지하는 `blind-v7-v2`를 별도로 복원했습니다. 제품 소스는 root가 자료와 감사 본문을 읽기 전에 동결했으며 첫 평가 때까지 바꾸지 않았습니다. 원본 v7에는 제품을 실행하지 않았습니다. [v2 동결](../docs/evidence/run004/blind-v7-v2-freeze.json)과 [첫 결과](../docs/evidence/run004/blind-v7-v2-first/evaluation-current-blind-v7-v2-holdout.json)를 보존합니다. 복원판은 원본 전체 조상·선택 제어 순서를 유지하지만 전체 페이지·CSS·이벤트 재생은 아닙니다. 계산 접근성 이름은 29/32 정확 일치, 공백 제외 32/32라는 제한도 기록했습니다.

첫 실행 후 제품 결과를 읽지 않은 [별도 액션 감사](../docs/evidence/run004/v7-v2-action-audit.json)는 accepted의 확정 계약 충돌 6개와 일반 로그인 링크 2개의 계약 모호성을 확인했습니다. [root 검토](../docs/evidence/run004/v7-v2-action-root-review.json)는 향후 별도 개발 정정판의 근거로만 채택했습니다. 위 첫 수치는 이 해석 한계와 함께 보존하며 RUN-004에서는 주석 수정·점수 재계산·재평가를 하지 않았습니다. 원본을 고쳐 처음부터 통과한 것으로 바꾸지 않습니다. [실패 진단](../docs/evidence/run004/v7-failure-diagnosis.md)은 분류 누락과 액션 계약 문제를 구분합니다.

RUN-005의 [development-v7-corrected](development-v7-corrected/VERSION.json)는 기존 별도 감사에 근거해 action 11필드(accepted 6·expected 3·과제 action/안내 2)만 정정한 개발 버전입니다. category·label·membership·href·fixture는 변경하지 않았습니다. 이 v1에는 일반 로그인2개와 미주석 검색입력의 한계가 남습니다. RUN-007에서 독립정적감사 뒤 별도 [v2](development-v7-corrected-v2/VERSION.json)로 세 항목만 정정했습니다. 같은5페이지이며 원본/v1/첫결과를 대체하지 않습니다.

v8은 앞선 45개 URL을 제외하고 제품 소스·이전 fixture·결과를 보지 않은 관찰자가 새 5페이지·15 expected·50 accepted/39 rejected 제어를 작성했습니다. 원본 조상·순서·속성·제목·ARIA 관계를 유지하며 정적 QA 320/320을 통과했습니다. [자료 동결](../docs/evidence/run005/blind-v8-freeze.json)과 엔진 중간 동결 뒤, v8 본문·URL을 읽지 않은 상태에서 기존 v3/live 회귀를 수정하고 [최종 엔진 v2](../docs/evidence/run005/v0.6-engine-freeze-v2.json)를 다시 동결했습니다. 그 최종 엔진으로만 [첫 제품 평가](../docs/evidence/run005/blind-v8-first/evaluation-current-blind-v8-holdout.json)를 실행했습니다. 추가 메뉴도 정확11/19·재현5/15·과제 추천1/5로 품질 실패를 대체하지 않습니다. 이제 이 5페이지도 노출된 개발 자료입니다.

v8의 FileDown 경로+다운로드 아이콘 2건으로 RUN-005에서 S05를 재개해 당시4/10으로 판정했다. v0.7은 다운로드 근거·부정문·현재성 반례를 수정했고 [root 판정](../docs/evidence/run006/s05-resolution-root-review.json)에 따라 현재5/10이다. 파일 응답·본문·실제 실행은 미관찰이다. RUN-006 당시 v0.7의 같은 v8 개발 재평가는11/16정확·5/15재현·2/5추천 FAIL이며 추가 메뉴12/18·6/15·2/5도 첫 화면을 대체하지 않는다. 원본 최초10/17·4/15·1/5와 동결·자료는 유지한다. [기관별 보정과 범용 모드 비교](../docs/INSTITUTION_ADAPTER_PLAN.md)는RUN-007에서 구현했다. 최신0.8의 알려진자료 개선과 새v9-v2 첫FAIL은 위 현재기록과 [RUN-007](../docs/RUN_007_REPORT.md)을 따른다.

v4의 신청 결과 조회 1건에서 category를 search→apply로 정정한 별도 [development-v4-corrected](development-v4-corrected/VERSION.json) 버전은 **ADJUDICATED_DEVELOPMENT**입니다. expected와 accepted의 category 필드 각 1개만 수정했으며 원본 fixture·정답·첫 결과를 덮어쓰지 않았습니다. [독립 정답 검토](../docs/evidence/run002/blind-v4-annotation-audit.json)에 근거를 남겼고, 정정 버전을 새 독립 평가로 세지 않습니다.

v6의 개인 연금 조회 분류 주석에는 확정 오류 **4개**, 필수 기대 기능 **1개** 영향이 있다는 [별도 분류 감사](../docs/evidence/run003/annotation-taxonomy-audit.json)를 남겼습니다. 현재 원본 accepted·expected·fixture·과제와 최초 판정은 변경하지 않았습니다. 모호한 분류 중첩을 제품 출력에 맞춰 정답으로 바꾸지 않으며, 감사 제안도 새로운 독립 평가로 세지 않습니다.

v6에는 별도 개발 정정본 두 버전을 유지합니다. [v1](development-v6-corrected/VERSION.json)은 승인된 category 5필드만 고치고 원본 fixture를 유지합니다. [v2](development-v6-corrected-v2/VERSION.json)는 그 정정 위에 천안시 표의 빈 비제어 셀 9개와 해당 fixture 참조 1개를 복원합니다. 실제 원본은 제목·첨부를 포함한 5열인데 축약 tbody가 2열이어서 열의 의미가 어긋났습니다. [재관찰](../docs/evidence/run004/city-table-fidelity-observation.json)과 [데이터 검증](../docs/evidence/run004/v6-fixture-fidelity-validation.json)을 보존합니다. label·제어 속성·정답 sourceIds·과제는 그대로이며, 원본 및 v1은 덮어쓰지 않습니다. 같은 페이지의 정정판을 추가 페이지나 독립 통과로 세지 않습니다.

```bash
# 원래 15페이지: 현재는 개발용 회귀
npm run evaluate -- --engine=current --split=all --output-dir=/tmp/easyweb-core-development

# 노출된 추가 자료의 개발 회귀 (최초 결과 폴더를 덮어쓰지 않는다)
npm run evaluate -- --suite=blind-v2 --engine=current --split=holdout --output-dir=/tmp/easyweb-v2-development
npm run evaluate -- --suite=blind-v3 --engine=current --split=holdout --output-dir=/tmp/easyweb-v3-development
npm run evaluate -- --suite=blind-v4 --engine=current --split=holdout --output-dir=/tmp/easyweb-v4-development
npm run evaluate -- --suite=development-v4-corrected --engine=current --split=holdout --output-dir=/tmp/easyweb-v4-corrected-development
npm run evaluate -- --suite=blind-v5 --engine=current --split=holdout --output-dir=/tmp/easyweb-v5-development
npm run evaluate -- --suite=blind-v6 --engine=current --split=holdout --output-dir=/tmp/easyweb-v6-development
npm run evaluate -- --suite=development-v6-corrected --engine=current --split=all --output-dir=/tmp/easyweb-v6-category-development
npm run evaluate -- --suite=development-v6-corrected-v2 --engine=current --split=all --output-dir=/tmp/easyweb-v6-faithful-development --with-menu-flow
npm run evaluate -- --suite=blind-v7-v2 --engine=current --split=holdout --output-dir=/tmp/easyweb-v7-development --with-menu-flow
```

v0.3.0에서 확인한 회귀는 [final55-summary.json](../docs/evidence/run002/final55-development/final55-summary.json)의 과거 기록으로 보존합니다. 현재 v0.8.0의 최종 회귀·수치·소스 해시는 [RUN-007](../docs/RUN_007_REPORT.md)을 따릅니다. 위 명령을 반복할 필요 없이 같은 소스 해시인지 먼저 확인합니다. 새 독립 평가를 하려면 현재 노출된55페이지와 다른 자료를 엔진·결과에 접근하지 않은 관찰자가 작성하고 먼저 동결해야 합니다. `--phase=fresh-blind-validation`이라는 이름만 지정하는 것은 독립성의 증거가 아닙니다.

새 독립 실행은 `--engine=current --split=holdout --phase=fresh-blind-validation`에 `--engine-freeze=…`, `--dataset-freeze=…`, 새 `--output-dir=…`를 함께 지정합니다. 도구는 제품 소스와 모든 주석·fixture가 동결 해시와 같은지 실행 전후 확인하고, 기존 첫 결과를 덮어쓰지 않습니다. 해시 검사는 관찰자가 엔진·결과를 보지 않았다는 사실 자체를 증명하지 않으므로 별도 관찰 기록이 필요합니다.

`--require-quality`는 전체 정확도90%·재현율85%, 사이트별 정확도80%·재현율75% 중 하나라도 미달이면 결과를 저장한 뒤 비정상 종료합니다. 정정 자료는 VERSION의 원본·이전 버전·정정 파일 해시를 평가 전후 확인하고 `post-holdout-development`에서만 사용합니다. 보고서의 `quality`는 오프라인 정확도·재현율 판정이며 실제15과제·성능·설치·접근성·실증의 인수 판정과는 별개입니다. 평가 절차 보호 검사는 `node --test evaluation/protocol-tests.mjs`로 실행합니다. `--help`는 자료 평가나 파일 출력을 하지 않으며 알 수 없는 인자는 실행 전에 거부합니다.

`--with-menu-flow`는 current 엔진에서 실제 헤드리스 UI의 추가 메뉴를 따라 표시된 후보를 별도 `menuFlow`로 집계합니다. 최초 화면의 `summary`와 `quality`는 그대로 유지합니다. 표시 coverage는 링크 실행·업무 완료·사람의 과제 성공을 뜻하지 않습니다.

실제 공개 과제 도달은 `npm run test:tasks`로 별도 관찰합니다. 정확한 공개 링크를 실제 카드에서 선택해 목적지 HTTP 응답을 확인하거나, 원본 제어의 초점·위치 안내를 확인합니다. 입력·검색 제출·인증·신청은 포함하지 않습니다. 이 관찰도 원래 Manifest를 설치한 네이티브 도구 모음 검증과 구분합니다. S07의 인수 목표는 S02 또는 S04의 완료와 별개입니다.

## 관찰 증거

- [상명대·천안시](../docs/evidence/run001/site-observations-smu-city.json)
- [국민안전24·국민연금공단·국립중앙도서관](../docs/evidence/run001/site-observations-public.json)
- [보존한 v0.1 엔진](../docs/evidence/run001/baseline/src/)
