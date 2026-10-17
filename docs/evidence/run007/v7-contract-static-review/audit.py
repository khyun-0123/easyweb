#!/usr/bin/env python3
"""Static source/annotation audit. No product imports, browser, or network."""
from collections import Counter
from datetime import datetime, timezone
from hashlib import sha256
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import json

ROOT = Path('/Users/khyun_03/easyweb')
OUT = ROOT / 'docs/evidence/run007/v7-contract-static-review'
DATASETS = ['blind-v7-v2', 'development-v7-corrected']
SITES = ['city', 'government', 'library', 'public-agency', 'smu']
INPUTS = sorted([ROOT / f'evaluation/{d}/{kind}/{s}.{ext}'
                 for d in DATASETS for kind, ext in [('fixtures', 'html'), ('sites', 'json')]
                 for s in SITES] + [ROOT / 'evaluation/development-v7-corrected/VERSION.json'])
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}

def save(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def hashes():
    return {str(p.relative_to(ROOT)): {'sha256': sha256(p.read_bytes()).hexdigest(), 'bytes': p.stat().st_size} for p in INPUTS}

class Parser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.root = {'tag': '#document', 'attrs': {}, 'children': []}
        self.stack, self.nodes = [self.root], []
    def handle_starttag(self, tag, attrs):
        node = {'tag': tag, 'attrs': dict(attrs), 'children': [], 'parent': self.stack[-1]}
        self.stack[-1]['children'].append(node)
        self.nodes.append(node)
        if tag not in VOID:
            self.stack.append(node)
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1, 0, -1):
            if self.stack[i]['tag'] == tag:
                self.stack = self.stack[:i]
                break
    def handle_data(self, data):
        self.stack[-1]['children'].append(data)

def fixed_text(node):
    return ' '.join(''.join(c if isinstance(c, str) else fixed_text(c) for c in node['children']).split())

def safe_attrs(node):
    # Editable values are intentionally excluded. Only fixed labels of button-type inputs are permitted.
    result = {k:v for k,v in node['attrs'].items() if k not in ['value', 'data-source-node-path']}
    if node['tag'] == 'input' and node['attrs'].get('type', 'text').lower() in ['button', 'submit', 'reset']:
        result['fixedButtonLabel'] = node['attrs'].get('value', '')
    return result

def hidden_markers(node):
    result = []
    while node['tag'] != '#document':
        a = node['attrs']
        if 'hidden' in a or a.get('aria-hidden') == 'true' or a.get('type') == 'hidden' or any(x in a.get('style','').replace(' ','').lower() for x in ['display:none', 'visibility:hidden']):
            result.append({'tag':node['tag'], 'sourceNodePath':a.get('data-source-node-path')})
        node = node['parent']
    return result

