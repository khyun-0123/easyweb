# RUN-007 최초 평가 뒤 범용 누락 진단

상태: **EXPOSED_DEVELOPMENT_DIAGNOSTIC**. v0.8 동결15소스와 v9-v2 자료를 읽은 다음의 개발 분석이며, 다음 버전의 작업 근거다. 소스·테스트·정답은 변경하지 않았다.

최초 결과는 **정확26/30·재현2/15·과제0/5, FAIL** 그대로다. 추가 메뉴 **60/73·5/15·2/5**, unresolved/repeated0은 별도 관찰이며 첫 화면 인수를 대체하지 않는다. 고유 페이지는55개다.

## 확인한 단계

- 기대15기능의 원본18제어가 전부 수집됐다. 수집 누락은 없다.
- generic/institution은 다섯 페이지에서 후보·순위가 완전히 같고, 기관 보정 적용0이다.
- 기대10개는 분류 전부 누락,5개만 분류된다. 분류된5개 중3개가 첫 화면에서 밀린다. 최대6개나 threshold를 변경해도 미분류10개는 복구되지 않는다.
- 모든 기대 원본 액션은 주석과 일치한다. 환급 일반 링크는navigate, 명시적 JS·첨부·fragment·버튼은locate다. 이 진단으로 S05 액션 결함을 재개할 근거는 확인하지 못했다.
- 전체 후보274→분류75→목적지/원본 중복 제거 후 제공73이다. 첫 화면30개에는 검색·로그인·넓은 지역 메뉴가 상당 부분을 차지한다.

## 기대 기능별 실제 상태

두 분류 모드가 같으므로 아래 분류는 공통값이다. 같은 기대 기능의 원본 대안이 여러 개면 순서대로 적었다. 실제 추가 UI 도달 화면은 최초 보고서에서 가져왔다.

| 사이트 | 기대 원본 기능 | 분류/과제/점수 | 원본 액션 | 표시 |
| --- | --- | --- | --- | --- |
| cheonan | 여권신청서 | apply 70 / 미분류 | locate | 추가 UI 3 |
| cheonan | 전입신고서 | 미분류 / 미분류 | locate | 없음 |
| cheonan | 혼인신고서 및 이혼신고서 | 미분류 / 미분류 | locate | 없음 |
| nl | 출력 | 미분류 | locate | 없음 |
| nl | 우편복사 | 미분류 | locate | 없음 |
| nl | 복사·출력 사이버머니 환급 | 미분류 | navigate | 없음 |
| nps | 보험료 금액 및 보험료율 | 미분류 | locate | 없음 |
| nps | 보험료 납부기한 | 미분류 | locate | 없음 |
| nps | 지역가입자 연금보험료 지원 | 미분류 | locate | 없음 |
| safekorea | 생활안전점검표 다운로드 | 미분류 | locate | 없음 |
| safekorea | 생활안전점검 리스트 시작 | 미분류 | locate | 없음 |
| safekorea | 재난대비안전점검 | help/reading 65 | navigate | 첫 4 |
| smu | 학사제도 안내서 "유연하게 엄정하게" | academic/reading 70 | navigate | 추가 UI 2 |
| smu | 학사제도 및 강의시간표 안내책자 | academic/reading 70 | navigate | 추가 UI 3 |
| smu | 교육과정 | academic/reading 70 | navigate | 첫 1 |

## 본문 구조와 원인

### 서식 표

본문 제목은 ‘민원서식 작성예시 QR코드’이며, 표는 POST form으로 감싸져 있다. 제목 제어는 type 미지정 button이어서 form 소유 기본 submit이다. 같은 행에 고정 서식명과 HWP/ZIP 첨부 앵커가 있다. 여권 제목만 일반 신청 키워드로apply70이며 pageTask가 없어 첫 화면 밖16번째 제공/UI3에 나온다. 나머지 두 신고서는 일반 신청 키워드가 없어 빠진다.

[analyzer.ts:427](/Users/khyun_03/easyweb/src/analyzer.ts:427)의 materialRow는 form 내부 표를 제외하고, 제목은a[href], 첨부는 짧은 정확 다운로드명만 지원한다. [classifier.ts:103](/Users/khyun_03/easyweb/src/classifier.ts:103)의 서식 읽기는 제목 끝·문맥·액션 제약을 함께 요구한다. 수정은 **첨부 앵커←유일한 같은 행 고정 서식명** 관계를 먼저 다뤄야 한다. 기본 submit 제한을 통째로 해제하거나 handler의 return false를 실행 허가로 쓰면 안 된다.

### 짧은 안내 탭·환급 진입

출력·우편복사는 body의role=group 슬라이드이며, 이미 grouped=true/topicPeers2/controlledTopic=true다. 문맥 제목은 ‘자료복사·출력’, ‘도서관 이용’이지만 도움말 목적이나안내 어미가 없어 [classifier.ts:300](/Users/khyun_03/easyweb/src/classifier.ts:300)의 guideReading을 만족하지 않는다. 인접 콘텐츠의 ‘이용 안내’는 의미 heading이 아닌div다. 임의 div 문구나 멀리 있는 안내 제목을 모두 읽는 완화는 정당화되지 않는다.

