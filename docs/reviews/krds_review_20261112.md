# KRDS 검토 — 정부 디자인 시스템으로 중요한 기능을 알 수 있나

EasyWeb · 2026-11-12 · v0.11 작업 중

## 한 줄 결론

- **KRDS는 화면의 뼈대(머리글·메뉴·브레드크럼·건너뛰기 링크 등)를 정해 줍니다. 하지만 이 페이지에서 무엇이 가장 중요한지는 정하지 않습니다.** 처음 6칸 고르기는 계속 엔진이 판단해야 합니다.
- **실제 적용은 아직 적습니다.** 사이트 조사 23곳 중 KRDS 흔적이 있는 곳은 4곳입니다. 공식 class 이름으로 화면 구조를 표시한 곳은 국민신문고 1곳뿐입니다.
- 그래서 KRDS 전용 판단 규칙은 만들지 않았습니다. 대신 **기존 브레드크럼 규칙이 KRDS 표기를 알아보도록 좁게 고쳤습니다.** 저장 화면 136쪽 중 국민신문고 서비스 안내 1쪽의 처음 화면에서 브레드크럼 링크가 빠졌습니다.

## 1. KRDS가 정해 둔 것

출처: [KRDS 누리집](https://www.krds.go.kr) 8쪽, [HTML 키트 GitHub](https://github.com/KRDS-uiux/krds-uiux) (최신 릴리스 1.1.0, 2026-01-12)

| 구분 | 내용 |
| :---- | :---- |
| 화면 구조 부품 | 건너뛰기 링크, 공식 배너, 운영기관 식별자, 헤더(통합검색·메인 메뉴), 푸터, 브레드크럼, 사이드 메뉴, 콘텐츠 내 탐색, 페이지네이션, 긴급 공지 |
| 서비스 패턴 | 방문, 검색, 로그인, 신청, 정책정보 확인. 각각 필수·권장·우수 3단계 |
| 순서 규칙 | 건너뛰기 링크는 맨 첫 요소, 공식 배너보다 앞. 공식 배너는 모든 화면 맨 위 |
| 적용 대상 | 행정·공공기관이 운영하는 모든 웹사이트·모바일 웹·앱이 "준수해야 한다"고 씀. 다만 공공기관의 공식 배너·식별자는 "선택" |
| 라이선스 | GitHub 저장소에 라이선스 표시 없음 → **키트 코드를 이 저장소에 복사하지 않음** |

**HTML 키트에서 확인한 표식** (코드 예시 13개에서 직접 확인)

| 부품 | 표식 |
| :---- | :---- |
| 건너뛰기 링크 | `id="krds-skip-link"` |
| 공식 배너 | `id="krds-masthead"` |
| 헤더 | `<header id="krds-header">`, 안에 `<nav>` |
| 메인 메뉴 | `nav.krds-main-menu` |
| 브레드크럼 | `<nav class="krds-breadcrumb-wrap" aria-label="현재 경로">` |
| 사이드 메뉴 | `nav.krds-side-navigation`, `role="menubar"`·`aria-current="page"` |
| 콘텐츠 내 탐색 | `nav.krds-in-page-navigation-area` |
| 긴급 공지 | `.krds-critical-alerts` |
| 페이지네이션 | `.krds-pagination` |
| 푸터 | `<footer id="krds-footer">`, 안에 `.krds-identifier` |
| 버튼 위계 | `.krds-btn.primary` / `.secondary` / `.tertiary` |
| 탭 | `.krds-tab-area`, `role="tablist"`·`role="tab"` |

## 2. 실제 사이트에서 얼마나 쓰나

저장 화면(`tmp/site-survey-html-20261101b`, 23개 사이트 136쪽)에서 class·id와 파일 이름을 셌습니다.

| 사이트 | 페이지 | 찾은 것 |
| :---- | :---- | :---- |
| 국민신문고 | 4 | `krds-header`·`krds-main-menu` 4쪽, `krds-breadcrumb-wrap` 3쪽, `krds-btn`, `krds-tab-area` |
| 국민건강보험공단 | 8 | `krds.min.css`·`krds.min.js` 파일, 구조 class는 없음(`krds-modal`·`krds-drop-wrap`만) |
| 보건복지부 | 6 | `krds_default.css` 등 파일 이름만, 구조 class 없음 |
| 건강보험심사평가원 | 6 | `krds-drop-wrap` 1개뿐 |
| 나머지 19곳 | 112 | 없음 |

- `krds-skip-link`·`krds-masthead`·`krds-footer`는 **0곳**입니다.
- 국민신문고의 브레드크럼 이름은 키트의 "현재 경로"가 아니라 **"브레드크럼"**이었습니다. 키트 그대로 쓰지 않고 고쳐 쓰는 사이트가 있다는 뜻입니다.
- 이전 공개 캡처(run007·run008)에서 "krds" 글자가 잡힌 것은 대부분 CSRF 값에 우연히 섞인 글자였습니다.

## 3. 엔진에서 찾은 빈틈과 수정

**문제:** 엔진은 브레드크럼 링크를 "위치 경로"로 보고 카드에서 뺍니다. 그런데 이름 규칙에 "브레드크럼"·"현재 경로"가 없었고, class 규칙에 `krds-breadcrumb-wrap`이 없었습니다. 그래서 국민신문고 서비스 안내 페이지의 처음 6칸에 브레드크럼 「고객센터」가 들어갔습니다.

**수정** (`src/navigation-utility.ts`)

- 이름: `브레드크럼`, `현재 경로`를 정확히 일치할 때만 추가 (예: "브레드크럼 안내 문서"는 해당 없음)
- class: `krds-breadcrumb-wrap`을 정확히 일치할 때만 추가. 기존처럼 `nav` 안, 항목 2개 이상일 때만 (예: `section.krds-breadcrumb-wrap`, `krds-breadcrumb-wrapper`는 해당 없음)
- 테스트 2개 추가 (`tests/navigation-utility.spec.mjs`): KRDS 표기 3종은 위치 경로, 비슷한 이름·class·nav 밖 표식 3종은 그대로

**결과**

| 검사 | 결과 | 기록 |
| :---- | :---- | :---- |
| 전체 검증 | 531/531, 실패·flaky·skip 0. core 67/69 · 45/45 · 15 추천, 성능 3종 PASS | `evidence/run010/krds-breadcrumb-verify` |
| 저장 화면 재생 136쪽 | 처음 화면이 바뀐 곳 **1쪽**: 국민신문고 서비스 안내 「고객센터」(브레드크럼) → 「국민제안」. 다른 135쪽은 그대로. 국민신문고 FAQ의 「다른 기능 보기」에서 브레드크럼 2개가 빠짐 | `evidence/run010/site-survey-replay-krds-breadcrumb` |
| 60페이지 두 모드 개발 비교 | 수정 전과 28개 행 모두 같음, 두 모드 PASS (4절) | `evidence/run010/krds-breadcrumb-development-comparison` |

## 4. 60페이지 개발 비교

60페이지(28회) 결과는 수정 전 마지막 비교(`page-types-development-comparison-3`)와 **28개 행 모두 같습니다.** 60페이지 자료에는 KRDS 브레드크럼 표기가 없어서 바뀔 것이 없었습니다.

| 모드 | 정확 | 재현 | 과제 추천 | 판정 |
| :---- | :---- | :---- | :---- | :---- |
| 기관 | 277/285 | 165/170 | 60/60 | PASS |
| 범용 | 252/265 | 145/170 | 53/60 | PASS |

## 5. 다음에 할 수 있는 것 (아직 안 함)

- **긴급 공지(`.krds-critical-alerts`)를 첫 화면 후보로:** 4곳 모두 사용 0건이라 지금은 근거가 없습니다.
- **KRDS 서비스 패턴 5종을 페이지 유형과 맞추기:** "신청"·"정책정보 확인"은 [10 페이지 유형](../10_page_types.md)의 신청서·안내 문서와 겹칩니다. 다만 KRDS는 화면 설계 지침이지 "중요한 기능 목록"이 아닙니다. 맞출 때도 사이트 조사 검토 결과를 기준으로 삼습니다.
- **KRDS 적용 사이트가 늘면 다시 셉니다.** 같은 계산은 저장 화면만 있으면 바로 다시 할 수 있습니다.

## 한계

- KRDS 누리집은 8쪽만 읽었습니다. 헤더·메인 메뉴·탭의 접근성 규칙 본문은 키트 코드로만 확인했습니다.
- 사이트 수 23곳은 공공 웹 전체가 아닙니다. 적용률 4/23은 이 표본에서의 숫자입니다.
- 사람 확인(설치·VoiceOver·확대·관찰)은 이번에도 0건입니다.
