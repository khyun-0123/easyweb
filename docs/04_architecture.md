# **04 구조도**

EasyWeb · 1인 프로젝트
버전: v1 (2026-10-31, v0.10.0 코드 기준) · 상세 설계·일정은 [08 개발 계획안](08_dev_plan.md), 권한·실패 조건은 [05 handoff](05_handoff.md)

**이 문서는 최종 문서입니다.** 코드 구조가 바뀌면 덮어씁니다.

---

## 1. Q4 기능 흐름

```
사용자가 확장 버튼(또는 Alt+Shift+E)을 누름
  → background: 현재 탭에만 content.js 주입 (activeTab)
  → content: 이미 열려 있으면 닫고, 아니면 쉬운 화면을 엶

1. 주요 기능 찾기
   analyzer   보이는 링크·버튼·검색창 수집 → 안전한 이름·주변 제목·위치·href
   classifier 이름·URL·섹션 규칙 + 근거 모듈(기관·본문·서비스/문서 관계) → 6개 분류 중 하나, 점수, 근거
   common-actions 처음 화면·로그인·회원가입·대표 전화를 찾아 카드 후보에서 분리 (홈이면 로그인은 카드에 남김)
   page-types 게시판 목록·게시글·관문 판단 → 유형 칸 먼저, 남는 칸은 ranker (게시글 4칸)
   ranker     목적지 중복 제거 → 근거 단계·분류 다양성으로 처음 6개 + 다른 메뉴 목록

2. 쉬운 화면
   easy-mode  Shadow DOM 안에 모달 화면, 카드 6개씩, 키보드 초점·상태 안내·Esc 복귀

3. 원본과 연결
   action-policy  카드가 "바로 이동"인지 "원본 위치 안내"인지 결정
   page-session   선택 직전 원본이 그대로인지 확인 (낡은 카드 차단)
   action-bridge  원본 제어로 스크롤·초점·강조 (클릭·제출은 하지 않음)
   original-notice 원본 위에 안내/실패 메시지
```

## 2. 기능별 입력 · 처리 · 출력

| Q4 기능 | Q5 화면 위치 | 입력 | 처리 | 출력 |
| ----- | ----- | ----- | ----- | ----- |
| 주요 기능 찾기 | (화면 열기 전) | 현재 페이지의 보이는 DOM. 입력값·편집 내용은 읽지 않음 | 후보 수집 → 규칙 분류 → 중복 제거·순위 | 분류된 후보 목록, 처음 6개 |
| 쉬운 화면 | 모달 전체 | 후보 목록 | 카드 렌더링, 메뉴 넘기기, 다시 찾기 | 큰 카드, 상태 안내 문구 |
| 원본 연결 | 카드의 「원본 페이지로 이동」·「원본에서 계속하기」 | 사용자가 고른 카드 | 현재성 검사 → 직접 이동 또는 원본 위치 안내 | 페이지 이동, 원본 강조, 실패 안내 |

## 3. 모듈 (`src/`)