# Every decision below was made from retained fixed source metadata and purpose/context.
# sourceId -> category, action, category rationale, action rationale
DECISIONS = {
 'city-login': ('login', 'navigate', 'Operational sign-in entry; login category.', 'Ordinary HTTPS login-form destination; no explicit handler, SSO, popup, rolebutton or download marker. A login label alone does not initiate authentication.'),
 'city-reservation-help': ('help', 'locate', 'Reservation guidance, rather than a reservation submission.', 'Explicit role=button, aria-controls and aria-haspopup override ordinary href navigation.'),
 'city-service-search': ('search', 'locate', 'Reservation-service search control.', 'Button has no ordinary navigable href; locate original control without activation.'),
 'city-reset': ('search', 'locate', 'Reset belongs to the service-search controls.', 'Reset button mutates the original search controls; locate without activation.'),
 'city-museum-guide': ('apply', 'navigate', 'The main reservation-services card, reservation title and receiving-applications status support a reservation-service entry. This is not evidence of completed reservation.', 'Ordinary HTTPS service-detail destination, with no explicit action marker.'),
 'city-child-museum': ('apply', 'navigate', 'The main reservation-services card, reservation title and receiving-applications status support a reservation-service entry. This is not evidence of completed reservation.', 'Ordinary HTTPS service-detail destination, with no explicit action marker.'),
 'gov-hospital': ('search', 'locate', 'Find nearby safety facilities; not a guide merely because the enclosing page is an action guide.', 'Explicit javascript URL.'),
 'gov-pharmacy': ('search', 'locate', 'Find nearby safety facilities; not a guide merely because the enclosing page is an action guide.', 'Explicit javascript URL.'),
 'gov-typhoon-status': ('search', 'locate', 'Find disaster status, rather than read the adjacent stage-by-stage guidance.', 'Explicit javascript URL.'),
 'gov-wind-status': ('search', 'locate', 'Find disaster status, rather than read the adjacent stage-by-stage guidance.', 'Explicit javascript URL.'),
 'gov-guide-pdf': ('help', 'locate', 'A downloadable action guide is guidance.', 'Explicit javascript URL and fixed download label; no download performed.'),
 'gov-before': ('help', 'locate', 'Stage-specific safety action guidance.', 'Button with explicit onclick marker.'),
 'gov-during': ('help', 'locate', 'Stage-specific safety action guidance.', 'Button with explicit onclick marker.'),
 'gov-after': ('help', 'locate', 'Stage-specific safety action guidance.', 'Button with explicit onclick marker.'),
 'lib-login': ('login', 'locate', 'Operational sign-in entry; login category.', 'Explicit javascript URL.'),
 'lib-search-guide': ('help', 'locate', 'Page title and guide hierarchy identify instructions for the search function, not a search execution.', 'Explicit onclick marker, even though href is HTTPS.'),
 'lib-result-guide': ('help', 'locate', 'Page title and guide hierarchy identify instructions for using results, not a results query.', 'Explicit onclick marker, even though href is HTTPS.'),
 'lib-detail-guide': ('help', 'locate', 'Page title and guide hierarchy identify instructions for detail information, not an individual record.', 'Explicit onclick marker, even though href is HTTPS.'),
 'lib-full-guide': ('help', 'locate', 'Detailed user guide download.', 'Download button with explicit onclick marker.'),
 'nps-login': ('login', 'navigate', 'Operational sign-in entry; login category.', 'Ordinary HTTPS login-form destination; no explicit handler, SSO, popup, rolebutton or download marker. A login label alone does not initiate authentication.'),
 'nps-service-search': ('search', 'locate', 'Service search button in service-search form.', 'Button-type input; locate original control without submitting the form.'),
 'nps-history-help': ('help', 'navigate', 'Separate details link explains the personal-record service; it is not the adjacent record-query operation.', 'Ordinary HTTPS details destination; no explicit action marker.'),
 'nps-history': ('apply', 'locate', 'Operational access to personal insurance/contribution records, with authentication-needed context.', 'Explicit javascript URL.'),
 'nps-consult-help': ('help', 'navigate', 'Separate details link explains consultation-reservation procedure; it is not the adjacent application operation.', 'Ordinary HTTPS details destination; no explicit action marker.'),
 'nps-consult': ('apply', 'locate', 'Operational consultation-reservation application, with processing/authentication context.', 'Explicit javascript URL.'),
 'smu-login': ('login', 'locate', 'Operational sign-in entry; login category.', 'Explicit javascript URL and fixed new-window title.'),
 'smu-second': ('academic', 'locate', 'Academic-program policy document, not personal application execution.', 'Same origin/path/query as the current page plus fragment; local same-document fragment.'),
 'smu-linked': ('academic', 'navigate', 'Academic-program policy document, not personal application execution.', 'Different destination pathname makes this ordinary cross-document HTTPS navigation despite its fragment.'),
 'smu-self': ('academic', 'navigate', 'Academic-program policy document, not personal application execution.', 'Different destination pathname makes this ordinary cross-document HTTPS navigation despite its fragment.'),
 'smu-minor': ('academic', 'navigate', 'Academic-program policy document, not personal application execution.', 'Different destination pathname makes this ordinary cross-document HTTPS navigation despite its fragment.'),
 'smu-micro': ('academic', 'navigate', 'Academic-program policy document, not personal application execution.', 'Different destination pathname makes this ordinary cross-document HTTPS navigation despite its fragment.'),
 'smu-advanced': ('academic', 'navigate', 'Academic-program policy document, not personal application execution.', 'Different destination pathname makes this ordinary cross-document HTTPS navigation despite its fragment.'),
}
UNLABELED_DECISION = ('search', 'locate', 'Actual search text input, fixed title=검색어 입력, name/id=searchText, inside service-search form.', 'Locate the original search input using fixed metadata only; no editable value extraction, typing or submission.')

def finding_id(source_id):
    if source_id in ['city-login','nps-login']: return 'V7-C03'
    if source_id == 'city-reservation-help': return 'V7-C01'
    if source_id.startswith('smu-') and source_id not in ['smu-login','smu-second']: return 'V7-C02'
    raise ValueError(source_id)

