# Remaining known failures after RUN007 development comparison

기존22회 비교 보고서의 정적 진단이다. 소스·자료·점수 변경, 테스트·제품 재실행·외부 수집은 없다. 아래50페이지는 모두 개발에 노출되었고 첫 결과는 보존한다.

| 자료의 가장 강한 보존 버전 | 첫 화면 정확 | 재현 | 과제 추천 | 판정 |
| --- | --- | --- | --- | --- |
| core | 72/74 | 45/45 | 15/15 | PASS |
| blind-v2 | 22/22 | 11/11 | 5/5 | PASS |
| blind-v3 | 18/18 | 11/11 | 5/5 | PASS |
| development-v4-corrected | 15/15 | 13/13 | 5/5 | PASS |
| blind-v5 | 24/25 | 13/15 | 5/5 | FAIL |
| development-v6-corrected-v2 | 26/26 | 14/15 | 5/5 | FAIL |
| development-v7-corrected | 13/18 | 11/15 | 4/5 | FAIL |
| blind-v8 | 25/26 | 15/15 | 5/5 | PASS |

중복 버전을 제외한 기대 누락은7건, raw 오답 추천은9건이다. 오답9건은 로그인 계약 미해결2·미주석 실제 검색 입력1·의미/분류 충돌6이며, 만들어낸 기능9건이라는 뜻이 아니다.

| 남은 누락 | 근거·판정 |
| --- | --- |
| blind-v5 / 크레딧 제도 | Eight equivalent help topic tabs are classified. First6 show source topics1–6; 크레딧 제도 is source topic8 and shown on menu page2. No stronger role/relationship makes this arbitrary required topic superior to the others. First-six capacity/selection miss, not extraction or semantic failure; do not special-case last item or gold topic. |
| blind-v5 / 증명서발급 | 증명서발급 is displayed as apply/navigate; gold academic/navigate describes an academic information document among sibling academic tabs. Source is a normal same-origin link to another academic document, not an actual form submission. Existing issuance keyword outranks document/tab purpose. Category convention is involved; not destination failure. |
| development-v6-corrected-v2 / 회계/세무 | 회계/세무 is a classified category-search link in searchForm .tab-select ul.tab-ul, but first screen chooses shorter peer filters 기타/건축·건설/경제·기업 plus3form readings. Required filter is shown on menu page2. All selected controls are accepted. |
| development-v7-corrected / 상세 가이드 다운로드 | Visible button.download_btn inside h4.tit, fixed name 상세 가이드 다운로드, onclick marker, locate. Candidate5 vs classified4; absent from all menus. Its own heading repeats the control name; contextsFor removes self-label and guideReading requires separate guide context. isDocumentDownload only recognizes anchors, so current button guide fallback receives insufficient context. |
| development-v7-corrected / 다전공(연계/융합전공) | Visible ordinary academic document link in .tab-outer ul.tab-ul.swiper-wrapper; target is another same-origin document. No academic context precedes it in restored fixture; following content h4 names the selected sibling topic and h5 says 정의. Current academicReading/academicLocalDestination require existing academic context; IT-board adapter does not cover these tabs. ClassifiedCount1 is only Login, so not ranking. |
| development-v7-corrected / 다전공(자기설계융합전공) | Same bounded academic tab structure and following selected-topic content relation as linked. Visible document link absent from all menus; original corrected action navigate is supported by different document path. |
| development-v7-corrected / 부전공 | Same academic tab group, visible 부전공 document link, absent from all menus. Root/shared dangerous and privacy policies remain authoritative. |

우선 수정 후보는 세 가지다. SMU 실제 tab-ul과 뒤의 선택 주제 h4를 연결해 학사 문서임을 판단하고 제목/그룹 의존 참조를 보존한다. 도서관 명시적 가이드 다운로드 버튼은 자체 고정 표제·다운로드 표식으로 읽기 의미를 인정하고, 같은 읽기 탭의 선택됨 장식은 분류용 비교에서만 분리한다. 필터 묶음은 동일 근거일 때 길이·사전순보다 원본 순서를 일관되게 유지한다. 어느 경우에도 gold ID·문서번호·query 값·기대 위치를 규칙으로 쓰지 않는다.

v5의 여덟 동등 주제 중 마지막 크레딧은 둘째 메뉴에서 이미 표시된다. 첫6개에 이 주제만 밀어넣을 추가 원본 우선 근거는 확인되지 않았다. 이름·끝 위치를 특례로 삼지 말고, 일반적인 묶음 표시/사용자 의도 설계와 첫6개 기준의 관계를 따로 검증해야 한다. 메뉴 합집합으로 현재 누락을 지우지 않는다.

추가 분류 문제는 v7 예약안내(apply/help), 검색기능 선택됨(search/help), v8 자료신청안내(apply/help), v5 증명서발급(apply/academic)이다. core의 English·브랜드 링크도 실제 링크이지만 도움말 추천 근거가 약한 legacy div#header 제어다. 정확한 제어·속성·accepted 대응은 JSON에 기록했다.

v7의 두 일반 HTTP 로그인 링크는 기존 미해결 계약이며 핸들러를 추정하지 않는다. 미주석 검색 입력은 원본에 실제 존재하고 sourceMatches1이다. core 추가 메뉴 unresolved6도 첫 화면 통과와 별도의 대응 한계로 보존한다. raw v6→category정정→fixture복원, raw v7→별도 action정정 수치도 JSON에 병기했다.

**v8 개발 통과25/26·15/15만으로 S07을 완료할 수 없다.** v5·v6-v2·v7정정본이 실패하고, 이 진단은 독립 품질·실사이트 과제·성능·설치·접근성·실증 증거를 추가하지 않는다. S07은 IN_PROGRESS/NOT_MET을 유지한다.

비교 보고 SHA256: `df2b1ee67d45a56d59a30a4ba64eb66ee95315bf7fa1233d86cc4eb3a677457c`. 현재 소스와 비교 당시15파일 해시는 전부 일치한다. 개별 보고서·원본/정정 fixture·주석·소스 해시는 JSON에 기록했다.