환급 제어는 일반HTTPS 앵커이고, 가까운h4가 환급 안내다. 자기 이름에 기존 신청·접수·예약 의도가 없어 미분류다. 환급 절차 문서와 환급 진입을 분리하는 좁은 의미 명세가 필요하다.

### local fragment 설명 탭

세 연금보험료 탭은 같은ul의#fragment 제어다. 대상은 같은 지역의 비활성 패널이며, 고정h4가 탭 이름과 일치하고 입력·버튼·링크 수0이다. [analyzer.ts:342](/Users/khyun_03/easyweb/src/analyzer.ts:342)는 관계를aria-controls 위주로 판단해 href fragment를 연결하지 못한다. 따라서 linkedTopic/controlledTopic=false이고, 현재 활성 패널의 ‘특징’ 등만 보조 제목으로 남는다. 납부기한은 추가로 [classifier.ts:449](/Users/khyun_03/easyweb/src/classifier.ts:449)의 위험 문구 차단을 만난다.

같은 지역의 유일한fragment 대상·고정 제목 일치·읽기 전용 구조를 확인하는 관계가 먼저다. 비활성 패널의 **고정 편집자 heading**만 읽는 명시적 예외와 의존성 현재성이 필요하며, 숨김 텍스트 전체 수집이나 payment/delete URL·script 차단 해제로 확장하면 안 된다.

### 점검 자료·안내 시작 제어

점검표 다운로드는 명시적type=button, help 목적이지만 독립 점검표 자료 의미가 없다. isDocumentDownload는 앵커만 다루고, 기존 버튼 읽기는 가이드·매뉴얼 이름에 한정된다. 원본 locate 액션은 이미 맞으므로 액션 정책 변경부터 할 필요가 없다. 체크리스트 시작도 singleton 버튼으로, 고정 안내 heading은 있으나 일반 시작 의미만으로는 읽기 제어를 확정하지 못한다. 둘은 서로 다른 의미 계층으로 명세해야 하며, 아무Start/다운로드를help로 만드는 보완은 제외한다.

### 현재 페이지 과제와 넓은 메뉴의 순위

학사 안내서 두 개는 academic70/reading으로 올바르게 분류되지만 첫 화면 밖12·13번째 제공/UI2·3이다. 넓은 주제ul의 세 후보가 최초 과제 자리를 쓰고, [ranker.ts:133](/Users/khyun_03/easyweb/src/ranker.ts:133)의 다양성이 검색·수강신청·로그인을 선택한다. 별도 세부 안내ul은 뒤로 남는다. 현재 순서 보존은 **각 목록의 기존 위치 안에서만** 작동하므로 전역DOM 순서 적용이나 목록 뒤집기로 해결할 문제가 아니다.

도서관·연금 쪽의primary 지역 메뉴도 읽기pageTask로 승격되어 예약 공간을 차지한다. 안전 사이트의div 기반 사이드바는 의미nav가 없어body로 수집된다. 따라서 body 여부만을 강한 현재 콘텐츠 근거로 사용할 수 없다. 선택된 상위 항목→현재 내용 제목→하위 문서 목록 같은 명시적 관계와 근거 수준을 설계해야 한다. 여섯 개·분류 다양성·원본 대안 보존을 함께 검사해야 한다.

추가 메뉴에는Home breadcrumb와 본문/대메뉴 이동skip 링크도help로 오인됐다. [classifier.ts:225](/Users/khyun_03/easyweb/src/classifier.ts:225)의 페이지 목적·정보 동료 전파에서 문서 위치 제어와 단순 분기 토글을 구분할 필요가 있다.

## 다음 버전 우선순위와 반례

### 1. bounded-fragment-explanation

Missing positive relation for readonly local fragment explanations, including inactive panels and payment-related information subjects.

범위: analyzer structural evidence + classifier narrowly verified reading branch + snapshot/page-session dependencies; no current implementation authorized.

합성 양성: Unknown municipal fee-rate/deadline links point to sibling inactive readonly panels whose fixed headings match their names. / Two support-benefit explanation tabs, each with a unique local target and fixed subject heading, are help reading while a separate apply link remains apply.

필수 반례: Missing/duplicate target or percent-encoded invalid fragment / Target in article/form/editor/global nav or another semantic region / Heading/name mismatch or whole-page body target / Hidden target with user input, payment/submit/delete controls, or hidden arbitrary text only / Dangerous raw URL/onclick remains rejected even with matching heading / Same-text panel/heading node replacement and same-frame click must invalidate old cards

제약: Read only bounded fixed editorial headings. A hidden inactive explanation heading is an explicit exception to visibility, never a global hidden-text scan. Keep hard URL/script checks first.

### 2. row-preparation-attachment

Forms inside wrapper forms lose fixed table-row attachment meaning; default submit title buttons cannot simply be promoted.

범위: Bounded column/row relationship for existing locate attachment anchors; retain form/input/submit protections and source actions.