OUT.mkdir(parents=True, exist_ok=True)
initial = hashes()
before_path = OUT / 'source-hashes-before.json'
if before_path.exists():
    assert json.loads(before_path.read_text()) == initial, 'Inputs changed since initial audit snapshot'
else:
    save('source-hashes-before.json', initial)

controls, page_text, datasets, patches = {}, {}, {}, []
for site in SITES:
    fixture = ROOT / f'evaluation/blind-v7-v2/fixtures/{site}.html'
    parser = Parser(); parser.feed(fixture.read_text())
    assert fixture.read_bytes() == (ROOT / f'evaluation/development-v7-corrected/fixtures/{site}.html').read_bytes()
    page_text[site] = fixed_text(parser.root)
    rows = []
    for node in parser.nodes:
        if node['tag'] not in ['a','button','input','textarea','select'] and node['attrs'].get('role') not in ['button','textbox','searchbox','combobox'] and 'contenteditable' not in node['attrs']:
            continue
        source_id = node['attrs'].get('data-eval-id')
        decision = DECISIONS[source_id] if source_id else UNLABELED_DECISION
        if not source_id:
            assert site == 'public-agency' and node['attrs'].get('id') == 'searchText'
        rows.append({
            'sourceId': source_id,
            'fixture': str(fixture.relative_to(ROOT)),
            'sourceNodePath': node['attrs'].get('data-source-node-path'),
            'tag':node['tag'], 'fixedAttributes':safe_attrs(node), 'fixedText':fixed_text(node),
            'staticHiddenMarkers':hidden_markers(node),
            'auditDisposition':'accepted',
            'category':decision[0], 'action':decision[1],
            'categoryReason':decision[2], 'actionReason':decision[3],
            'annotationStatus':'present' if source_id else 'missing-in-both-versions',
        })
    controls[site] = rows

