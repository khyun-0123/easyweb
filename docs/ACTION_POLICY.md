# 원본 액션과 위치 안내 정책

S05 구현 문서. `sourceAction()`의 링크 의미와 쉬운 화면 선택 후의 실행 정책을 구분한다. 이 문서의 합성 검사·확장 실행 환경 관찰은 실제 기관 업무 완료나 배포 Manifest의 도구 모음 클릭 검증이 아니다.

RUN-005에서 발견한 FileDown 경로+다운로드 아이콘 두 건은 v0.7에서 보수적 원본 안내로 수정했다. 링크 자체/로컬 자손의 명시적 아이콘·고정 긍정 명령 근거를 현재성 스냅샷에도 포함한다. 유사·부정 문구는 새 근거로 쓰지 않으며 기존 긍정 title·download 속성은 유지한다. [S05 재완료 판정](evidence/run006/s05-resolution-root-review.json)과 [검증 기록](RUN_006_REPORT.md)을 따른다. 실제 파일 응답·본문·실행은 미관찰이며 모든 불투명 다운로드 식별이나 숨은 JS 경로 보증을 뜻하지 않는다.

## 원본 의미와 실행 경계

`sourceAction()`의 `navigate`는 href를 HTTP(S) 목적지로 해석할 수 있고, 검사하는 DOM 속성에 명시적인 원본 제어 표식이 없다는 뜻이다. JavaScript 이벤트가 없다는 증거는 아니다. 일반 링크는 바로 이동한다는 사용자 선택에 따라 이 종류는 현재 후보의 href·target으로 만든 실제 링크 카드로 연결하며, 선택 직전 원본의 현재성을 검사한다. S02의 독립 정답 의미는 유지한다.

`locateOriginal()`은 `locate` 제어에 대해 원본 페이지로 돌아가 해당 제어를 화면에 드러내고 초점·임시 강조를 제공한다. 원본 `.click()`, `dispatchEvent('click')`, 폼 submit, 인증·결제·삭제·최종 신청은 호출하지 않는다. 사용자가 원본 제어를 직접 선택하면 브라우저의 원래 이벤트 경로·위임·SPA 처리가 적용된다.

사용자는 “일반 링크는 바로 이동 유지”를 명시했다. 따라서 일반 HTTP(S) 링크는 링크 카드에서 직접 이동하고, 페이지 내 앵커·명시적 JS/팝업·다운로드·인증 등 `locate` 제어만 버튼으로 원본에 안내한다. 목적지 hostname과 새 창/다른 창 정보를 표시한다. 앞서 검토한 전체 원본 안내 방식과 실제 사이트 관찰은 이력으로 보존하며 현재 제품 결정과 구분한다.

isolated world에서 페이지가 대입한 property onclick이나 위임 이벤트의 존재를 모두 알 수는 없다. DOM 표식이 없는 링크를 카드로 직접 연결하면 해당 원본 handler·SPA router를 우회할 수 있다. 이 경계를 사용자 선택과 함께 명시하며, 모든 사이트의 원래 JavaScript 동작을 보존한다고 주장하지 않는다. 실행형 제어로 식별된 경우에는 원본 안내로 실제 이벤트 경로를 보존하고, 원본 click 자동 전달로 한계를 숨기지 않는다.

## 정의한 사례

| 원본 사례 | `sourceAction` 메타데이터 | 원본 안내 경계 |
| --- | --- | --- |
| 일반 상대/절대 HTTP(S) 링크·query | `navigate`, 해석한 href, 실제 reserved target | 현재성 확인 후 실제 링크 카드에서 직접 이동 |
| 상대 `#fragment`·동일 문서 absolute fragment | `locate` | 원래 앵커를 사용자가 선택 |
| `javascript:`, `data:`, `mailto:`, `tel:` | `locate` | 확장이 해당 scheme을 실행하지 않음 |
| button·role button·aria-controls/haspopup·명시적 popup/data 표식 | `locate` | 제어 위치만 제공 |
| inline onclick | `locate` | 원본 handler 자동 호출 안 함 |
| property onclick·addEventListener·document/ancestor 위임·SPA router | DOM 표식이 없으면 href 의미상 `navigate`일 수 있음 | 일반 링크 직접 이동이 handler를 우회할 수 있는 알려진 경계. handler 부재·모든 원본 JS 보존을 보증하지 않음 |
| download 속성·고정 title의 명시적 다운로드 동작·안전하게 읽은 문서 파일명·실행 설치/압축 파일·완전한 `fileDownload`/`downloadFile`/`file-download`/`download` 경로 조각 | `locate` | 다운로드 자동 시작 안 함. 제목 `다운로드 안내`나 `download-guide`·`how-to-download` 같은 안내 문서와 query의 단어만으로는 적용하지 않음. 일반 `.pdf` URL만 있고 다운로드 표식·파일명 제어 이름이 없는 문서 보기 링크는 직접 이동 가능 |
| 불투명한 URL의 서버 attachment 응답 | 응답 헤더를 조회하지 않아 일반 href와 같을 수 있음 | 파일 여부를 추정하여 실행하지 않음 |
| `_blank`·대소문자 reserved target | `navigate` 및 정규화된 target | 새 창 안내와 링크 카드 target에 반영 |
| `_self`·`_top`·`_parent` | `navigate` 및 target | 현재 수집 범위는 최상위 문서. iframe 의미 보존 완료로 일반화하지 않음 |
| 이름 있는 창·공백이 붙은 `_blank ` | `locate` | 이름을 trim하여 새 창 의미로 바꾸지 않음 |
| base target | 링크에 target 속성이 없을 때 상속 | 이름 있는 base target도 `locate` |
| 명시적인 빈 target | `_self`; base target을 덮음 | 원본 target 속성을 수정하지 않음 |
| SSO/OAuth/SAML/authorize 경로 | `locate` | 인증 시작 URL을 자동 실행 안 함 |
| href·target·base·역할·이름·현재 URL·편집 상태 변경/원본 제거 | 실행 시 현재성 검사 실패 | 낡은 후보를 실행하지 않고 다시 찾기 제공 |

