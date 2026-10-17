#!/usr/bin/env python3
"""Offline document/evidence consistency audit; no product execution or network."""
from pathlib import Path
from datetime import datetime, timezone
from collections import Counter
import hashlib
import html
import json
import re
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[5]
OUT = Path(__file__).resolve().parent
PRIMARY = ["README.md", "AGENTS.md", "docs/WORK_SPEC.md", "docs/PROGRESS.md",
           "docs/RUN_009_REPORT.md", "docs/INSTALL.md", "docs/PRETEST.md", "docs/MANUAL_CHECK.md", "docs/ACTION_POLICY.md",
           "docs/SUPPORT_MATRIX.md", "docs/ACCESSIBILITY.md", "docs/VALIDATION.md",
           "evaluation/README.md"]
FILES = sorted({*ROOT.glob("*.md"), *ROOT.glob("docs/*.md"), *ROOT.glob("evaluation/**/*.md")})

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def blank(match):
    return re.sub(r"[^\n]", " ", match.group(0))

def prose_only(text):
    """Preserve character offsets while excluding fenced, indented and inline code."""
    lines = text.splitlines(keepends=True)
    fence = None
    for i, line in enumerate(lines):
        m = re.match(r" {0,3}(`{3,}|~{3,})", line)
        if fence:
            if m and m.group(1)[0] == fence[0] and len(m.group(1)) >= fence[1]:
                fence = None
            lines[i] = re.sub(r"[^\n]", " ", line)
        elif m:
            fence = (m.group(1)[0], len(m.group(1)))
            lines[i] = re.sub(r"[^\n]", " ", line)
        elif re.match(r"(?: {4}|\t)", line):
            lines[i] = re.sub(r"[^\n]", " ", line)
    text = re.sub(r"<!--[\s\S]*?-->", blank, "".join(lines))
    chars = list(text)
    i = 0
    while i < len(text):
        if text[i] != "`":
            i += 1
            continue
        j = i
        while j < len(text) and text[j] == "`":
            j += 1
        token = text[i:j]
        match = re.search(r"(?<!`)" + re.escape(token) + r"(?!`)", text[j:])
        if match:
            end = j + match.end()
            for k in range(i, end):
                if chars[k] != "\n":
                    chars[k] = " "
            i = end
        else:
            i = j
    return "".join(chars)

def destination(text, start):
    """Read a CommonMark-style angle or balanced-parenthesis destination."""
    i = start
    while i < len(text) and text[i].isspace():
        i += 1
    if i >= len(text):
        return None, i
    if text[i] == "<":
        j = i + 1
        while j < len(text):
            if text[j] == "\\":
                j += 2
            elif text[j] == ">":
                return text[i + 1:j], j + 1
            else:
                j += 1
        return None, i
    begin = i
    depth = 0
    while i < len(text):
        char = text[i]
        if char == "\\":
            i += 2
            continue
        if char == "(":
            depth += 1
        elif char == ")":
            if depth == 0:
                break
            depth -= 1
        elif char.isspace():
            break
        i += 1
    return text[begin:i], i

def links(text):
    clean = prose_only(text)
    refs = {}
    ref_ranges = []
    for m in re.finditer(r"(?m)^ {0,3}\[([^\]\n]+)\]:\s*", clean):
        target, end = destination(clean, m.end())
        if target:
            refs[" ".join(m.group(1).lower().split())] = target
            ref_ranges.append((m.start(), clean.find("\n", end) if "\n" in clean[end:] else len(clean)))
    found = []
    i = 0
    while i < len(clean):
        if clean[i] != "[" or (i > 0 and clean[i - 1] == "\\") or any(a <= i < b for a, b in ref_ranges):
            i += 1
            continue
        j = i + 1
        depth = 1
        while j < len(clean) and depth:
            if clean[j] == "\\":
                j += 2
                continue
            if clean[j] == "[":
                depth += 1
            elif clean[j] == "]":
                depth -= 1
            j += 1
        if depth:
            i += 1
            continue
        label = clean[i + 1:j - 1]
        target = None
        kind = "inline"
        if j < len(clean) and clean[j] == "(":
            target, end = destination(clean, j + 1)
            # Destination can be followed by an optional title before the final ).
            tail = clean[end:]
            if not re.match(r"(?:\s+(?:\"[^\"]*\"|'[^']*'|\([^)]*\)))?\s*\)", tail):
                target = None
        elif j < len(clean) and clean[j] == "[":
            end = clean.find("]", j + 1)
            if end >= 0:
                key = clean[j + 1:end] or label
                target = refs.get(" ".join(key.lower().split()))
                kind = "reference"
        else:
            target = refs.get(" ".join(label.lower().split()))
            kind = "reference"
        if target is not None:
            found.append({"offset": i, "line": clean.count("\n", 0, i) + 1,
                          "label": re.sub(r"\s+", " ", label), "target": target, "kind": kind})
        i = j
    return found