for dataset in DATASETS:
    pages = []
    for site in SITES:
        path = f'evaluation/{dataset}/sites/{site}.json'
        raw = json.loads((ROOT/path).read_text())
        assert len(raw['pages']) == 1
        page=raw['pages'][0]
        accepted, rejected = page.get('accepted',[]), page.get('rejected',[])
        assert not rejected, 'Unexpected rejected annotations require individual audit'
        assert len({x['sourceId'] for x in accepted}) == len(accepted)
        annotated_ids = {x['sourceId'] for x in accepted}
        source_ids = {x['sourceId'] for x in controls[site] if x['sourceId']}
        assert annotated_ids == source_ids
        accepted_audits = []
        for i, ann in enumerate(accepted):
            dec = DECISIONS[ann['sourceId']]
            row = {'pointer':f'/pages/0/accepted/{i}', 'sourceId':ann['sourceId'], 'annotation':ann,
                   'categoryAssessment':'supported' if ann['category']==dec[0] else 'correction-proposed',
                   'actionAssessment':'supported' if ann['action']==dec[1] else 'correction-proposed',
                   'auditCategory':dec[0], 'auditAction':dec[1], 'categoryReason':dec[2], 'actionReason':dec[3]}
            accepted_audits.append(row)
            for key,after in [('category',dec[0]),('action',dec[1])]:
                if ann[key]!=after:
                    patches.append({'findingId':finding_id(ann['sourceId']), 'file':path,
                                    'pointer':row['pointer']+'/'+key, 'operation':'replace', 'before':ann[key],
                                    'proposedValue':after,'sourceId':ann['sourceId'],'reason':dec[3] if key=='action' else dec[2],
                                    'applicationPolicy':'PROPOSAL_ONLY_PRESERVE_INPUT'})
        expected_audits=[]
        for i, ann in enumerate(page.get('expected',[])):
            assert set(ann['sourceIds']) <= annotated_ids
            decisions = [DECISIONS[x] for x in ann['sourceIds']]
            assert len({d[0] for d in decisions})==1 and len({d[1] for d in decisions})==1
            dec=decisions[0]
            expected_audits.append({'pointer':f'/pages/0/expected/{i}', 'id':ann['id'], 'sourceIds':ann['sourceIds'],
                                    'annotationCategory':ann['category'], 'annotationAction':ann['action'],
                                    'auditCategory':dec[0], 'auditAction':dec[1], 'reason':'Follows the independently audited source purpose and action markers.'})
            for key,after in [('category',dec[0]),('action',dec[1])]:
                if ann[key]!=after:
                    patches.append({'findingId':finding_id(ann['sourceIds'][0]),'file':path,'pointer':f'/pages/0/expected/{i}/{key}',
                                    'operation':'replace','before':ann[key],'proposedValue':after,'sourceIds':ann['sourceIds'],
                                    'reason':dec[3] if key=='action' else dec[2], 'applicationPolicy':'PROPOSAL_ONLY_PRESERVE_INPUT'})
        task=page['task']; assert set(task['expectedSourceIds']) <= annotated_ids
        task_actions={DECISIONS[x][1] for x in task['expectedSourceIds']}; assert len(task_actions)==1
        task_action=next(iter(task_actions))
        task_audit={'pointer':'/pages/0/task','sourceIds':task['expectedSourceIds'],'annotationAction':task['action'],
                    'auditAction':task_action,'reason':'Follows source-control action; no task execution was performed.'}
        if task['action']!=task_action:
            patches.append({'findingId':'V7-C02','file':path,'pointer':'/pages/0/task/action','operation':'replace',
                            'before':task['action'],'proposedValue':task_action,'reason':'Task source is a cross-document HTTPS link.',
                            'applicationPolicy':'PROPOSAL_ONLY_PRESERVE_INPUT'})
            patches.append({'findingId':'V7-C02','file':path,'pointer':'/pages/0/task/instruction','operation':'replace',
                            'before':task['instruction'],'proposedValue':'부전공 제도 안내 문서로 바로 이동하는 링크를 찾으세요. 본인 신청은 수행하지 마세요.',
                            'reason':'Describe direct cross-document navigation while retaining the prohibition on personal applications.',
                            'applicationPolicy':'PROPOSAL_ONLY_PRESERVE_INPUT'})
        missing=[x for x in controls[site] if not x['sourceId']]
        if missing:
            patches.append({'findingId':'V7-C04','file':path,'pointer':'/pages/0/accepted/-','operation':'add',
                            'before':'ABSENT','proposedValue':{'sourceId':'nps-search-input','category':'search','action':'locate'},
                            'reason':'Explicitly cover the retained actual search field using fixed title/id/name; retain existing three expected entries.',
                            'prerequisite':'Assign an annotation-only data-eval-id=nps-search-input to the retained source node at sourceNodePath 2.3.5.9.7.5.1.3.3.1.7 in a future separately authorized dataset copy. Do not modify either audited original fixture.',
                            'applicationPolicy':'PROPOSAL_ONLY_PRESERVE_INPUT'})
        pages.append({'siteId':site,'file':path,'counts':{'accepted':len(accepted),'rejected':len(rejected),'expected':len(page['expected']),
                     'retainedControls':len(controls[site]),'unannotatedRetainedControls':len(missing)},
                     'acceptedAudits':accepted_audits,'rejectedAudits':[], 'expectedAudits':expected_audits,'taskAudit':task_audit,
                     'unannotatedControls':missing})
    datasets[dataset]=pages

