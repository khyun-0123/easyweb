import json,pathlib,datetime,urllib.parse,hashlib
R=pathlib.Path.cwd();B=R/'docs/evidence/run008/blind-v10-support';S=R/'evaluation/blind-v10/sites';S.mkdir(parents=True,exist_ok=True)
selected={x['siteId']:x for x in json.loads((B/'selected-pages.json').read_text())}
# Categories below were assigned from observed public controls and their current-page context, before any product execution.
manual={
'city':{'search':[10],'login':[19],'notice':[54,808], 'apply':[7,785,786,789,790,792,793,811,812,821,822,824], 'help':[22,777,787,788,791,794,800,810,823,986,987,988,989,990,991]},
'government':{'search':[66,206,211,212], 'login':[], 'notice':[57,201,233,234], 'apply':[192,241,242], 'help':[8,22,28,33,39,47,193,197,198,199,200,202,203,223,224,225,226,227,228,229,230,231,232,236,237,238,239,240,243,244]},
'public-agency':{'search':[21,536,537,538,541,542,543,544], 'login':[35,621], 'notice':[85], 'apply':[7,37,515,517,518,519,520,521,522,523,525,526,529,530,531,532,533,534], 'help':[5,6,47,68,102,528,616,617,618,619,620,627,628]},
'smu':{'search':[276], 'login':[260], 'notice':[219], 'apply':[258], 'academic':[181,190,200,296,311,312,313,314,379,380,390,391], 'help':[172,393,394,395,396,397,398,399]},
'library':{'search':[1120,1125], 'login':[1121,1122], 'notice':[1476], 'apply':[1483], 'help':[1123,1145,1177,1193,1205,1464,1465,1466,1467,1468,1469,1470,1471,1477,1489,1492,1493,1496,1497,1498,1499,1511,1513,1514,1515,1516,1517,1518,1519,1520,9313,9314,9315,9316,9323,9324,9325,9326,9327]}
}
expected={
'city':[
 ('petition-entry','apply','민원신청(국민신문고) 바로가기',['city-c0824'],'현재 본문 문의처 아래의 실제 민원신청 외부 진입 링크이다.'),
 ('petition-status','apply','나의민원보기',['city-c0822'],'현재 민원 기능 탭에서 신청한 민원 확인 화면으로 이동하는 링크이다.'),
 ('public-petitions','help','민원공개',['city-c0823'],'현재 민원 기능 탭에서 공개 민원을 읽는 정보 화면으로 이동하는 링크이다.')],
'government':[
 ('board-search','search','센터 자료 검색',['government-c0211','government-c0212'],'센터 자료 목록에 붙어 있는 실제 검색어 입력과 검색 버튼이다. 입력값은 비운 채 고정 이름만 보존했다.'),
 ('center-guide','help','재난심리회복지원단 활성화를 위한 실무자 업무 가이드북',['government-c0223'],'현재 센터소식 표의 첫 자료로 실무 도움 문서를 읽는 진입이다. 가이드 문서 용도를 근거로 help로 주석했다.'),
 ('center-photo-view','help','사진자료',['government-c0202'],'현재 지원센터 콘텐츠의 사진 자료 화면을 여는 버튼이다. 공지 작성이나 상담 신청과 구별한 읽기 기능이다.')],
'public-agency':[
 ('service-search','search','증명서 서비스 검색',['public-agency-c0541','public-agency-c0542'],'현재 증명서 발급 목록을 찾는 실제 검색 입력과 버튼이다.'),
 ('certificate-details','help','가입자 가입증명(국/영문) 상세보기',['public-agency-c0545'],'현재 첫 서비스 카드의 설명 화면 링크이며 실제 발급하기와 구분된다.'),
 ('certificate-issue-entry','apply','가입자 가입증명(국/영문) 발급하기',['public-agency-c0546'],'현재 첫 서비스 카드의 실제 발급 업무 진입이며 인증 필요 안내와 명시 JS가 있다. 자동 실행하지 않는다.')],
'smu':[
 ('scholarship-rule','academic','장학금 지급규정 다운로드',['smu-c0390'],'현재 장학금 지급규정 표의 학사 규정 PDF 다운로드이다.'),
 ('scholarship-detail-rule','academic','장학금 지급에 관한 시행세칙 다운로드',['smu-c0391'],'현재 같은 표에서 별도 운영 세칙 문서를 제공하는 다운로드이다. 표 셀의 문서 종류를 보존했다.'),
 ('loan-information','academic','학자금 융자제도',['smu-c0314'],'현재 장학 메뉴에서 학자금 융자제도 안내라는 다른 문서로 이동한다. 다른 문서 fragment이므로 일반 이동이다.')],
'library':[
 ('old-books-room','help','고문헌실 안내',['library-c1514'],'현재 본관 자료실 표의 고문헌실 정보 레이어를 여는 명시 handler가 있다. 안내 문서이며 자료 신청 업무가 아니다.'),
 ('book-reading-room','help','도서자료실 안내',['library-c1516'],'현재 본관 자료실 표의 인문·사회·자연과학 도서자료실 안내 레이어이다.'),
 ('literature-room','help','문학실 안내',['library-c1519'],'현재 본관 자료실 표의 문학실 안내 레이어이다. 도서관 안에서 자료를 읽는 장소 정보 기능이다.')]
}
tasks={
'city':('공개된 민원을 읽기 위해 현재 민원신청 페이지의 민원공개 메뉴를 찾아 주세요.','city-c0823'),
'government':('센터소식에 올라온 재난심리회복지원단 실무자 업무 가이드북을 읽을 수 있는 원본 위치를 찾아 주세요.','government-c0223'),
'public-agency':('가입자 가입증명(국/영문)의 발급 조건과 절차 설명을 읽을 수 있는 상세보기로 이동해 주세요.','public-agency-c0545'),
'smu':('학자금 융자제도 안내를 읽으려고 합니다. 현재 장학 페이지에서 해당 안내로 이동해 주세요.','smu-c0314'),
'library':('문학실의 이용 안내를 읽을 수 있는 원본 위치를 찾아 주세요.','library-c1519')}
ambiguities={
'city':['민원공개는 민원 신청 버튼이 아니라 공개 민원을 읽는 화면으로 표시되어 help로 구분했다. 나의민원보기는 신청 업무의 상태 확인으로 apply로 주석했다.','일반 HTTP(S)의 target=_blank/새창 표시는 그 자체로 JS popup 실행 근거가 아니므로 navigate로 두었다.'],
'government':['센터소식이라는 표 이름과 달리 첫 항목의 실제 문서 종류는 실무 가이드북이다. 문서의 설명·도움 용도로 help로 구분했다. 사진/영상 자료는 신청 제어가 아닌 공개 정보 보기이다.','검색어 입력은 고정 검색 이름만 주석하고 값은 보존하지 않았다. 기본검색 선택 및 페이지 이동도 현재 목록 검색 보조 제어로 구분했다.'],
'public-agency':['같은 카드의 상세보기는 설명 문서 help/navigate, 발급하기는 실제 업무 진입 apply/locate로 분리했다. 미리보기는 PDF 공개 양식의 읽기 기능 help/locate이다.','로그인 일반 링크는 navigate이다. 인증서 모바일 내보내기는 명시 팝업 제어여서 login/locate로 주석했다.'],
'smu':['다운로드 두 개는 모두 장학 학사 규정 문서 academic/locate이다. 문서가 다운로드라는 이유만으로 신청 기능으로 분류하지 않았다.','학자금 융자제도와 교내/교외 장학금은 다른 문서 fragment을 가진 일반 링크라 navigate이다. 현재 문서의 장학금지급규정 탭 fragment은 locate이다.'],
'library':['자료실 이름의 원본 onclick은 안내 레이어 열기이다. 본문 문맥이 자료실 안내 표이므로 help로 구분하며 자료 신청으로 추정하지 않았다.','원본 사이드 메뉴의 트래킹 onclick도 handler가 명시되어 있으므로 보수적으로 locate로 주석했다. 일반 HTTP 링크의 숨은 효과는 추정하지 않았다.']}

