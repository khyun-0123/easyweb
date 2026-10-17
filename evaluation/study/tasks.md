# 공개 과제 카드 v1

상태: 준비 완료 / 실제 실증 미실시. 원본은 `evaluation/sites/*.json`이며 `plan.json`에 SHA256과 과제 스냅샷을 고정했습니다. `data-eval-id`는 로컬 정답 매핑용이며 실제 사이트에서 찾을 수 있는 DOM 식별자가 아닙니다.

참여자에게는 시작 URL·과제 문장만 읽어 줍니다. 아래 정답 표시는 진행자용입니다. 성공은 공개 링크의 올바른 목적지 또는 원본 제어까지의 도달이며 실제 검색·인증·신청·다운로드·제출 완료가 아닙니다.

## city-home-open-counseling · 천안시청

시작: https://www.cheonan.go.kr/kor.do

참여자 문장: 자주 찾는 서비스에서 무료상담운영 안내 페이지에 도달하세요.

진행자 판정:

- 공개 목적지 도달 · 무료상담운영 · https://www.cheonan.go.kr/kor/sub01_03_02.do

navigate는 관찰 정답의 공개 목적지 URL과 화면을 확인한 시점에 멈춥니다. 링크가 보이거나 카드가 추천된 것만으로 성공 처리하지 않습니다.

## city-civil-guide-open-passport-guide · 천안시청

시작: https://www.cheonan.go.kr/kor/sub01_01_01.do

참여자 문장: 민원 신청안내 페이지의 왼쪽 메뉴에서 여권 신청안내 페이지에 도달하세요. 실제 신청은 하지 마세요.

진행자 판정:

- 공개 목적지 도달 · 여권 신청안내 · https://www.cheonan.go.kr/kor/sub01_01_06.do

navigate는 관찰 정답의 공개 목적지 URL과 화면을 확인한 시점에 멈춥니다. 링크가 보이거나 카드가 추천된 것만으로 성공 처리하지 않습니다.

## city-counseling-open-public-notices · 천안시청

시작: https://www.cheonan.go.kr/kor/sub01_03_02.do

참여자 문장: 무료상담운영 페이지의 공고/고시 바로가기 링크에 도달하세요.

진행자 판정:

- 공개 목적지 도달 · 공고/고시 바로가기 · https://www.cheonan.go.kr/prog/saeolGosi/GOSI/kor/sub02_02_01/list.do

navigate는 관찰 정답의 공개 목적지 URL과 화면을 확인한 시점에 멈춥니다. 링크가 보이거나 카드가 추천된 것만으로 성공 처리하지 않습니다.

## gov-home-task · 국민안전24

시작: https://www.safekorea.go.kr/safekorea-kor/main/main.do

참여자 문장: 국민안전24 홈에서 검색 페이지로 이동하세요. 검색어는 입력하지 않습니다.

진행자 판정:

- 공개 목적지 도달 · 검색 · https://www.safekorea.go.kr/safekorea-kor/main/searchMain.do

navigate는 관찰 정답의 공개 목적지 URL과 화면을 확인한 시점에 멈춥니다. 링크가 보이거나 카드가 추천된 것만으로 성공 처리하지 않습니다.

## gov-search-task · 국민안전24

시작: https://www.safekorea.go.kr/safekorea-kor/main/searchMain.do

참여자 문장: 검색어 입력 제어를 찾아 원본 위치로 안내받으세요. 입력과 검색 실행은 하지 않습니다.

진행자 판정:

- 원본 제어 도달 · 검색어을 입력하세요.

locate는 해당 원본 제어가 보이고 초점/강조 대상이 맞는지 확인한 시점에 멈춥니다. 제어를 대신 누르거나 팝업·다운로드를 실행하지 않습니다.

## gov-help-task · 국민안전24

시작: https://www.safekorea.go.kr/safekorea-kor/footer/info/answerQuestions.do?isFooter=Y&menuSn=2506&siteSeCd=COM000406

참여자 문장: 국민신문고 홈페이지 바로가기 원본 버튼을 찾으세요. 버튼을 누르거나 민원을 접수하지 않습니다.

진행자 판정:

- 원본 제어 도달 · 국민신문고 홈페이지 바로가기

locate는 해당 원본 제어가 보이고 초점/강조 대상이 맞는지 확인한 시점에 멈춥니다. 제어를 대신 누르거나 팝업·다운로드를 실행하지 않습니다.

## library-home-task · 국립중앙도서관

시작: https://www.nl.go.kr/

참여자 문장: 첫 화면의 검색어 입력 제어를 찾아 원본 위치로 안내받으세요. 입력하거나 검색하지 않습니다.

진행자 판정:

- 원본 제어 도달 · 검색어 입력

locate는 해당 원본 제어가 보이고 초점/강조 대상이 맞는지 확인한 시점에 멈춥니다. 제어를 대신 누르거나 팝업·다운로드를 실행하지 않습니다.

## library-search-task · 국립중앙도서관