findings=[
 {'id':'V7-C01','kind':'action-contract','sourceIds':['city-reservation-help'],
  'finding':'Original annotation says navigate despite explicit rolebutton/popup markers. Development corrected copy already uses locate.',
  'statusByDataset':{'blind-v7-v2':'CORRECTION_PROPOSED','development-v7-corrected':'ALREADY_CORRECTED'}},
 {'id':'V7-C02','kind':'action-contract','sourceIds':['smu-linked','smu-self','smu-minor','smu-micro','smu-advanced'],
  'finding':'Five original same-origin links have destination pathnames different from the current document; their fragments do not make them local controls. Corresponding expected/task actions and task wording follow navigation. Development copy already has these action/instruction corrections.',
  'statusByDataset':{'blind-v7-v2':'CORRECTION_PROPOSED','development-v7-corrected':'ALREADY_CORRECTED'},
  'historicalNote':{'pointer':'/pages/0/notes/3','assessment':'SMU historical note says all fragments imply locate. Development VERSION explicitly preserves and supersedes that statement. It is historical provenance, not a new action correction.'}},
 {'id':'V7-C03','kind':'action-contract','sourceIds':['city-login','nps-login'],
  'finding':'Both versions mark two plain HTTPS login-form links locate. Under the supplied contract, their action is navigate and category remains login. No explicit SSO, handler, popup, download, rolebutton or same-document fragment marker is present.',
  'statusByDataset':{'blind-v7-v2':'CORRECTION_PROPOSED','development-v7-corrected':'CORRECTION_PROPOSED'},
  'provenanceNote':'VERSION lists these as unresolved under a prior ambiguity. The task contract now explicitly covers plain login links; no hidden behavior is invented.'},
 {'id':'V7-C04','kind':'source-coverage','sourceIds':[], 'proposedSourceId':'nps-search-input',
  'sourceNodePath':'2.3.5.9.7.5.1.3.3.1.7',
  'finding':'Both faithful fixture copies retain an actual text input titled 검색어 입력 with id/name searchText inside the service-search form. It has neither data-eval-id nor accepted/rejected annotation. This is an annotation coverage omission, not evidence of a product recommendation or input leakage.',
  'statusByDataset':{'blind-v7-v2':'ANNOTATION_COVERAGE_PROPOSED','development-v7-corrected':'ANNOTATION_COVERAGE_PROPOSED'},
  'proposedDisposition':'accepted','proposedCategory':'search','proposedAction':'locate',
  'reason':'A fixed-metadata locator can identify the actual search field without reading or submitting its contents. No change to expected membership is proposed.',
  'historicalCountCaveat':'The observation sourceControlCount=6 describes the historical selected labeled controls. This audit finds seven retained controls on that page; do not rewrite the historical observation as a fresh observation.'},
]
counts={
 'uniqueSourcePages':5,'newIndependentPages':0,'fixtureFilesInspected':10,'siteAnnotationFilesInspected':10,'provenanceFilesInspected':1,
 'uniqueRetainedControls':sum(map(len,controls.values())),'labeledUniqueControls':len(DECISIONS),'unlabeledUniqueControls':1,
 'fixtureControlInstances':sum(map(len,controls.values()))*2,
 'acceptedAnnotationEntriesInspected':sum(p['counts']['accepted'] for pages in datasets.values() for p in pages),
 'rejectedAnnotationEntriesInspected':0,'expectedEntriesInspected':30,'taskEntriesInspected':10,
 'findingGroups':len(findings),'sourceCoverageFindingGroups':1,'actionFindingGroups':3,
 'proposedFieldOperationsByDataset':dict(Counter('blind-v7-v2' if '/blind-v7-v2/' in p['file'] else 'development-v7-corrected' for p in patches)),
 'proposedActionFieldOperationsByDataset':dict(Counter('blind-v7-v2' if '/blind-v7-v2/' in p['file'] else 'development-v7-corrected' for p in patches if p['pointer'].endswith('/action'))),
 'categoryCorrectionsProposed':0,'rejectedControlsInAudit':0,
}
audit={
 'status':'COMPLETED_STATIC_AUDIT','createdAt':datetime.now(timezone.utc).isoformat(),
 'classification':'EXPOSED_V7_STATIC_CONTRACT_AUDIT_NOT_EVALUATION',
 'contract':{'ordinaryHttpIncludingPlainLogin':'navigate','explicitJsHandlerDownloadPopupSsoRolebutton':'locate',
             'localSameDocumentFragment':'locate','crossDocumentFragment':'navigate','category':'Document/control purpose, not subject keywords; operational sign-in is login.',
             'coverage':'Every retained meaningful input/button/anchor receives an explicit audit disposition and reason.'},
 'independence':{'productSourceRead':False,'productDistRead':False,'productEvaluationOutputRead':False,
                 'remainingKnownFailuresRead':False,'newV9Read':False,'broaderRepositoryRead':False,
                 'priorAuditAndRootReviewRead':False,'productExecution':False,'networkAccess':False,
                 'visibleUIAutomation':False,'nativeUIAutomation':False,'browserExecution':False,
                 'readScope':[str(p.relative_to(ROOT)) for p in INPUTS],
                 'inheritedContextCaveat':'Historical product facts present in user/task context were not used to decide source annotations. No product output files were opened.',
                 'versionUse':'Read only permitted VERSION provenance; external paths named by VERSION were not followed.'},
 'method':{'parser':'Python standard-library HTMLParser; static only.',
           'visibilityBoundary':'Retained controls with no explicit hidden attribute/style/aria-hidden ancestor were audited. Original CSS, pixel visibility, offscreen/carousel state and runtime behavior were not observed.',
           'inputBoundary':'Editable values were excluded from extracted metadata and decisions. Only fixed button-type input labels and fixed title/name/id were used.',
           'sourceIdentityBoundary':'data-eval-id and data-source-node-path are audit bookkeeping; no product mapping is proposed.',
           'coverageChecks':['All labeled retained controls resolve to one accepted entry per version.', 'No rejected entries exist in either version.', 'Expected and task source references resolve.', 'All retained anchors/buttons/inputs/selects/textareas/editable roles were inventoried.'],
           'limitations':['Five reduced fixtures, not complete live pages.', 'No destination fetch, click, authentication, submission, download or installation.', 'Hidden event listeners and opaque runtime behavior are outside static evidence.', 'Audit counts are raw coverage/change counts; no product accuracy, recall, recommendation or task-success metrics were computed.']},
 'counts':counts,'findings':findings,'uniqueControlAudit':controls,'annotationAudit':datasets,
 'proposals':'corrections-proposed.json',
 'preservation':{'inputFilesModified':0,'correctedDatasetCreated':False,'evaluatorModified':False,
                 'originalsMustRemainHistorical':True,'sourceHashBefore':'source-hashes-before.json','sourceHashAfter':'source-hashes-after.json'}
}
save('audit.json',audit)
save('corrections-proposed.json',{'status':'PROPOSAL_ONLY_NOT_APPLIED','jsonPointerOperations':patches,
 'htmlIdentityPrerequisites':[{'findingId':'V7-C04','files':[f'evaluation/{d}/fixtures/public-agency.html' for d in DATASETS],
                             'sourceNodePath':'2.3.5.9.7.5.1.3.3.1.7','selector':'input#searchText[name="searchText"][title="검색어 입력"]',
                             'proposedAttribute':{'data-eval-id':'nps-search-input'},
                             'policy':'Describe a future copied dataset only; do not mutate audited originals. HTML has no JSON pointer; exact source-node path is supplied.'}],
 'inputPreservationPolicy':'No patch is applied. Preserve all original/versioned input files and historical first-result evidence.'})