started = datetime.now(timezone.utc).isoformat()
opening = json.loads((OUT / "opening-snapshot.json").read_text())
hashes_before = {str(p.relative_to(ROOT)): sha(p) for p in FILES}
rows = []
for path in FILES:
    relative = str(path.relative_to(ROOT))
    for source in links(path.read_text()):
        row = dict(source)
        target = html.unescape(re.sub(r"\\([!\"#$%&'()*+,\-./:;<=>?@\[\]^_`{|}~\\])", r"\1", row.pop("target")))
        row.update({"file": relative, "primary": relative in PRIMARY, "target": target})
        if re.match(r"[A-Za-z][A-Za-z0-9+.-]*:", target) or target.startswith("//"):
            row["status"] = "EXCLUDED_EXTERNAL"
        elif target.startswith("#") or not target:
            row["status"] = "EXCLUDED_ANCHOR"
        else:
            parsed = urlsplit(target)
            resolved = (ROOT / unquote(parsed.path.lstrip("/"))) if target.startswith("/") else (path.parent / unquote(parsed.path))
            row["resolvedPath"] = str(resolved.resolve())
            row["status"] = "EXISTS" if resolved.exists() else "MISSING"
            row["fragmentNotValidated"] = bool(parsed.fragment)
        row.pop("offset", None)
        rows.append(row)
link_report = {"checkedAtUtc": datetime.now(timezone.utc).isoformat(),
 "scope":"Static Markdown links only: root/*.md, docs/*.md, evaluation/**/*.md. No network/external availability or anchor validation.",
 "method":"RUN008 offline parser reused: excludes fenced/indented/inline code and comments, supports balanced/angle destinations, inline/reference links and images, escapes, percent-encoding, query/fragment separation.",
 "files":hashes_before,"primaryFiles":PRIMARY,"summary":dict(Counter(r["status"] for r in rows)),
 "missing":[r for r in rows if r["status"]=="MISSING"],"links":rows,
 "limits":["HTML href and raw code/example paths are excluded.","Existence does not establish artifact correctness or actual manual/native/human observations."]}
(OUT/"markdown-links.json").write_text(json.dumps(link_report,ensure_ascii=False,indent=2)+"\n")
loaded={}; evidence_hashes={}
def read(name):
    if name not in loaded:
        path=ROOT/name; loaded[name]=json.loads(path.read_text());evidence_hashes[name]=sha(path)
    return loaded[name]
def ev(name):return "docs/evidence/run009/"+name
checks=[]
def check(name,ok,observation,evidence):
    checks.append({"name":name,"status":"PASS" if ok else "FAIL","observation":observation,"evidence":evidence})
def counts(summary):return [summary[k] for k in ["correct","recommended","matched","expected","tasksRecommended"]]
local=read(ev("local-verification.json")); raw=read(ev("playwright-local.json"))
check("recordedLocal493NoFailuresFlakySkip",all(local["tests"][k]==raw["stats"][k]==v for k,v in {"expected":493,"unexpected":0,"flaky":0,"skipped":0}.items()),local["tests"],[ev("local-verification.json"),ev("playwright-local.json")])
check("recordedTypeBuildAndRequestedChecksPASS",local["localRegressionStatus"]==local["requestedChecksStatus"]=="PASS" and all(s["status"]=="PASS" and s["exitCode"]==0 for s in local["stages"]),[{k:s[k] for k in ["name","status","exitCode"]} for s in local["stages"]],[ev("local-verification.json")])
check("recordedCore72of74_45of45_15",counts(local["coreQuality"]["summary"])==[72,74,45,45,15],local["coreQuality"]["summary"],[ev("local-verification.json")])
spec_counts={}
def walk_suites(suites):
    for suite in suites:
        if "file" in suite and "specs" in suite:spec_counts[suite["file"]]=spec_counts.get(suite["file"],0)+len(suite["specs"])
        walk_suites(suite.get("suites",[]))
