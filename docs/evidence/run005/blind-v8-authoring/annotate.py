import json,hashlib
from datetime import datetime
from pathlib import Path
B=Path('docs/evidence/run005/blind-v8-authoring');j=json.load(open(B/'capture-observations.json'))
plan=json.load(open(B/'selected-page-plan.json'))
siteNames={'smu':'상명대학교','city':'천안시청','government':'국민안전24','public-agency':'국민연금공단','library':'국립중앙도서관'}
acceptBy={
 'smu':{**{n:'search' for n in [5,9,15,16]},**{n:'notice' for n in [17,18,19,21,23,24,25,26,27,28,29,30,31,32]},20:'help',22:'help'},
 'city':{2:'help',3:'help',4:'help',13:'help',14:'apply',15:'apply',16:'apply'},
 'government':{n:'help' for n in range(1,8)},
 'public-agency':{n:'help' for n in range(1,8)},
 'library':{**{n:'help' for n in [2,3,4,5,16,17,18]},19:'search',20:'apply'}
}
expectedBy={
 'smu':[('it-search','search','IT서비스 게시글 검색',[15,16]),('maintenance-notice','notice','서버 이관 작업에 따른 일시 순단 공지',[17]),('application-installation','help','상명대학교 어플리케이션 설치 안내',[20])],
 'city':[('certificate-entry','apply','온라인 필증발급',[14]),('delegation-form','apply','위임장 양식',[15]),('inspection-application-form','apply','정보통신공사 사용전검사 신청서',[16])],
 'government':[('training-plan','help','훈련계획 안내',[3]),('training-reference','help','훈련자료',[4]),('worker-education-overview','help','종사자교육 개요',[7])],
 'public-agency':[('lifecycle-explanation','help','생애주기로 보는 국민연금',[3]),('social-protection-explanation','help','사회보장제도와 국민연금',[4]),('pension-need-explanation','help','국민연금의 필요성',[5])],
 'library':[('catalogue-search','search','자료검색하기',[19]),('request-status','apply','신청확인 바로가기',[20]),('young-reader-guide','help','청소년 자료이용 안내',[18])]
}
taskBy={
 'smu':('application-installation','상명대학교 어플리케이션 설치 방법을 설명한 안내 글을 찾으세요.',20),
 'city':('inspection-application-form','정보통신공사 사용전검사 신청서 양식이 있는 원본 위치를 찾으세요. 파일을 내려받지는 마세요.',16),
 'government':('worker-education-overview','재난관리 종사자교육의 개요를 읽을 수 있는 탭의 원본 위치를 찾으세요.',7),
 'public-agency':('lifecycle-explanation','생애주기에 따른 국민연금 설명을 읽을 수 있는 탭의 원본 위치를 찾으세요.',3),
 'library':('young-reader-guide','청소년의 자료이용 방법을 설명하는 안내로 가는 원본 위치를 찾으세요.',18)
}
def action(c,p):
 attrs=c['attributes'];href=c['hrefAttribute'];reasons=[]
 if c['tag']=='button' or attrs.get('role')=='button':reasons.append('actual button or button role')
 if attrs.get('aria-controls'):reasons.append('actual aria-controls')
 if attrs.get('aria-haspopup') and attrs.get('aria-haspopup')!='false':reasons.append('actual aria-haspopup')
 if c['inlineHandlers']:reasons.append('actual inline handler retained verbatim')
 if attrs.get('download') is not None:reasons.append('actual download attribute')
 if c['target'] and c['target'].lower() not in ['_blank','_self','_parent','_top']:reasons.append('named target')
 if not href:reasons.append('no ordinary HTTP navigation source')
 elif href.strip().startswith('#'):reasons.append('same-document fragment')
 elif href.strip().lower().startswith('javascript:'):reasons.append('actual javascript href')
 elif c['resolvedHref'] and c['resolvedHref'].lower().startswith(('http:','https:')):
  lower=c['resolvedHref'].lower()
  if any(v in lower for v in ['filedown','download','/sso/','/oauth/','/saml/','/authorize']):reasons.append('explicit download or authentication endpoint')
 else:reasons.append('non-HTTP destination')
 if reasons:return 'locate',reasons
 return 'navigate',['ordinary HTTP(S) link; opening a public form alone is not authentication execution']
