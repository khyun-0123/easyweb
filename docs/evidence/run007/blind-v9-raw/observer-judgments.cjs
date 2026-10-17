// Independent observer judgments from the saved original source controls.
// This file never imports or executes the EasyWeb implementation.
module.exports={
 cheonan:{
  name:'천안시청',
  accepted:{
   search:[10,822,823,825],login:[19],
   help:[22,776,777,778,779,781,782,783,793,799,809,810,1012,1013,1014],
   notice:[54,807],apply:[7,784,833,834,835,836,837,838,839,840,841,842,843,844,845,846]
  },
  expected:[
   {id:'cheonan-v9-passport-preparation-form',category:'apply',label:'여권신청서',numbers:[833,834],action:'locate',reason:'원본 민원서식 작성예시 목록의 여권신청서 상세 제어와 명시적 HWP 첨부파일은 신청 준비 서식이다.'},
   {id:'cheonan-v9-moving-preparation-form',category:'apply',label:'전입신고서',numbers:[837,838],action:'locate',reason:'표 행의 전입신고서 제목과 첨부 ZIP이 신청 준비 서식임을 직접 보여준다.'},
   {id:'cheonan-v9-marriage-preparation-form',category:'apply',label:'혼인신고서 및 이혼신고서',numbers:[845,846],action:'locate',reason:'표 행의 명시적인 신고서 제목과 첨부 ZIP을 원본에서 찾는 기능이다.'}
  ],
  task:{instruction:'여권 신청을 준비하며 여권신청서가 있는 원본 위치를 찾으세요. 상세 제어를 자동으로 누르거나 첨부파일을 내려받지는 마세요.',numbers:[833,834],action:'locate'},
  notes:['이 목록의 개별 문서는 신청 준비 서식이므로 apply로 주석했다. 게시판 형태만으로 notice로 분류하지 않았다.','검색 조건 선택과 검색어 입력을 함께 기록했고 실제 입력값은 사용하지 않았다.','첨부 ZIP의 이름이 반복되더라도 원본 표 행의 서식 제목과 연결해 구분했다.']
 },
 safekorea:{
  name:'국민안전24',
  accepted:{search:[66],help:[192,194,195,196,197,200,202,208,209]},
  expected:[
   {id:'safekorea-v9-checklist-document',category:'help',label:'생활안전점검표 다운로드',numbers:[197],action:'locate',reason:'안전점검 방법을 확인하는 점검표이며 신청서가 아니다. 버튼에 다운로드가 명시돼 있다.'},
   {id:'safekorea-v9-guided-checklist',category:'help',label:'생활안전점검 리스트 시작',numbers:[200],action:'locate',reason:'원본 안내문이 안전대비지수와 대비·대응방법 안내를 설명한다. 실제 체크리스트 실행은 하지 않는다.'},
   {id:'safekorea-v9-disaster-preparation',category:'help',label:'재난대비안전점검',numbers:[195],action:'navigate',reason:'같은 안전점검 영역의 별도 재난대비안전점검 안내로 가는 평문 HTTP 경로다.'}
  ],
  task:{instruction:'가정에서 점검할 내용을 읽기 위해 생활안전점검표 다운로드 제어의 원본 위치를 찾으세요. 파일을 실제로 내려받거나 점검을 제출하지 마세요.',numbers:[197],action:'locate'},
  notes:['가정안전·교통안전 radio는 실제 입력 선택 제어로 기록하고 추천 대상으로는 거절했다.','안전 체크리스트는 설명·점검 안내 help이며 신청 entry apply로 만들지 않았다.','다운로드 버튼에 고정 href나 onclick이 없으므로 숨은 이벤트의 다운로드 주소를 추정하지 않았다.']
 },
 nl:{
  name:'국립중앙도서관',
  accepted:{login:[1121],search:[1120,1125],apply:[1122,1467,1484,1513],help:[1465,1466,1468,1469,1470,1471,1472,1477,1478,1490,1493,1494,1496,1497,1498,1499,1510,1511,1512,9293,9294,9295,9296]},
  expected:[
   {id:'nl-v9-printing-instructions',category:'help',label:'출력',numbers:[1511],action:'locate',reason:'자료복사·출력 영역의 출력 이용 안내다. 원본 onclick 문자열을 보존하며 별도 목적지로 치환하지 않는다.'},
   {id:'nl-v9-postal-copy-instructions',category:'help',label:'우편복사',numbers:[1512],action:'locate',reason:'자료복사·출력 영역의 우편복사 이용 안내다. 원본 JavaScript 이벤트가 명시돼 있다.'},
   {id:'nl-v9-copy-refund-entry',category:'apply',label:'복사·출력 사이버머니 환급',numbers:[1513],action:'navigate',reason:'본문이 대상자가 직접 신청하는 메뉴라고 설명하며, 제어 자체는 명시적 인증 이벤트 없는 일반 HTTPS 앵커다.'}
  ],
  task:{instruction:'도서관에 방문하기 어려워 우편복사 이용 방법을 읽으려 합니다. 우편복사 안내 제어의 원본 위치를 찾으세요. 복사나 환급을 신청하지 마세요.',numbers:[1512],action:'locate'},
  notes:['복사 요금·장소 표의 원래 th/td와 비제어 셀을 보존했다.','복사·출력 사이버머니 환급은 실제 신청 진입 apply이며 설명을 다루는 출력·우편복사 help와 구별했다.','ssoLoginPage 원문과 각 안내 앵커의 원래 onclick을 보존했으며 핸들러 내부 URL로 교체하지 않았다.']
 },
 nps:{
  name:'국민연금공단',
  accepted:{login:[35],search:[21],apply:[5,37],notice:[85],help:[6,102,515,516,528,529,530,531,532,533,544,550,576,577,578,580,581,582,583,584,585,586,587,588,620,621,622,623,632]},
  expected:[
   {id:'nps-v9-premium-rate-explanation',category:'help',label:'보험료 금액 및 보험료율',numbers:[582],action:'locate',reason:'보험료 금액과 보험료율을 설명하는 원본 문서의 local fragment 탭이다.'},
   {id:'nps-v9-premium-deadline',category:'help',label:'보험료 납부기한',numbers:[583],action:'locate',reason:'납부기한과 연장신청 설명을 읽는 원본 문서의 local fragment 탭이다.'},
   {id:'nps-v9-regional-subscriber-support',category:'help',label:'지역가입자 연금보험료 지원',numbers:[587],action:'locate',reason:'본문은 지원대상·지원금액·신청방법을 설명하며 탭 자체는 실제 신청 entry가 아니다.'}
  ],
  task:{instruction:'국민연금 보험료의 납부기한 설명을 확인할 수 있는 원본 탭 위치를 찾으세요. 개인 조회, 로그인, 신청은 진행하지 마세요.',numbers:[583],action:'locate'},
  notes:['지원 신청방법을 설명하는 탭을 실제 신청 entry apply와 구분해 help로 주석했다.','모든 고정 JavaScript 메뉴·팝업 문자열을 보존했고 내부 인자 경로를 일반 앵커로 만들지 않았다.','설문 radio·제안 textarea·확인은 실제 입력 및 제출 제어이므로 추천에서 거절했다.']
 },
 smu:{
  name:'상명대학교',
  accepted:{login:[260],search:[276],apply:[258],academic:[181,200,219,296,315,316,317,318,319,320,321,322,323,326,327,328],notice:[342],help:[341]},
  expected:[
   {id:'smu-v9-academic-policy-handbook',category:'academic',label:'학사제도 안내서 "유연하게 엄정하게"',numbers:[327],action:'navigate',reason:'학사 안내서로 가는 원본의 일반 앵커이며 현재 문서와 다른 경로의 fragment다.'},
   {id:'smu-v9-course-handbook',category:'academic',label:'학사제도 및 강의시간표 안내책자',numbers:[328],action:'navigate',reason:'학사제도·강의시간표 안내책자로 가는 별도 문서의 일반 앵커다.'},
   {id:'smu-v9-curriculum-information',category:'academic',label:'교육과정',numbers:[316],action:'navigate',reason:'같은 학사 영역의 교육과정 정보로 가는 별도 문서의 일반 앵커다.'}
  ],
  task:{instruction:'학교의 학사제도를 읽기 위해 학사제도 안내서 "유연하게 엄정하게"를 여는 공개 안내 메뉴를 찾으세요. 수강신청이나 로그인은 진행하지 마세요.',numbers:[327],action:'navigate'},
  notes:['문서 주제가 학사 안내이므로 academic이며 안내서라는 장르만으로 일반 help로 바꾸지 않았다.','다른 문서의 fragment 앵커는 navigate, 같은 문서 fragment는 locate로 구별했다.','원본 iframe은 외부 콘텐츠를 실행하지 않는 제약 때문에 fixture에서 원래 요소와 src 속성만 남기고 CSP로 차단한다. iframe 내부 문서는 이 평가의 주석 범위가 아니다.']
 }
};