walk_suites(raw["suites"])
check("recorded493IncludesLatest10FocusedTests",sum(spec_counts.values())==493 and len(spec_counts)==42 and spec_counts.get("final-v10-integration.spec.mjs")==10,{"totalSpecs":sum(spec_counts.values()),"testFiles":len(spec_counts),"perFile":spec_counts},[ev("playwright-local.json")])
a11y=read(ev("a11y-automated.json"))["summary"]
check("recordedA11y21SeparateFromManual",a11y["cases"]==21 and all(a11y[k]==0 for k in ["errors","violations","seriousOrCritical","incomplete"]),a11y,[ev("a11y-automated.json"),"docs/ACCESSIBILITY.md"])
live=read(ev("tasks-live.json"))["summary"]
check("recordedPublic15HTTP9Original6",all(live[k]==v for k,v in {"passed":15,"destinationReached":9,"originalGuidanceReached":6,"guidanceRetries":0,"observationErrors":0}.items()),live,[ev("tasks-live.json"),"docs/RUN_009_REPORT.md"])
compare=read(ev("closing-development-comparison/summary.json"));aggregate={r["mode"]:r for r in compare["uniquePageAggregates"]};rowmap={(r["mode"],r["suite"]):r for r in compare["rows"]}
check("recordedKnown60TwoModes28Runs",compare["uniqueExposedPages"]==60 and len(compare["rows"])==28 and Counter(r["mode"] for r in compare["rows"])=={"institution":14,"generic":14} and compare["stableBeforeAndAfter"] and len(compare["sourceFiles"])==21,{"uniquePages":compare["uniqueExposedPages"],"rows":len(compare["rows"]),"modes":dict(Counter(r["mode"] for r in compare["rows"])),"sourceFiles":len(compare["sourceFiles"]),"stable":compare["stableBeforeAndAfter"]},[ev("closing-development-comparison/summary.json")])
check("recordedKnown60UniqueAggregates",counts(aggregate["institution"]["summary"])==[286,290,169,170,60] and counts(aggregate["generic"]["summary"])==[263,272,148,170,53],{m:r["summary"] for m,r in aggregate.items()},[ev("closing-development-comparison/summary.json")])
failures=[r["suite"] for r in compare["rows"] if r["mode"]=="institution" and r["quality"]["status"]=="FAIL"]
check("recordedFiveIndividualInstitutionFAILsRetained",set(failures)=={"blind-v5","blind-v6","development-v6-corrected","blind-v7-v2","development-v7-corrected"},failures,[ev("closing-development-comparison/summary.json"),"docs/RUN_009_REPORT.md"])
comparison_details=[]
for row in compare["rows"]:
    detail=read(row["report"])
    comparison_details.append({"mode":row["mode"],"suite":row["suite"],"matches":all(row[k]==detail[k] for k in ["summary","quality","sites","menuFlow"])})
