# v8 최초 실패 진단과 다음 구현 설계

기존 최초 결과와 동결 입력·소스를 읽은 정적 진단이다. 제품 실행·네트워크·컴퓨터 유즈·소스/정답/점수 변경은 없다. 경로·분기는 코드 추론이며 실행 trace가 아니다.

첫 화면 **10/17 정확·4/15 재현·과제1/5**, 모든 사이트 FAIL. 추가 메뉴는 **11/19·5/15·1/5**, unresolved/repeated0이다. 합집합으로 첫 화면을 대체하지 않는다.

정부·연금 페이지는 각각 후보7개→분류0개여서 순위보다 의미·구조 판별이 우선이다. 도서관 신청확인은 실제 둘째 메뉴에 있어 순위 문제다. SMU 설치 안내는 첫 화면에 있지만 학사/도움말 분류 충돌이고, 장문 유지보수 공지는 전체 메뉴에도 없다. 이 자료로 정확한 수집 누락은 확정하지 않는다.

오답7건 모두 실제 source가 accepted에 있다. category-only5건과 city action 포함2건이며, 존재하지 않는 기능을 생성한7건으로 해석하지 않는다. 신청 안내의 help/apply, IT 문서의 academic/notice/help 경계는 별도 분류 규약 검토가 필요하다. city FileDown.do의 두 양식은 명시적 download 속성이 없어 현재 일반 링크로 처리되지만 원본 근거상 파일 서비스이므로 보수적 위치 안내 보완 후보다. 최초 raw 판정은 보존한다.

| 누락 | 진단 | 근거 |
| --- | --- | --- |
| delegation-form | action-policy-and-category | Displayed first and menu: help/navigate vs accepted apply/locate. FileDown.do has no download attribute/title, filename extension or recognized download path token. sourceAction therefore treats this observable HTTP anchor as navigate. Its form-preparation role is also lost in broad guide reading. Download endpoint semantics support a product safety gap; category apply vs help requires a consistent preparation-document rubric, not merely more regex. |
| inspection-application-form | action-policy | Displayed first and menu with correct apply category, but navigate vs locate. Source FileDown.do endpoint is not recognized by current sourceAction download patterns. Expected locate is supported by the named form/file route; no file execution or MIME confirmation is claimed. |
| training-plan | semantic-classification | Visible ordinary link 훈련계획 and source-exact URL trainingPlan.do. Seven retained controls map to seven reported candidates; zero classified. Label/endpoint is outside generic help keywords and known endpoints, while generic structure fallback lacks accepted information-topic evidence. Static inference only; rank cannot restore discarded candidates. |
| training-reference | semantic-classification | Visible ordinary link 훈련자료 to bbsList.do?menuSn=65&bbsSn=53. Seven candidates but zero classified. A bbsList endpoint cannot globally mean notice/help; local disaster-training menu semantics are needed. No per-candidate execution trace is available. |
| worker-education-overview | semantic-structure | Visible button has aria-expanded=false, fixed name 종사자교육 개요, no href. All seven retained controls correspond to seven reported candidates, zero classifications. Generic guide fallback requires an 안내 heading or other help/controlled-topic semantics; 개요/교육 context does not establish that path. No ranking loss can explain classifiedCount=0. |
| request-status | ranking | Source 신청확인 바로가기 is classified and actually displayed on menu page 2 as apply/navigate; first screen spends three slots on help tabs and two on apply breadcrumb/navigation controls. First six omit the useful status entry despite its existence. rank reserves source-backed tasks/category diversity, then comparator orders other navigation/score/length; applicationPageControl lacks 신청확인 as concrete control intent. This is ranking/page-task evidence, not extraction. |
| lifecycle-explanation | semantic-structure | Visible fragment+onclick anchor 생애주기로 보는 국민연금, href=#tabPage2, targets an actual retained content panel. Seven reported candidates and zero classifications match seven source controls. Generic information collection requires help purpose/information peers or controlled relationships; fragment tabs lacking ARIA mapping are not established as semantic reading controls. No missing extraction is demonstrated. |
| social-protection-explanation | semantic-structure | Visible fragment+onclick anchor 사회보장제도와 국민연금, href=#tabPage3, retained panel. Same seven-candidate/zero-classified boundary; sourceAction correctly permits locate only. Taxonomy help is being used for pension explanatory reading, beyond narrow help keyword semantics. |
| pension-need-explanation | semantic-structure | Visible fragment+onclick anchor 국민연금의 필요성, href=#tabPage4, retained panel. Same seven-candidate/zero-classified boundary. Fragment target existence alone must not turn arbitrary tabs into help; an institution-scoped explanatory collection contract is required. |
| maintenance-notice | semantic-classification | Source visible board link exists for articleNo=766661. It is absent from both first and additional menus; only seven candidates are classified. IT서비스 이용안내 게시판 does not match narrow notice list heading/known endpoint itmanual, so noticeDocumentEvidence does not establish notice. Broad 샘물 academic rule can match article subject; this long label receives length penalty and can fall below55. Exact intermediate branch/score is static inference, not a captured trace. |
| application-installation | semantic-category | Displayed first and menu with source-matching URL and navigate action, but academic vs accepted help. Reasons explicitly say fixed phrase/body. Shared [샘물시스템] subject badge triggers academic rule; subject and task/document kind should be separated. Help for installation guidance vs academic for university IT material needs a written taxonomy rule. |

각 오탐의 실제 분류·액션·accepted 값과 각 누락의 source ID·원본 fixture는 JSON에 전부 기록했다. 원본 제어가 보인 경우도 분류/액션 불일치 때문에 raw 누락으로 남는다.

