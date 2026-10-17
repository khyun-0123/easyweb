# 공개 사이트 평가 자료

현재 상태: 원래 core 15페이지와 blind-v2/v3/v4 각 5페이지는 첫 평가 후 모두 개발에 노출되었습니다. 총 30페이지를 다시 통과해도 독립 품질 인수로 세지 않습니다. 최초 실패와 당시 자료·엔진을 보존하며, 최종 판정은 [RUN-002 보고서](../docs/RUN_002_REPORT.md)를 따릅니다.

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

RUN-001에서는 기준선 전체와 개발용 전후 비교를 기록하고 보류용 현재 성능을 사용하지 않았습니다. RUN-002의 첫 규칙 고정 평가에서는 보류용 재현율이 8/15(53.3%)로 실패했습니다. 당시 코드와 결과는 `docs/evidence/run002/first-frozen-engine/`, `holdout-first-frozen.json`에 보존했습니다. 이후 원래 15페이지 전체는 개발용으로 사용합니다. 같은 `split=holdout`을 다시 실행하더라도 독립 검증으로 부르지 않습니다. 정답·fixture·원래 분리는 변경하지 않았습니다.

## 추가 자료와 노출 이력

별도 관찰자가 해당 시점의 개선 엔진·결과를 보지 않고 각 자료를 작성했고, 평가 전에 정답·fixture와 엔진 해시를 고정했습니다. 각 첫 평가의 재현율이 목표에 미달했고, 원인을 본 뒤 개선에 사용했으므로 현재는 모두 개발용입니다.

| 자료 | 페이지 / 기대 그룹 | 최초 정확도 | 최초 재현율 | 현재 용도 |
| --- | --- | --- | --- | --- |
| core의 원래 holdout | 5 / 15 | 12/12 | 8/15 | 노출된 개발 회귀 |
| blind-v2 | 5 / 11 | 14/14 | 5/11 | 노출된 개발 회귀 |
| blind-v3 | 5 / 11 | 10/10 | 4/11 | 노출된 개발 회귀 |
| blind-v4 | 5 / 13 | 7/8 | 5/13 | 원본 정답·첫 결과 보존, 개발 회귀 |

v4의 신청 결과 조회 1건에서 category를 search→apply로 정정한 별도 [development-v4-corrected](development-v4-corrected/VERSION.json) 버전은 **ADJUDICATED_DEVELOPMENT**입니다. expected와 accepted의 category 필드 각 1개만 수정했으며 원본 fixture·정답·첫 결과를 덮어쓰지 않았습니다. [독립 정답 검토](../docs/evidence/run002/blind-v4-annotation-audit.json)에 근거를 남겼고, 정정 버전을 새 독립 평가로 세지 않습니다.

```bash
# 원래 15페이지: 현재는 개발용 회귀
npm run evaluate -- --engine=current --split=all --output-dir=docs/evidence/run002/final-core

# 노출된 추가 자료의 개발 회귀 (최초 결과 폴더를 덮어쓰지 않는다)
npm run evaluate -- --suite=blind-v2 --engine=current --split=holdout --output-dir=/tmp/easyweb-v2-development
npm run evaluate -- --suite=blind-v3 --engine=current --split=holdout --output-dir=/tmp/easyweb-v3-development
npm run evaluate -- --suite=blind-v4 --engine=current --split=holdout --output-dir=/tmp/easyweb-v4-development
npm run evaluate -- --suite=development-v4-corrected --engine=current --split=holdout --output-dir=/tmp/easyweb-v4-corrected-development
```

이미 확인한 최종 회귀는 [final55-summary.json](../docs/evidence/run002/final55-development/final55-summary.json)에 있습니다. 위 명령을 반복할 필요 없이 같은 소스 해시인지 먼저 확인합니다. 새 독립 평가를 하려면 기존 30페이지와 다른 자료를 엔진·결과에 접근하지 않은 관찰자가 작성하고 먼저 동결해야 합니다. `--phase=fresh-blind-validation`이라는 이름만 지정하는 것은 독립성의 증거가 아닙니다.

실제 공개 과제 도달은 `npm run test:tasks`로 별도 관찰합니다. 정확한 공개 링크를 실제 카드에서 선택해 목적지 HTTP 응답을 확인하거나, 원본 제어의 초점·위치 안내를 확인합니다. 입력·검색 제출·인증·신청은 포함하지 않습니다. 이 관찰도 원래 Manifest를 설치한 네이티브 도구 모음 검증과 구분합니다. S07의 인수 목표는 S02 또는 S04의 완료와 별개입니다.

## 관찰 증거

- [상명대·천안시](../docs/evidence/run001/site-observations-smu-city.json)
- [국민안전24·국민연금공단·국립중앙도서관](../docs/evidence/run001/site-observations-public.json)
- [보존한 v0.1 엔진](../docs/evidence/run001/baseline/src/)