check("recorded28RowsMatchIndividualReports",all(x["matches"] for x in comparison_details),comparison_details,[ev("closing-development-comparison/summary.json")])
v10=rowmap[("institution","blind-v10")];v8=rowmap[("institution","blind-v8")]
check("recordedV10DevelopmentFirstAndAdditionalSeparate",counts(v10["summary"])==[29,30,15,15,5] and v10["quality"]["status"]=="PASS" and counts(v10["menuFlow"]["summary"])==[89,93,15,15,5] and v10["menuFlow"]["unresolvedMappings"]==v10["menuFlow"]["repeatedCards"]==0,{"summary":v10["summary"],"menuFlow":v10["menuFlow"]},[v10["report"],"docs/RUN_009_REPORT.md"])
check("recordedV8SearchRecall15Recovered",v8["summary"]["matched"]==v8["summary"]["expected"]==15 and v8["quality"]["status"]=="PASS",v8["summary"],[v8["report"],"docs/RUN_009_REPORT.md"])
first_name="docs/evidence/run008/blind-v10-first-evaluated/evaluation-current-institution-blind-v10-holdout.json";first=read(first_name)
check("priorFirstV10FAILHashAndScorePreserved",counts(first["summary"])==[26,28,2,15,0] and first["quality"]["status"]=="FAIL" and all(not r["passed"] for r in first["quality"]["sites"]) and evidence_hashes[first_name]=="e469fe25011392ea61be795a00d552e02ef7aa7d23789c1e9db08973c5a1c131",{"summary":first["summary"],"sha256":evidence_hashes[first_name],"menuFlow":first["menuFlow"]},[first_name,"docs/RUN_009_REPORT.md"])
perf=[]
for name in ["performance.json","performance-flat.json","performance-table.json"]:
    p=read(ev(name));perf.append({"file":ev(name),"status":p["status"],"samples":len(p["measures"]),"analyzer":round(p["analyzerP95Milliseconds"],1),"ready":round(p["overlayReadyP95Milliseconds"],1)})