합성 양성: A generic request-template table wrapped by a POST form has fixed title and attachment columns; safe attachment anchors borrow relatedLabel from the unique same-row template title. / A short declaration-form title may have a parenthetical modifier and an attachment with a generic ZIP name; the relationship supplies reading purpose, not URL tokens.

필수 반례: Default-submit or destructive form buttons stay excluded from the new reading path / Editable/input-backed row title getter canaries / Multiple competing title columns or unrelated attachment subjects / Ordinary report/archive/software ZIP under a news or article table / Nested table cells, hidden/untrusted row title, broken column mapping / Row title/column marker/source replacement invalidates old cards

제약: Do not remove !form globally or infer permission from a handler return false. Prefer attachment anchors; keep same-source action and never download/submit.

### 3. current-content-relevance

Generic pageTask covers both broad local navigation and current-content tasks; source-order ties alone do not select the current subordinate group.

범위: Explicit evidence level/group relation before existing category diversity; preserve max6, thresholds and deterministic group-position ordering.

합성 양성: A broad program-subject list plus a current-topic detail list with two unknown guide-document labels; explicit selected parent/content heading identifies the latter. / Verified current-content reading control versus visible global login/search and broad sidebar navigation.

필수 반례: Unrelated sibling list or later article headline must not borrow current-topic relevance / A sidebar div without nav semantics must not become high relevance merely because context says body / Renaming, reordering or array shuffling must not encode an expected position / Score/category diversity differences and legitimate local alternative routes remain meaningful / Nested popup/submit/editor controls never acquire relevance

제약: Global DOM order, reversing list order, label length boosts or a larger card cap are insufficient. This needs a source relationship, not a list of preferred labels.

### 4. navigation-utility-boundaries

Page-purpose/information-peer fallback promotes breadcrumbs, skip links and submenu group toggles as help reading tasks.

범위: Generic collection semantics and rank relevance boundaries; treat current annotations as given, do not silently recategorize first result.

합성 양성: Real local instructions list with independent help/info peer remains available. / A direct leaf reading control stays distinct from its parent menu-expansion toggle.

필수 반례: Breadcrumb Home next to an 이용안내 peer is not a help document / Help page skip links to main/navigation are not content-reading tasks / A parent menu toggle with nested list is not equivalent to each child guide / Unknown label variants and alternative semantic breadcrumb/list structures

제약: Distinguish document-position controls and branch expanders before reading fallback; do not rely on captured IDs or one exact Korean skip-label spelling.

### 5. guide-group-and-material-purpose

Existing grouping is detected for short copy/printing guidance links, but a narrowly guide-suffixed heading is missing; standalone checklist material is not covered.

범위: Generic explicit local purpose relationships where available, otherwise institution semantic rules with declared limited support.

합성 양성: A small group of short service-guidance tabs connected to a fixed local guide heading/readonly description branch. / A safety-instructions region contains a type=button document checklist download, alongside unrelated controls.

필수 반례: Browser/page print utility, gallery and generic file/download/install controls / Apply-form downloads must remain preparation apply rather than help / Unrelated neighbouring guide heading, form inputs or external payment flow / No reading-purpose evidence: leave unclassified rather than treating every group as help

제약: Do not add all 출력/복사/다운로드 as generic help keywords or scan page prose globally.

### 6. refund-and-guided-entry-specification

Refund entry and guided checklist launch have real source controls but their own names are not existing application/help grammar.

범위: Separate carefully specified semantic entry families; lower confidence than explicit fragment/row relationships.

합성 양성: An ordinary fixed refund-entry link under an explicit refund heading stays navigate and gets entry semantics. / A singleton type=button under fixed self-check guidance is source-located only, without computing or reading answers.

필수 반례: Refund-method explanation versus refund entry / Refund or payment execution URL/handler, submit button, login-task conflict / Arbitrary Start/시작, game launch, final submission or payment-start controls / Radio/textarea/contenteditable values or long unbounded explanatory prose

제약: Avoid broad start/refund subject keyword shortcuts. Manual semantic specification and synthetic contradictions should precede implementation.

## 증거 경계

[상세 JSON](post-first-generic-diagnosis.json)은 원본18제어별 안전 이름·액션·분류·점수·pageTask·DOM 조상·collection/supplemental 근거·fragment 대상·순위를 보존한다. Runtime stage 사실과 정적 소스에 근거한 분기 원인 추론을 구분했다. 독립 정적 검토도 같은 구조적 원인과 submit·숨김·stale 반례에 동의했다.

동결 엔진15파일 해시가 실행 전후와 보고 시점에 일치하고, 자료 동결11항목도 일치한다. 다섯 첫 선택 원본 순서가 최초 결과를 재현한다. 원본 최초 결과 SHA256은 dbfe766cba9b28737b7ab84db571e4c4d5d36d226483604c4775c128f4279be8이며 진단 후 바뀌지 않았다. 모든 페이지는 별도 headless isolated world에서 로컬동결HTML로 요청을 충족하고 나머지 통신을 차단했다. CUA·native·기존 프로필/서버 변경0이다. 제품 품질 재채점·전체 검사·성능·업무 실행·실제 설치·사람 실증은 하지 않았다. 이 분석은 어떤 수정의 성공도 입증하지 않는다.