def action(x,url):
 a=x['attrs'];h=a.get('href','');tag=x['tag']
 if tag in ['button','input','select','textarea'] or any(k.startswith('on') for k in a) or a.get('role')=='button' or a.get('aria-controls'):return 'locate'
 if h.lower().startswith('javascript:') or 'download' in a or '.pdf' in h.lower() or 'filedownload' in h.lower() or '/sso' in h.lower():return 'locate'
 u=urllib.parse.urlsplit(urllib.parse.urljoin(url,h));b=urllib.parse.urlsplit(url)
 if u.fragment and (u.scheme,u.netloc,u.path,u.query)==(b.scheme,b.netloc,b.path,b.query):return 'locate'
 if h.startswith('#'):return 'locate'
 return 'navigate'
summary=[]
for sid,item in selected.items():
 controls=json.loads((B/'captures'/sid/'original-controls.json').read_text()); by={x['sourceId']:x for x in controls};categories={f'{sid}-c{n:04d}':cat for cat,nums in manual[sid].items() for n in nums}
 if sid=='public-agency':
  for n in range(545,584):categories[f'{sid}-c{n:04d}']='apply' if (n-545)%3==1 else 'help'
 accepted=[];rejected=[]
 for x in controls:
  id=x['sourceId'];a=x['attrs']
  if not x['visible']:rejected.append({'sourceId':id,'reason':'원본 캡처에서 숨김·비노출 제어이다. 구조와 속성은 보존하고 최초 노출 후보로 사용하지 않는다.'});continue
  if id in categories:
   cat=categories[id]; label=a.get('title') if x['name'] in ['상세보기','발급하기','미리보기','pdf 다운로드'] else x['name']
   reason={'login':'로그인·계정 또는 인증 관련 명시 기능이다.','search':'현재 자료·서비스를 찾는 검색 또는 목록 검색 보조 기능이다.','notice':'공식 소식·공고 또는 현재 게시 목록 관련 기능이다.','academic':'학사·장학 안내 또는 관련 규정 문서 기능이다.','apply':'민원·신청·발급 등 실제 업무 진입 또는 해당 업무 확인 기능이다.','help':'이용 안내·설명 문서·공개 정보·지원 도움 기능이다.'}[cat]
   if sid=='public-agency' and 545<=x['index']+1<=583: reason='동일 서비스 카드에서 '+('실제 발급 업무를 시작하는 제어이다.' if cat=='apply' else '설명 문서 또는 공개 PDF 미리보기이다. 발급 업무 제어와 구별했다.')
   accepted.append({'sourceId':id,'category':cat,'action':action(x,item['url']),'label':label,'reason':reason,'evidence':{'tag':x['tag'],'fixedName':x['name'],'originalAttributes':{k:v for k,v in a.items() if k in ['href','onclick','target','type','role','aria-controls','aria-label','title','download']},'rowText':x['rowText'],'sourceInventory':'docs/evidence/run008/blind-v10-support/captures/'+sid+'/original-controls.json'}})
  else:
   if x['tag'] in ['input','textarea'] or x['privateEditable']:why='만족도·의견 등 사용자 사적 입력이며 검색 기능이 아니다. 값과 편집 내용은 제거했다.'
   elif a.get('role') in ['navigation','group']:why='개별 실행 제어가 아닌 원본 문맥·그룹 컨테이너이다.'
   elif a.get('href','').startswith('tel:'):why='전화 연결 기능이며 허용된 웹 이동·원본 위치 안내의 여섯 기능 범위 밖이다.'
   elif any(w in x['name'] for w in ['복사','공유','프린트','화면크기','Language','Language','Language','QUICK','퀵메뉴','SMPOPUP','관련누리집','관련단체','시 본청','구청/사업소','읍면동','특화누리집','직원','위원회','업무별 홈페이지','메뉴','바로가기','위로','TOP']):why='일반 탐색·화면·공유·편집 보조 제어이며 구체적인 여섯 기능으로 보지 않았다.'
   else:why='기관 소개·홍보·외부 SNS·인증 마크 또는 일반 탐색으로, 현재 여섯 기능의 구체적인 사용자 업무에 해당하지 않는다.'
   rejected.append({'sourceId':id,'reason':why})
 ex=[]
 for eid,cat,label,ids,why in expected[sid]:
  acts={action(by[i],item['url']) for i in ids}
  assert len(acts)==1
  assert all(i in categories and by[i]['visible'] for i in ids)
  assert all(categories[i]==cat for i in ids)
  ex.append({'id':eid,'category':cat,'label':label,'action':acts.pop(),'sourceIds':ids,'reason':why})
 instruction,taskid=tasks[sid]
 meta=json.loads((B/'captures'/sid/'capture.json').read_text())
 obs={'sourceCapture':'docs/evidence/run008/blind-v10-support/captures/'+sid,'capturedAt':meta['capturedAt'],'viewport':meta['viewport'],'fullOriginalBodyPreserved':True,'originalScriptExecutionInReplay':'blocked by CSP; no handler stubs; all network requests blocked in self-QA','allOriginalMeaningfulControlsAnnotated':True,'visibleControlCount':sum(x['visible'] for x in controls),'controlCount':len(controls),'privateValues':'removed; fixed public names retained','expectedGroupsSelectedBeforeProduct':True,'preproductAmbiguities':ambiguities[sid],'productExecutions':0}
 page={'id':item['id'],'url':item['url'],'finalUrl':meta['finalUrl'],'split':'holdout','fixture':f'evaluation/blind-v10/fixtures/{sid}.html','observation':obs,'accepted':accepted,'rejected':rejected,'expected':ex,'task':{'instruction':instruction,'action':action(by[taskid],item['url']),'expectedSourceIds':[taskid]}}
 data={'siteId':sid,'name':{'city':'천안시','government':'국민안전24','library':'국립중앙도서관','public-agency':'국민연금공단','smu':'상명대학교'}[sid],'pages':[page]}
 (S/(sid+'.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 (B/'captures'/sid/'annotation-observation.json').write_text(json.dumps(obs,ensure_ascii=False,indent=2)+'\n')
 summary.append({'siteId':sid,'pages':1,'controls':len(controls),'visibleControls':obs['visibleControlCount'],'accepted':len(accepted),'rejected':len(rejected),'expected':len(ex),'tasks':1})
(B/'annotation-summary.json').write_text(json.dumps({'status':'ANNOTATED_PREPRODUCT','productExecutions':0,'sites':summary},indent=2)+'\n')
print(json.dumps({'pages':len(summary),'expected':sum(x['expected'] for x in summary),'tasks':len(summary),'visibleControls':sum(x['visibleControls'] for x in summary),'accepted':sum(x['accepted'] for x in summary),'rejected':sum(x['rejected'] for x in summary),'productExecutions':0}))