for p in j['pages']:
 site=p['siteId']; controls={i+1:c for i,c in enumerate(p['controls'])};accepted=[];coverage=[]
 for n,c in controls.items():
  act,reasons=action(c,p)
  if n in acceptBy[site]:
   a={'sourceId':c['sourceId'],'category':acceptBy[site][n],'action':act}
   if act=='navigate':a['destinationUrl']=c['resolvedHref']
   accepted.append(a);status='ACCEPTED';reason='Semantic public function in supported classes; not necessarily one of the three core functions.'
  else:
   status='REJECTED'
   reason='Hidden in the observed default state.' if not c['visible'] else 'Generic home, sharing, clipboard, printing, or other page utility outside the six semantic function classes.'
  coverage.append({'sourceId':c['sourceId'],'status':status,'category':acceptBy[site].get(n),'action':act,'actionEvidence':reasons,'reason':reason})
 expected=[]
 for eid,cat,label,nums in expectedBy[site]:
  acts={action(controls[n],p)[0] for n in nums};assert len(acts)==1
  ex={'id':eid,'category':cat,'label':label,'sourceIds':[controls[n]['sourceId'] for n in nums],'action':acts.pop()}
  if ex['action']=='navigate':
   dest={controls[n]['resolvedHref'] for n in nums};assert len(dest)==1;ex['destinationUrl']=dest.pop()
  expected.append(ex)
 tid,instruction,tn=taskBy[site];tc=controls[tn];te=next(x for x in expected if x['id']==tid)
 task={'id':f'{site}-v8-task','instruction':instruction,'expectedSourceIds':[tc['sourceId']],'action':te['action'],'evidence':{'observedSourceId':tc['sourceId'],'accessibleName':tc['accessibleName'],'hrefAttribute':tc['hrefAttribute'],'resolvedHref':tc['resolvedHref'],'inlineHandlers':tc['inlineHandlers'],'target':tc['target'],'defaultVisible':tc['visible'],'scope':'Read-only recognition of a public function or original source location; no authentication, form submission, or download executed.'}}
 if te['action']=='navigate':task['destinationUrl']=te['destinationUrl']
 observation={'capturedAt':p['capturedAt'],'viewport':p['viewport'],'method':p['method'],'httpStatus':p['httpStatus'],'sourceEvidence':{'observationsFile':'docs/evidence/run005/blind-v8-observations.json','pageId':p['pageId'],'selectors':p['selectors'],'sourceDocumentUrl':p['documentUrl'],'sourceBaseURI':p['baseURI'],'fixtureSha256':p['sanitizedFixtureSha']},'authState':'Fresh anonymous context; no credentials or auth action','inputValuesObserved':False,'visibilityPreservation':'Recorded computed display, visibility, and opacity copied as inline presentation styles; original style attributes retained in observation; semantic tags/roles/ids/classes/order/headings remain source-exact.'}
 notes=['Public read-only source capture only. Scripts, stylesheets, external assets, embedded documents, input value attributes, and editable text were omitted. Original inline handler strings remain inert under script-src none CSP; no handlers were activated.','The fixture preserves the entire selected subtree plus all original ancestors and referenced ID targets. Siblings outside the selected source blocks are outside this bounded fixture. Source URL, base URI, control ancestor chains, headings, node order, and every retained control are recorded separately.','The browser capture uses a new headless context without existing user profiles or tabs. Source site delegated event behavior is not reproduced or inferred. Ordinary HTTP link destinations are judged only by observable metadata.']
 out={'siteId':site,'siteName':siteNames[site],'pages':[{'id':p['pageId'],'title':p['title'],'url':p['requestedUrl'],'finalUrl':p['finalUrl'],'fixture':p['fixturePath'],'split':'holdout','observation':observation,'accepted':accepted,'expected':expected,'task':task,'notes':notes}]}
 Path(f'evaluation/blind-v8/sites/{site}.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
 p['annotationCoverage']=coverage;p['acceptedCount']=len(accepted);p['expectedCoreCount']=len(expected)
 p['retainedSearchControlCoverage']={'allRetainedSearchInputs':[c['sourceId'] for c in p['controls'] if c['visible'] and c['tag']=='input' and c['attributes'].get('type','text') in ['text','search']],'acceptedSearchInputSourceIds':[a['sourceId'] for a in accepted if a['category']=='search' and next(c for c in p['controls'] if c['sourceId']==a['sourceId'])['tag']=='input'],'unannotatedEligibleSearchInputs':[]}
 p['authUncertainty']='No authentication task is required. Original JS SSO signals, where retained, are located rather than executed; an ordinary HTTP form entry alone is not treated as proof of authentication execution.'
j['annotationPolicy']={'semanticClasses':['login','search','notice','academic','apply','help'],'help':'Instruction, reading, public explanation or guide; distinguish from actual catalogue search or application execution.','academic':'Institutional academic/education functions, not every text mentioning a university or training.','actions':'Ordinary HTTP(S) sources navigate, including different-document fragments and public login form links; same-document fragments, actual buttons/roles/aria controls/haspopup, original inline handlers, explicit JS/popup/download/SSO/OAuth/SAML/authorize signals, and named targets locate.','dataEvalId':'Evaluation mapping only; not a source-site semantic signal.','allRetainedControlsAnnotated':True,'extraRetainedControls':'All extra retained controls have explicit accepted/rejected coverage. Hidden controls are rejected in the captured default state.'}
j['fidelityLimitations']=['Bounded source-block fixtures are not complete websites and do not preserve delegated external JavaScript execution or pixel layout.','Effective display, visibility, and opacity are preserved from the observed default state with presentation-only inline styles; original source style metadata are preserved in observations.','No scripts, asset requests, input values, typed user content, downloads, authentication, or business actions are included or executed.','Fresh headless pages may differ from a manually operated installed extension or user session; no claim of actual human task success.']
j['collectionIssues']=[{'issue':'Library public scripts replace global Map, breaking Playwright object argument/result serialization.','resolution':'Use primitive JSON strings for page.evaluate arguments/results and avoid Map in observer capture code; no page function or product code was activated.','selectedPagePlanChanged':False,'productEvaluated':False}]
j['createdAt']=datetime.now().astimezone().isoformat();j['qaStatus']='AWAITING_INDEPENDENT_STATIC_QA'
Path('docs/evidence/run005/blind-v8-observations.json').write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n')
print('Draft annotation complete',len(j['pages']),sum(p['acceptedCount'] for p in j['pages']),sum(p['expectedCoreCount'] for p in j['pages']))