check("recordedExistingThreeSyntheticCriteriaPASS",all(p["status"]=="PASS" and p["samples"]==10 and p["analyzer"]<=300 and p["ready"]<=1000 for p in perf) and [(p["analyzer"],p["ready"]) for p in perf]==[(27.2,106.9),(29.7,142.4),(93.0,273.9)],perf,[p["file"] for p in perf])
pipeline=read(ev("institution-performance-final/performance.json"));pr={m:{k:(round(v,1) if isinstance(v,float) else v) for k,v in r.items() if k in ["status","existingBenchmarkStatus","additionalPipelineDiagnosticStatus","analyzerP95Milliseconds","analysisPipelineP95Milliseconds","overlayReadyP95Milliseconds","currentnessBatchP95Milliseconds"]} for m,r in pipeline["modes"].items()}
check("recordedAdditionalPipelineOverallFAILPreserved",pipeline["status"]==pipeline["additionalPipelineDiagnosticStatus"]=="FAIL" and pipeline["existingBenchmarkStatus"]=="PASS" and pr["institution"]["analysisPipelineP95Milliseconds"]==284.2 and pr["institution"]["status"]=="PASS" and pr["generic"]["analysisPipelineP95Milliseconds"]==327.1 and pr["generic"]["status"]=="FAIL" and pr["institution"]["currentnessBatchP95Milliseconds"]==241.9 and pr["generic"]["currentnessBatchP95Milliseconds"]==178.4,pr,[ev("institution-performance-final/performance.json"),"docs/RUN_009_REPORT.md"])
gate=read(ev("release-gate.json"));freeze=read(ev("v0.10-engine-freeze.json"));verify=read(ev("verification-command-completion.json"))
check("recordedFreeze21Source17Tools42Tests",len(freeze["sourceFiles"])==21 and len(freeze["toolFiles"])==17 and len(freeze["testFiles"])==42 and len(verify["sourceFiles"])==21 and verify["sourceStable"] and verify["exitCode"]==0,{"source":len(freeze["sourceFiles"]),"tools":len(freeze["toolFiles"]),"tests":len(freeze["testFiles"]),"archive":freeze["archive"],"verificationSourceStable":verify["sourceStable"]},[ev("v0.10-engine-freeze.json"),ev("verification-command-completion.json"),"AGENTS.md"])
package_name="output/run009/EasyWeb-0.10.0-candidate.json";package=read(package_name)
check("recordedPackageNumberAndManifestClaims",package["archive"]["bytes"]==605239 and package["archive"]["sha256"]=="ce0650d3a747da1c9b157a77db7fbaae11a99cda2a40f7d46ef22662cfdf403b" and all(package["reproducibility"][k] for k in ["twoBuildsIdentical","twoArchivesIdentical","sourceStable"]) and package["manifest"]["version"]=="0.10.0" and package["manifest"]["permissions"]==["activeTab","scripting"] and package["manifest"]["hostPermissions"]==[],{"archive":package["archive"],"reproducibility":package["reproducibility"],"manifest":package["manifest"]},[package_name,"docs/RUN_009_REPORT.md"])
check("recordedAcceptanceManualHumanUnchanged",gate["completedStages"]==5 and gate["totalStages"]==10 and gate["overallAcceptance"]=="NOT_MET" and all(gate[k]=="NOT_RUN" for k in ["currentNativeInstall","actualVoiceOverSpeech","actualBrowserZoom"]) and all(gate[k]==0 for k in ["pretestActualObservations","formalStudyActualObservations","CUAOrNativeAutomationCount"]) and gate["newIndependentValidationThisVersion"] is False,{k:gate[k] for k in ["completedStages","totalStages","overallAcceptance","states","currentNativeInstall","actualVoiceOverSpeech","actualBrowserZoom","pretestActualObservations","formalStudyActualObservations","CUAOrNativeAutomationCount","newIndependentValidationThisVersion"]},[ev("release-gate.json"),"docs/PROGRESS.md","docs/WORK_SPEC.md","docs/PRETEST.md","docs/MANUAL_CHECK.md"])
usage=read(ev("goal-usage-snapshot.json"));stop=read(ev("user-stop-boundary.json"));read(ev("run-start.json"))
check("recordedPauseAfterHandoffDistinctFromActiveSnapshot",gate["goalStatusAtRecord"]=="active" and gate["disposition"]=="USER_REQUESTED_PAUSE_AFTER_CURRENT_VERSION_HANDOFF" and usage["goalCumulativeCounter"]["status"]=="active" and usage["afterClosingDisposition"]=="USER_REQUESTED_PAUSE_AFTER_HANDOFF_NOT_COMPLETE" and not gate["nextVersionOrFreshCollectionStarted"] and not stop["newIndependentDatasetCollectionStarted"] and "Pause" in stop["afterClosing"],{"goalStatusAtRecord":gate["goalStatusAtRecord"],"disposition":gate["disposition"],"usageScope":usage["scope"],"afterClosing":stop["afterClosing"],"actualPauseNotVerifiedByThisAudit":True},[ev("release-gate.json"),ev("goal-usage-snapshot.json"),ev("user-stop-boundary.json")])
check("recordedBillingUnknownAndElapsedBoundary",usage["wholeRunElapsed"]=="UNKNOWN" and all(v=="UNKNOWN" for v in usage["billing"].values()) and "Not whole RUN009" in usage["scope"],{"wholeRunElapsed":usage["wholeRunElapsed"],"billing":usage["billing"],"scope":usage["scope"]},[ev("goal-usage-snapshot.json"),"docs/RUN_009_REPORT.md"])
texts={name:(ROOT/name).read_text() for name in PRIMARY}
compact={name:re.sub(r"\s+","",t) for name,t in texts.items()}
required={
 "README.md":["0.10.0개발후보","5/10","493","286/290","169/170","최초독립실패2/15","일시정지"],
 "AGENTS.md":["0.10","493/493","72/74","45/45","286/290","169/170","263/272","148/170","284.2msPASS","327.1msFAIL","21제품파일·17도구·42test파일","NOT_RUN","NOT_MET"],
 "docs/WORK_SPEC.md":["현재구현:v0.10.0","RUN-008당시","v8검색15/15복구","284.2ms","327.1ms","사용자의재개지시후","이번0.10마감에서다음버전이나새자료수집을시작하지않는다","5/10","NOT_RUN"],
 "docs/PROGRESS.md":["현재버전마감","5/10·NOT_MET","493/493","286/290","169/170","327.1ms","사용자재개지시후"],
 "docs/RUN_009_REPORT.md":["605,239bytes","ce0650d3a747da1c9b157a77db7fbaae11a99cda2a40f7d46ef22662cfdf403b","493/493","72/74","45/45","286/290","169/170","263/272","148/170","29/30","89/93","e469fe25011392ea61be795a00d552e02ef7aa7d23789c1e9db08973c5a1c131","범용추가진단은미달","status/명령exit는FAIL","5/10·NOT_MET","NOT_RUN","UNKNOWN"],
 "docs/INSTALL.md":["0.10.0개발후보","5/10","NOT_RUN","0건","실제파일응답·실행은미관찰","activeTab","scripting"],
 "docs/PRETEST.md":["v0.10.0개발후보","실제시험미실시","최초독립결과는2/15","개발재평가는15/15","실제관찰은**0건**","NOT_RUN","NOT_MET"],
 "docs/MANUAL_CHECK.md":["실제수동결과:NOT_RUN","컴퓨터유즈자동화는재개하지않는다","실제VoiceOver","200%","400%","원본위치안내","최대"],
 "docs/SUPPORT_MATRIX.md":["0.10.0개발후보","5/10","286/290","169/170","29/30","15/15","327.1msFAIL","NOT_RUN","0건"],
 "docs/ACCESSIBILITY.md":["v0.10.0개발후보","21가지상태","현재버전의실제VoiceOver발화·브라우저확대·네이티브설치검사는**NOT_RUN**","과거예비관찰","v0.10검증으로승계하지않는다"],
 "docs/ACTION_POLICY.md":["일반링크는바로이동","원본handler자동호출안함","원본위치안내","activeTab","scripting","실제파일응답·본문·실행은미관찰"],
 "docs/VALIDATION.md":["현재검증:RUN-009","493/493PASS","5/10NOT_MET","284.2ms추가진단PASS","327.1msFAIL","NOT_RUN","사람0건","이전실행당시기록"],
 "evaluation/README.md":["현재v0.10.0","5/10·NOT_MET","현재28회비교","각14suite","286/290","169/170","263/272","148/170","29/30","RUN-008당시평가경계","RUN-007당시평가경계","이번마감에새독립자료수집/평가를하지않았다"]}