SSO 식별 목록과 파일 확장자 목록은 완전하지 않다. URL이 평범하게 보인다는 이유로 모든 원본 동작이 단순 탐색이라고 단정하지 않는다. 외부 목적지 안내는 원본 HTTP(S) 링크의 hostname과 target을 참고 정보로 사용할 수 있으며, 입력·query 문자열이나 이벤트 소스를 UI에 노출할 필요가 없다.

## 위치 안내 성공·실패

`locateOriginal(candidate, close)`는 먼저 쉬운 화면을 종료하고 원본 상태를 확인한다. `scrollIntoView({behavior:'instant'})` 뒤 viewport와 실제 hit-test를 확인한 후 초점을 준다. 초점 처리 중 원본이 바뀔 수 있으므로 실제 분석 snapshot의 현재성도 다시 확인하고 나서만 강조한다.

| 반환값 | 의미 |
| --- | --- |
| `{ok:true}` | 판정 시 원본 제어가 유효하고 viewport 내 일부에서 hit-test되며 초점도 도달함. 원본 기능 실행 완료가 아님 |
| `unavailable` | 제거·숨김·inert·aria-hidden·비활성 등으로 사용할 수 없음 |
| `changed` | 초점 처리 중 이름·href·현재 문맥 등 snapshot이 바뀜. 이전 이름으로 성공을 알리지 않고 다시 열어 찾도록 안내 |
| `outside-viewport` | 스크롤 뒤에도 원본 영역이 viewport와 만나지 않음 |
| `covered` | viewport 안에 있으나 확인한 원본 영역을 팝업·다른 요소가 가림 |
| `focus-failed` | 초점이 대상이나 그 하위에 남지 않음 |

실패는 성공 안내로 바꾸지 않는다. UI는 원본 복귀 후 이유를 알리고 사용자가 팝업을 닫거나 원본 메뉴를 직접 찾을 수 있게 해야 한다. 샘플 hit-test는 보수적인 가시성 검사이며 전체 픽셀 검사나 향후 화면 변화에 대한 보증이 아니다. 일부만 드러난 제어를 놓칠 수 있다.

실사이트 과제 검사에서 `changed` 안내가 나온 경우에만 안내를 닫고 EasyWeb을 한 번 다시 여는 실제 흐름을 허용한다. 새 분석에서도 과제 제어가 실제 추천되어야 한다. 원본 링크가 fragment 메뉴로 바뀐 경우는 처음 정확히 추천된 동일 DOM·같은 고정 이름·화면에 드러난 원본 하위 링크의 정확한 공개 목적지를 모두 확인하며, 사용자가 해당 링크를 직접 선택하는 단계를 기록한다. 복제 URL 이동이나 미추천 과제의 수동 대체를 성공으로 합산하지 않는다.

## 초점·스크롤·강조 복구

- 쉬운 화면의 일반 종료는 열기 전 초점·스크롤을 복원한다. 원본 위치 안내에서는 그 뒤 의도적으로 대상 위치로 스크롤·초점을 옮긴다.
- 초점을 주기 위해 추가한 tabindex는 안내 실패 시 즉시 복원하고, 성공 시 임시 강조 종료 때 복원한다. href·tabindex가 모두 없는 앵커는 `tabIndex` 값이 0이어도 native focus를 받지 않을 수 있어 임시 -1을 추가한다. 기존 명시적 tabindex는 보존하고, 사이트가 이후 다른 값으로 변경했다면 덮지 않는다.
- 같은 요소를 다시 안내하면 이름을 붙인 `easyweb:clear-highlight` 이벤트로 이전 강조를 먼저 정리한다. 재주입 인스턴스 사이에도 임시 스타일을 원래 값으로 다시 저장하지 않는다.
- 원본 focus handler가 만든 스타일을 포함하여, 확장이 강조를 적용하기 직전의 outline·offset·우선순위를 저장한다. 사이트가 이후 바꾼 값이나 `!important` 우선순위는 유지한다. 기존 스타일 속성의 부재도 복구한다.
- CSSOM 속성을 지운 뒤에는 직렬화한 `style` 값이 빈 문자열인지 확인하고 속성을 제거한다. RUN-001에서 관찰한 Chromium의 빈 속성 재생성 현상을 피하는 경로다. 다른 브라우저 버전의 동작을 단정하지 않는다.