다음 구현은 **기관별 의미 어댑터를 범용 처리와 분리**하는 것이 타당하다. WORK_SPEC은 5개 기관 파일럿을 범위로 하고 S04에서 범용 규칙·사이트 보정을 별도 평가하도록 한다. 더 많은 범용 문구 정규식은 낯선 기관 경로·비ARIA 탭·게시판 배지·파일 서비스를 구별하지 못하면서 다른 사이트의 오탐 위험을 넓힌다. 이 결론은 어댑터의 성능 입증이 아니다.

- Choose adapters by exact observed document hostname and versioned allowed path families; verify institution boundary using URL hostname, never substring matching. Government pilot currently uses safekorea.go.kr per captured annotation, not assumed gov.kr.
- Adapters consume only generic safe fixed labels and bounded readonly source structure; return semantic evidence referencing actual retained element, public service family, document/operation kind and currentness dependencies. No fabricated controls, eval IDs, article numbers, captured positions, user input values or external code.
- Separate semantic task such as explanatory reading, service entry, prepared form, notice document and search from institution subject such as academic/IT/pension. Map to existing category under an explicit taxonomy; preserve original raw judgments and adjudicate ambiguous labels separately.
- Source-structure contracts may recognize official board rows/title badges, explanatory tab collections with same-document real panels, public service route families, and file-service routes with independent form/download evidence. Verify across broader public pages/functions in each of all five institutions, not just fifteen familiar pages.
- Keep generic privacy filtering, visibility, dangerous-operation exclusions and action policy authoritative. Adapter may request a more conservative locate result for a substantiated file route; never promote authentication/JS/download/final submission to navigate or execute original control. No permission expansion.
- Version adapter dependencies in source snapshot. Host/path/panel/heading/row/destination changes invalidate cached adapter evidence and stale actions; unknown layout or ambiguous route falls back to generic pipeline or explanatory no-result state. Never reuse a last known institution mapping on unmatched page.

다음 작업:
1. Write taxonomy/action adjudication cases first: guidance containing 신청, installation help with university subject badge, file endpoint vs ordinary similarly named guide, pension explanatory tabs. Keep first raw files unchanged; any correction is versioned and reviewed before score comparison.
2. Add adapter interface/provenance and generic-only mode without altering rank thresholds or first-six cap. Start with bounded cross-page source contracts for file forms, board document kind and explanatory panels; add independent unfamiliar synthetic fixtures.
3. Implement per-institution adapters behind exact host/path/structure guards, with explicit abstention. Add operation-kind/group evidence so a search field/button/filter does not consume three slots when a distinct relevant page task competes; compare this ranking choice separately from adapter classification.
4. Freeze generic-only, adapter-assisted source and all development variants; evaluate both on exposed development material with separate reports. Acquire independent fresh broader pages from all five institutions, keep unseen until freeze, run first once on same criteria; report per-site/all-first-six precision, recall, task recommendation and separate menu coverage. Do not restrict pilot to familiar URLs or substitute menu union.

합성 반례는 도메인 위장·경로 유사어·샘물 배지의 문서 장르 혼동·잘못된 fragment/패널·입력 canary·레이아웃 변경/SPA stale·낯선 긴 제목을 포함한다. 범용만/어댑터 추가/순위 변경을 각각 비교하고 원래 첫6개 기준을 유지한다. 기존15페이지로 범위를 줄이거나 캡처 source ID·article 번호·정답 위치를 어댑터로 사용하지 않는다. 새 독립 자료는 다섯 기관의 더 넓은 공개 페이지·기능에서 수집하고 엔진 동결 후 첫1회만 독립 결과로 기록한다.

첫 보고 SHA256: `0cfe3c22d66699fee1cb40a04cbd6407e49d94128d90f493db9afa6cf2d053ba`  
소스 동결 SHA256: `c79988249869ade1a01609ea56355e2210dcc430874cb0115c9fb1ac2e202a0d`  
자료 동결 SHA256: `954689587c7e53941772c0170264bd5763fcd004ef5dd53def77b082f71d39ef`  
현재14소스 파일의 동결 일치 여부는 JSON에 기록했다. root 판정에 따라 현재 완료4/10·S05 IN_PROGRESS/NEEDS_FIX·전체NOT_MET이다. RUN004의5/10은 당시 이력으로 보존한다.

City 양식 두 제어의 원본 고정 label은 각각 위임장 / 정보통신공사 사용전검사 신청서, href는 `/cmm/fms/FileDown.do?atchFileId=…&fileSn=0`, anchor class는 `btn btn-noline btn-icon`이다. title/download/onclick/target 속성은 없고 두 anchor 내부에는 `i.ir.ir-bbs.ir-download[aria-hidden=true]`가 있다. 정적 독립 QA도 두 건을 `explicit-download-endpoint`로 locate 판정했다. 이는 경로·아이콘의 원본 의미 해석이며 이벤트 실행 추정이 아니다. 링크 응답 Content-Disposition/MIME는 관찰되지 않았다. 현재 sourceAction은 FileDown.do나 아이콘을 읽지 않아 navigate로 분류한다. root는 FileDown.do와 원본 ir-download 아이콘을 명시적 파일 신호로 확정하고, 두 navigate 추천을 미해결 S05 요구사항 반례로 판정했다. 새 소스 버전에서 수정해야 한다. 현재 완료4/10·S05 IN_PROGRESS/NEEDS_FIX·전체NOT_MET이며, RUN004의5/10과 기존 정의 사례 통과는 당시 이력으로 보존한다.

최종 상태는 [root 다운로드 판정](file-download-root-review.json)을 따른다. 원본 최초 평가·자료·소스는 변경하지 않았다. 링크 응답 MIME·Content-Disposition·본문과 실제 실행은 UNKNOWN이다.