# MANUAL_CHECK gives a fixture sequence rather than a current ranking policy. Its literal count of cards is intentionally not an assertion of maximum menu policy.
required["docs/MANUAL_CHECK.md"].remove("최대")
doc_rows=[]
for name,needles in required.items():
    absent=[n for n in needles if re.sub(r"\s+","",n) not in compact[name]]
    doc_rows.append({"file":name,"missingRequiredClaims":absent,"verifiedClaims":needles,"sha256":hashes_before[name]})
check("primaryDocumentsCurrentClaimsMatchSavedEvidence",all(not r["missingRequiredClaims"] for r in doc_rows),doc_rows,list(required))
report_compact=compact["docs/RUN_009_REPORT.md"]
check("reportPerformanceTableMatchesRoundedSavedValues",all(s in report_compact for s in ["institution|206.3ms|284.2ms|305.9ms|241.9ms|PASS","generic|206.0ms|327.1ms|349.4ms|178.4ms|FAIL","mixed27.2/106.9","flat29.7/142.4","table93.0/273.9"]),{"expected":pr,"existing":perf},["docs/RUN_009_REPORT.md",ev("institution-performance-final/performance.json")])
manual_rows=[line for line in texts["docs/MANUAL_CHECK.md"].splitlines() if re.match(r"\| M\d+ \|",line)]
check("manualResultTableRemainsBlankNOT_RUN",len(manual_rows)==13 and all("| NOT_RUN | — |" in line for line in manual_rows),{"rows":len(manual_rows),"states":manual_rows},["docs/MANUAL_CHECK.md"])
check("historicalSectionsClearlyDistinguishedFromCurrent",all(x in texts["evaluation/README.md"] for x in ["## RUN-008 당시 평가 경계","## RUN-007 당시 평가 경계"]) and "## 이전 실행 당시 기록" in texts["docs/VALIDATION.md"] and "## RUN-008 당시 추가 기록" in texts["docs/WORK_SPEC.md"],{"evaluation":"Current 0.10 section precedes explicitly historical RUN008/RUN007 sections; historical uses of 현재 remain inside those sections.","validation":"Current RUN009 heading precedes 이전 실행 당시 기록.","workSpec":"RUN008 data are under 당시 추가 기록; current RUN009 close follows."},["evaluation/README.md","docs/VALIDATION.md","docs/WORK_SPEC.md"])
check("allLocalMarkdownLinksExist",not link_report["missing"],{"files":len(FILES),"summary":link_report["summary"],"missing":link_report["missing"],"finalReviewLinkExistenceOnly":(ROOT/ev("final-review.json")).exists()},["docs/evidence/run009/artifact-audit/document-audit/markdown-links.json"])
check("openingDocumentSnapshotMatchesAuditBytes",all(opening["files"][name]["sha256"]==digest for name,digest in hashes_before.items()),{"snapshot":"docs/evidence/run009/artifact-audit/document-audit/opening-snapshot.json","changed":[name for name,digest in hashes_before.items() if opening["files"][name]["sha256"]!=digest]},["docs/evidence/run009/artifact-audit/document-audit/opening-snapshot.json"])
hashes_after={str(p.relative_to(ROOT)):sha(p) for p in FILES}
check("auditedDocumentsRemainUnchanged",hashes_before==hashes_after,{"changed":[name for name,digest in hashes_before.items() if hashes_after[name]!=digest]},list(hashes_before))
evidence_after={name:sha(ROOT/name) for name in evidence_hashes}
check("readEvidenceRemainsUnchanged",evidence_hashes==evidence_after,{"files":len(evidence_hashes),"changed":[name for name,digest in evidence_hashes.items() if evidence_after[name]!=digest]},list(evidence_hashes))
findings=[r for r in checks if r["status"]=="FAIL"]
report={"startedAtUtc":started,"completedAtUtc":datetime.now(timezone.utc).isoformat(),"classification":"OFFLINE_DOCUMENT_LINK_AND_RECORDED_NUMBER_CONSISTENCY_AUDIT_NOT_PRODUCT_EXECUTION_OR_ACCEPTANCE", "status":"PASS" if not findings else "FAIL", "scope":"Only offline reading and static local Markdown-link/number consistency checks. Writes restricted to this document-audit directory.","counts":{"markdownFiles":len(FILES),"primaryDocuments":len(PRIMARY),"checks":len(checks),"passed":sum(r["status"]=="PASS" for r in checks),"failed":len(findings),"evidenceJsonFiles":len(evidence_hashes)},"linkSummary":link_report["summary"],"findings":findings,"checks":checks,"documentSha256Before":hashes_before,"documentSha256After":hashes_after,"evidenceSha256Before":evidence_hashes,"evidenceSha256After":evidence_after,"parserReusedFrom":"docs/evidence/run008/artifact-audit/document-audit/audit-documents.py","parserReusedSourceSha256":sha(ROOT/"docs/evidence/run008/artifact-audit/document-audit/audit-documents.py"),"auditScriptSha256":sha(Path(__file__)),"memoryUse":{"file":"/Users/khyun_03/.codex/memories/MEMORY.md","lines":"36-43","use":"Prior workspace context only; all current findings use repository bytes."},"limits":["No test, build, browser, product, benchmark, quality evaluation, network, CUA, native, or server execution occurred.","Saved execution records were cross-checked; this audit did not reproduce their product behavior.","Package bytes/source archive correctness and full historical provenance are separate parallel audits; this task validates their declared document numbers only.","External URL availability and Markdown section anchors are excluded; HTML href/raw code paths are outside link scope.","Final-review.json existence is checked while its aggregate result is pending; this task does not treat it as a completed signoff.","Actual goal pause is not established here: active snapshots explicitly precede requested pause after handoff.","493/local/a11y/live/synthetic passes do not establish independent quality, actual installation, actual speech/zoom, user observations, S07 or full10/10 acceptance."]}
(OUT/"report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
print(json.dumps({"status":report["status"],"counts":report["counts"],"linkSummary":report["linkSummary"],"findings":[{"name":r["name"],"observation":r["observation"]} for r in findings],"report":"docs/evidence/run009/artifact-audit/document-audit/report.json"},ensure_ascii=False,indent=2))