사이트가 확장과 완전히 같은 값·우선순위로 나중에 다시 지정한 변경은 기존 값과 구별할 수 없다. 열린/닫힌 Shadow DOM, iframe 내부, transform/복잡한 clipping, 브라우저 내부 페이지 등은 별도 지원 범위·검증을 필요로 한다.

## 검증 근거

`tests/action-policy.spec.mjs`는 URL·fragment·JS·popup·download·SSO·예약 target·이름 있는 창·base target·빈 target·target 변경을 검사한다. 기존 데이터의 의미를 바꾸기 위해 DOM 표식을 추가하지 않는다.

`tests/action-preservation.spec.mjs`는 원본 위치 안내가 property·위임 click과 폼 submit을 호출하지 않는지, 사용자의 원본 클릭에서만 원래 이벤트가 실행되는지 검사한다. 제거·숨김·aria-hidden·화면 밖·일반/모달 팝업 가림·초점 중 제거/팝업/이름·href 변경·초점 이탈·후속 스타일/우선순위/tabindex 변경·href 없는 앵커의 초점과 복구도 검사한다. fragment 메뉴 변경은 실패 안내 후 재분석·원본 하위 링크 직접 선택까지 합성 페이지에서 검사하며 실제 기관 도달 결과와 구분한다. `tests/highlight.spec.mjs`는 실제 재주입 UI를 반복 선택한 뒤 원래 outline·빈 style 부재·tabindex가 복원되는지 검사한다.

같은 `action-preservation` 검사에는 실제 Chrome 확장 서비스 워커의 `chrome.scripting.executeScript`를 이용한 별도 world 관찰이 있다. 신규 임시 Chrome 프로필과 **localhost 권한을 더한 테스트 복사본**에서 수행한다. DOM href와 inline onclick 속성은 양쪽 world에서 같았고, 페이지가 대입한 property onclick은 MAIN에서 function, ISOLATED에서 null(`typeof`는 object)로 관찰되었다. 원본 클릭을 직접 수행했을 때 property·위임 handler는 각각 실행되었다. property/위임 이벤트 존재를 isolated world의 DOM 속성만으로 완전히 판정할 수 없다는 경계를 재현한 것이다.

이 관찰은 배포 Manifest의 권한을 확대한 구현이 아니다. 제품 권한은 `activeTab`, `scripting`을 유지한다. 테스트 복사본은 자동화된 world 관찰용이며, 원래 Manifest로 도구 모음을 눌러 activeTab을 부여한 S08 검증과 구별한다. 실제 사이트 로그인·검색 제출·신청·결제·삭제는 수행하지 않는다.

`scripts/check-tasks-live.mjs`는 fixture ID를 오프라인에서 고정 이름·공개 href 설명으로 바꾸고 실제 공개 DOM의 같은 제어와 대응한다. 실제 추천 전체 및 과제 제어의 분류·점수·근거를 기록하며, 입력값·후보 snapshot·본문 innerText는 직렬화하지 않는다. `navigate`는 실제 카드 링크를 선택한 뒤 정확한 공개 목적지와 HTTP 응답을 확인하고, `locate`는 실제 원본 초점·상태 안내를 확인한다. 원본 안내가 불필요한 직접 링크에 focus/status를 성공 조건으로 요구하지 않는다.

부분 관찰은 `node scripts/check-tasks-live.mjs --page-ids=city-civil-guide,city-counseling --observe-only --output=/tmp/easyweb-tasks-observe.json`처럼 실행한다. `--only`도 같은 별칭이며 알 수 없거나 비어 있는 명시적 ID 인자는 방문 전에 실패한다. 부분 결과나 observe-only는 15개 과제 인수 통과로 계산하지 않는다. 전체 재실행은 기존 보고서를 priorSnapshots에 보존하고 현재 코드·데이터 해시를 함께 남긴다. bundle hash는 분석·분류·UI·검사 도구를 모두 포함하며 분류기만의 해시가 아니므로 소스 파일별 해시도 함께 기록한다. source-bundled CDP isolated world 검사는 설치된 배포본·activeTab의 증거와 구분한다.