save('static-control-inventory.json',[x for rows in controls.values() for x in rows])
after=hashes(); assert after == initial
save('source-hashes-after.json',after)
save('preservation-check.json',{'status':'PASS','inputsCompared':len(INPUTS),'inputsChanged':[],
                               'allBeforeAfterSha256Identical':True,'fixturePairsByteIdentical':5,
                               'auditCompleted':True,'productRun':False,'metricsComputed':False})
readme='''# v7 static contract audit

Completed static review of the permitted exposed v7 inputs. No product source, dist, evaluation output, future data, network, browser or native UI was used. Input SHA-256 and byte counts match before and after for all 21 files.

The audit covers 33 unique retained controls on five pages: 32 already labeled and one unlabeled actual NPS search text input. The ten annotation copies contain 64 accepted entries and zero rejected entries; each accepted entry, all expected entries and all task actions were checked against source purpose and markers. Counts are audit coverage/change counts, not product metrics.

Four finding groups are recorded:

- V7-C01: Original city reservation-guidance rolebutton requires locate; development copy already corrected it.
- V7-C02: Five original SMU cross-document fragment links require navigate, with their dependent expected/task fields; development copy already corrected them.
- V7-C03: Both versions still mark city-login and nps-login locate. These plain HTTPS login-form links require navigate under the supplied contract. Their category remains login.
- V7-C04: Both versions omit the retained NPS search text input from accepted/rejected annotation. Propose a fixed-metadata search/locate annotation, with an annotation-only source ID in a future copy. No editable values or expected membership changes are involved.

`audit.json` contains every retained control's explicit accepted audit disposition, category/action reason, all annotation assessments and limitations. `corrections-proposed.json` gives exact non-applied JSON-pointer proposals, plus the HTML identity prerequisite by exact source-node path. Original files remain unchanged; no corrected dataset or evaluator change was created. Historical first results are not recalculated or replaced.

The fixtures omit original CSS and scripts. No claim is made about original pixel visibility, hidden event listeners, destination contents, downloads, authentication, submission, installation or human task success. The same five pages are exposed development evidence, not fresh independent pages.
'''
(OUT/'README.md').write_text(readme)
print(json.dumps({'status':audit['status'],'counts':counts,'preservation':'all 21 input hashes unchanged'},ensure_ascii=False))