| 모듈 | 하는 일 | 지켜야 할 것 |
| :---- | :---- | :---- |
| `background.ts` | 확장 버튼 클릭 시 현재 탭에 주입. 실패하면 `!` 배지와 안내 | 상시 실행 없음 |
| `content.ts` | 중복 실행 방지, 화면 열기/닫기 | 화면은 하나만 |
| `analyzer.ts` | 후보 수집, 안전한 이름(`getSafeLabel`), 보이는지 판단, 주변 제목 | 입력·편집 하위 트리는 건너뜀 |
| `evidence-nodes.ts` | 근거가 의존하는 고정 노드 목록 | 값이 아닌 구조만 읽음 |
| `navigation-utility.ts` | 페이지 위치·갈래 메뉴 같은 보조 탐색 판정. 브레드크럼은 정확한 이름(KRDS "현재 경로"·"브레드크럼" 포함)이나 `nav`의 정확한 class(KRDS `krds-breadcrumb-wrap` 포함)로만 판단 | 원본을 실행하지 않음 |
| `institution-evidence.ts` | 기관 사이트 의미 보정 (모드: `institution`/`generic`) | 편집용 제목만 읽음 |
| `content-evidence.ts` | 실제 본문 영역과 업무 그룹 근거 | 한 번의 분석 묶음에서만 캐시 |
| `service-relations.ts` · `document-relations.ts` · `relations.ts` | 같은 본문 업무 탭, 상세/발급, 문서 목록표·규정 PDF 등의 관계 | 매번 다시 계산, 전역 캐시 없음 |
| `classifier.ts` | 분류 규칙과 점수·근거(`reasons`). 앞단의 출처 안전 거부(위치·순서 도구, 위험 스크립트·주소, 비 HTTP(S))는 `sourceGuard`로 묶여 실험 빌드도 같이 씀. 페이지 도구(주소 복사·인쇄·점자·메뉴 바로가기)는 후보에서 제외, 위치 안내(오시는 길·지도 링크·담당자 찾기)는 help | 근거 없는 기능을 만들지 않음 |
| `common-actions.ts` | 「자주 쓰는 버튼」: 홈 페이지 판단(주소가 `/`·index·main·언어 코드), 처음 화면(같은 사이트 홈 주소 + "홈/처음으로" 이름 또는 머리 영역 로고), 로그인(분류된 짧은 "로그인"), 회원가입(정확한 이름의 일반 링크) | 고정 이름·일반 http(s) 링크만, 위험 스크립트·명령 URL 제외. 사이트별 규칙 없음 |
| `page-types.ts` | 「자주 쓰는 버튼」 분리 후 페이지 유형(list·post·gate·default)을 판단해 처음 카드 구성. 이미 분류된 요소는 분류·근거를 그대로 쓰고 카드 문구(title·description)만 더함 | 위험 이름·스크립트·명령 주소 제외(`isSafeSource`), 편집 요소 제외, 홈은 기본 규칙 + 「자주 찾는 서비스」류 제목 아래 일반 링크를 대표 서비스 후보로(홈에서만, footer 제외). 게시판 행은 글 제목 우선·검색은 날짜칸 제외, 게시글 이전/다음은 링크만 |
| `learned-hook.ts` | 기본 빌드용 빈 연결: 학습 순서를 쓰지 않음 | 기본 빌드에 모델 코드가 들어가지 않음 |
| `learned-hook.experiment.ts` · `learned-ranker.ts` · `learned-rows.ts` · `model/learned-ranker.json` | **실험 빌드 전용** (`build.mjs --learned`). 일반 페이지에서 보이는 제어 목록(조사 도구와 같은 방식)을 만들고 LambdaRank 모델로 점수를 매겨, 안전 검사를 통과한 분석 후보의 카드 순서를 정함 | 후보를 새로 만들지 않음. 분류 안 된 후보는 일반 HTTP(S) 링크만, `sourceGuard`+`isSafeSource` 통과 필수. 비밀번호 칸·로그인/인증/결제 제목 페이지 제외. 값 읽지 않음, 외부 통신 없음 |
| `ranker.ts` | 목적지 중복 제거, 처음 6개, 다른 메뉴 목록. 정책 링크(개인정보처리방침 등 정확한 이름)는 빈칸 채울 때만 | 최대 6 + 다른 메뉴 (확정 정책) |
| `easy-mode.ts` | 쉬운 화면 UI, 메뉴 넘기기, 다시 찾기 | 제품 DOM에 평가 ID를 넣지 않음 |
| `action-policy.ts` | 이동/원본 안내 결정, 다운로드·SSO 식별 | [ACTION_POLICY](ACTION_POLICY.md) |
| `page-session.ts` | 후보 현재성 검사와 변경 감시 | 모든 실행 경로에서 낡은 후보 차단 |
| `action-bridge.ts` | 원본 위치로 스크롤·초점·강조 | `click()`·submit 호출 금지 |
| `original-notice.ts` | 원본 위 안내·실패 메시지 | — |
| `types.ts` | 후보·근거 타입, 분류 6개 정의 | — |

## 4. 실행 위치와 데이터

- **실행 위치:** 사용자의 Chrome 탭 안 (확장의 isolated world). 서버 없음
- **저장:** 없음. 분석 결과는 화면이 열려 있는 동안 메모리에만 있음
- **외부 통신:** 없음. 사용자가 링크 카드를 눌러 원래 사이트로 이동할 때 생기는 일반 요청만 있음
- **권한:** `activeTab`, `scripting`
- **실험 빌드 (`dist-learned/`):** 위와 같음. 학습 모델(1.33MB JSON)이 content script에 함께 들어가 크기가 약 2.0MB가 됨

## 5. 개발 도구 구조 (제품에 들어가지 않음)

```
evaluation/             5개 기관 60페이지 정답표(sites/*.json)와 축약 fixture(HTML)
scripts/evaluate.mjs    fixture를 오프라인 headless로 열어 엔진 실행 → 정확도·재현율·과제 추천
scripts/compare-development.mjs   generic/institution 두 모드 × 14 suite 비교
scripts/benchmark*.mjs  1,000개 제어 합성 성능
scripts/a11y-check.mjs  axe·대비·키보드·재배치 21조건
scripts/verify.mjs      타입·빌드·로컬 테스트·core·성능 한 번에
scripts/package.mjs     재현 가능한 ZIP·SHA256
scripts/ml/             로컬 AI 시험 도구 (진단 전용, 09 참고)
tests/                  Playwright 회귀 493개
```

## 6. Q6 기준과 측정 위치

| 기준 | 측정 도구 | 현재 |
| :---- | :---- | :---- |
| 처음 보는 페이지 정확도 90%·재현율 85% | `evaluate.mjs --phase=fresh-blind-validation` (새 자료 + 동결) | 마지막 첫 평가 v10: 26/28 · **2/15 FAIL** |
| 분석 300ms · 화면 준비 1초 | `npm run benchmark` | 기존 3종 PASS. 범용 모드 전체 처리 327.1ms 추가진단 FAIL |
| 자동 접근성 위반 0 | `npm run test:a11y` | 21조건 PASS |
| 사람 성공률·시간 | [USER_STUDY](USER_STUDY.md) | 0건 |