시작: https://www.nl.go.kr/NL/contents/N10100000000.do

참여자 문장: 뷰어프로그램 안내 공개 페이지의 링크로 이동하세요. 프로그램을 내려받지 않습니다.

진행자 판정:

- 공개 목적지 도달 · 뷰어프로그램 안내 · https://www.nl.go.kr/NL/contents/N71300000000.do

navigate는 관찰 정답의 공개 목적지 URL과 화면을 확인한 시점에 멈춥니다. 링크가 보이거나 카드가 추천된 것만으로 성공 처리하지 않습니다.

## library-help-task · 국립중앙도서관

시작: https://www.nl.go.kr/NL/contents/N71300000000.do

참여자 문장: 통합뷰어 설치 다운로드 원본 링크를 찾으세요. 다운로드하거나 프로그램을 설치하지 않습니다.

진행자 판정:

- 원본 제어 도달 · 통합뷰어 설치 다운로드

locate는 해당 원본 제어가 보이고 초점/강조 대상이 맞는지 확인한 시점에 멈춥니다. 제어를 대신 누르거나 팝업·다운로드를 실행하지 않습니다.

## agency-home-task · 국민연금공단

시작: https://www.nps.or.kr/main.do

참여자 문장: 새소식 전체 목록으로 이동하세요.

진행자 판정:

- 공개 목적지 도달 · 새소식 더보기 · https://www.nps.or.kr/pnsgdnc/newgdnc/getOHAE0001M0List.do?menuId=MN24000897

navigate는 관찰 정답의 공개 목적지 URL과 화면을 확인한 시점에 멈춥니다. 링크가 보이거나 카드가 추천된 것만으로 성공 처리하지 않습니다.

## agency-notice-task · 국민연금공단

시작: https://www.nps.or.kr/pnsgdnc/newgdnc/getOHAE0001M0List.do?menuId=MN24000897

참여자 문장: 국민연금 「점심시간 휴무제」 실시 안내 공개 게시글의 링크로 이동하세요.

진행자 판정:

- 공개 목적지 도달 · 국민연금 「점심시간 휴무제」 실시 안내 · https://www.nps.or.kr/pnsgdnc/newgdnc/getOHAE0001M1.do?menuId=MN24000897&pstId=ZZ202600000000001125&hmpgCd=01&hmpgBbsCd=BS20240137&sortSe=FR&pageIndex=1&searchText=&searchGbu=

navigate는 관찰 정답의 공개 목적지 URL과 화면을 확인한 시점에 멈춥니다. 링크가 보이거나 카드가 추천된 것만으로 성공 처리하지 않습니다.

## agency-faq-task · 국민연금공단

시작: https://www.nps.or.kr/pnsinfo/ntpsklg/getOHAF0095M0.do?menuId=MN24001131

참여자 문장: “국민연금제도는 무엇이고, 도입 배경에 대해 알려주세요.” 질문의 원본 제어를 찾으세요. 자동 펼침은 하지 않습니다.

진행자 판정:

- 원본 제어 도달 · Q국민연금제도는 무엇이고, 도입 배경에 대해 알려주세요.

locate는 해당 원본 제어가 보이고 초점/강조 대상이 맞는지 확인한 시점에 멈춥니다. 제어를 대신 누르거나 팝업·다운로드를 실행하지 않습니다.

## smu-home-open-academic-calendar · 상명대학교

시작: https://www.smu.ac.kr/kor/index.do

참여자 문장: 학사안내를 통해 공개 학사일정 페이지에 도달하세요.

진행자 판정:

- 공개 목적지 도달 · 학사안내 · https://www.smu.ac.kr/kor/life/academicCalendar.do

navigate는 관찰 정답의 공개 목적지 URL과 화면을 확인한 시점에 멈춥니다. 링크가 보이거나 카드가 추천된 것만으로 성공 처리하지 않습니다.

## smu-notices-reach-notice-search · 상명대학교

시작: https://www.smu.ac.kr/kor/life/notice.do

참여자 문장: 통합공지에서 검색어 입력 위치를 찾으세요. 검색어 입력이나 제출은 하지 마세요.

진행자 판정:

- 원본 제어 도달 · 검색어를 입력해 주세요

locate는 해당 원본 제어가 보이고 초점/강조 대상이 맞는지 확인한 시점에 멈춥니다. 제어를 대신 누르거나 팝업·다운로드를 실행하지 않습니다.

## smu-calendar-open-calendar-list · 상명대학교

시작: https://www.smu.ac.kr/kor/life/academicCalendar.do

참여자 문장: 학사일정의 리스트로 일정 보기 링크에 도달하세요.

진행자 판정:

- 공개 목적지 도달 · 리스트로 일정 보기 · https://www.smu.ac.kr/kor/life/academicCalendar.do?mode=list

navigate는 관찰 정답의 공개 목적지 URL과 화면을 확인한 시점에 멈춥니다. 링크가 보이거나 카드가 추천된 것만으로 성공 처리하지 않습니다.
