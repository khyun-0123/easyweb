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
           "docs/RUN_008_REPORT.md", "docs/INSTALL.md", "docs/PRETEST.md",
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
hashes_before = {str(p.relative_to(ROOT)): sha(p) for p in FILES}
rows = []
for path in FILES:
    relative = str(path.relative_to(ROOT))
    for row in links(path.read_text()):
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
link_report = {
    "checkedAtUtc": datetime.now(timezone.utc).isoformat(),
    "scope": "Static local Markdown link existence only in root, docs top-level and evaluation recursive Markdown; no evidence/archive Markdown or external/anchor resolution.",
    "method": "Offset-preserving removal of fenced/indented/inline code and comments; inline images/links, balanced destinations, angle destinations, escaped punctuation and reference links; URL percent-decoding and query/fragment separation.",
    "files": hashes_before, "primaryFiles": PRIMARY,
    "summary": dict(Counter(row["status"] for row in rows)),
    "missing": [row for row in rows if row["status"] == "MISSING"],
    "links": rows,
    "limits": ["External URL availability and section-anchor validity are excluded.",
               "Existence does not prove that an artifact is correct or that any manual/native/human test happened.",
               "HTML href attributes and raw code/example paths are outside Markdown link scope."]}
OUT.mkdir(parents=True, exist_ok=True)
(OUT / "markdown-links.json").write_text(json.dumps(link_report, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({"files": len(FILES), "primaryFiles": len(PRIMARY), "summary": link_report["summary"], "missing": link_report["missing"]},ensure_ascii=False, indent=2))

EVIDENCE = [
    "docs/evidence/run008/local-verification.json", "docs/evidence/run008/playwright-local.json",
    "docs/evidence/run008/a11y-automated.json", "docs/evidence/run008/tasks-live.json",
    "docs/evidence/run008/first-development-comparison/summary.json",
    "docs/evidence/run008/blind-v10-first-evaluated/evaluation-current-institution-blind-v10-holdout.json",
    "docs/evidence/run008/blind-v10-first-evaluated/command-start.json",
    "docs/evidence/run008/blind-v10-first-evaluated/command-completion.json",
    "docs/evidence/run008/blind-v10-first/command-completion.json",
    "docs/evidence/run008/performance.json", "docs/evidence/run008/performance-flat.json",
    "docs/evidence/run008/performance-table.json",
    "docs/evidence/run008/institution-performance-first/performance.json",
    "docs/evidence/run008/release-gate.json", "docs/evidence/run008/v0.9-engine-freeze.json",
    "docs/evidence/run008/local-preview-http-final.json", "docs/evidence/run008/goal-usage-snapshot.json",
    "docs/evidence/run008/run-start.json", "output/run008/EasyWeb-0.9.0-candidate.json",
    "docs/evidence/run008/post-first-diagnosis/expected-source-relations.json",
    "docs/evidence/run008/post-first-diagnosis/diagnosis.json",
    "docs/evidence/run008/post-first-trace/trace.json",
]
evidence_hashes = {name: sha(ROOT / name) for name in EVIDENCE}
loaded = {name: json.loads((ROOT / name).read_text()) for name in EVIDENCE}
def data(suffix):
    return next(v for k, v in loaded.items() if k.endswith(suffix))
checks = []
def check(name, ok, observation, evidence):
    checks.append({"name": name, "status": "PASS" if ok else "FAIL", "observation": observation, "evidence": evidence})
local = data("local-verification.json")
raw = data("playwright-local.json")
check("local409", all(local["tests"][k] == raw["stats"][k] == v for k,v in {"expected":409,"unexpected":0,"flaky":0,"skipped":0}.items()), local["tests"], ["local-verification.json", "playwright-local.json"])
check("recordedTypeBuildStages", all(s["exitCode"] == 0 and s["status"] == "PASS" for s in local["stages"]), [{"name":s["name"],"exitCode":s["exitCode"],"status":s["status"]} for s in local["stages"]], ["local-verification.json"])
core = local["coreQuality"]["summary"]
check("coreFirstScreen", tuple(core[k] for k in ["correct","recommended","matched","expected","tasksRecommended"]) == (72,74,45,45,15), core, ["local-verification.json"])
a11y = data("a11y-automated.json")["summary"]
check("a11y21SeparateFromActualSpeechZoom", a11y["cases"] == 21 and all(a11y[k] == 0 for k in ["errors","violations","seriousOrCritical","incomplete"]), a11y, ["a11y-automated.json", "docs/ACCESSIBILITY.md"])
live = data("tasks-live.json")["summary"]
check("existingPublicTasks15SeparateFromBusinessHumanNative", all(live[k] == v for k,v in {"passed":15,"destinationReached":9,"originalGuidanceReached":6,"guidanceRetries":0,"observationErrors":0}.items()), live, ["tasks-live.json", "docs/RUN_008_REPORT.md"])
compare = data("first-development-comparison/summary.json")
aggregates = {r["mode"]:r["summary"] for r in compare["uniquePageAggregates"]}
check("known55SameSource26Runs", len(compare["rows"]) == 26 and Counter(r["mode"] for r in compare["rows"]) == {"generic":13,"institution":13} and compare["uniqueExposedPages"] == 55 and compare["stableBeforeAndAfter"], {"rows":len(compare["rows"]),"modes":dict(Counter(r["mode"] for r in compare["rows"])),"uniquePages":compare["uniqueExposedPages"],"stableBeforeAndAfter":compare["stableBeforeAndAfter"]}, ["first-development-comparison/summary.json"])
check("known55UniqueAggregates", tuple(aggregates["institution"][k] for k in ["pages","correct","recommended","matched","expected","tasksRecommended"]) == (55,257,260,153,155,55) and tuple(aggregates["generic"][k] for k in ["pages","correct","recommended","matched","expected","tasksRecommended"]) == (55,234,242,133,155,48), aggregates, ["first-development-comparison/summary.json"])
table = []
rowmap = {(r["mode"],r["suite"]):r for r in compare["rows"]}
for line in (ROOT / "docs/RUN_008_REPORT.md").read_text().splitlines():
    if not line.startswith("|"):
        continue
    cells = line.strip("|").split("|")
    if len(cells) != 4 or ("institution",cells[0]) not in rowmap:
        continue
    suite, gen, ins, status = cells
    def stat(r):
        s = r["summary"]
        return f"{s['correct']}/{s['recommended']} ·{s['matched']}/{s['expected']}"
    ok = gen.strip() == stat(rowmap[("generic",suite)]) and ins.strip() == stat(rowmap[("institution",suite)]) and status.strip() == rowmap[("institution",suite)]["quality"]["status"]
    table.append({"suite":suite,"matches":ok})
check("reportAll13SuiteTableRows", len(table) == 13 and all(r["matches"] for r in table), table, ["docs/RUN_008_REPORT.md", "first-development-comparison/summary.json"])
v8 = rowmap[("institution","blind-v8")]
check("knownV8RegressionPreserved", v8["summary"]["matched"] == 14 and v8["summary"]["expected"] == 15 and v8["quality"]["status"] == "FAIL", {"summary":v8["summary"],"quality":v8["quality"]["status"],"gate":data("release-gate.json")["knownV8Regression"]}, ["first-development-comparison/summary.json", "release-gate.json"])
first = data("evaluation-current-institution-blind-v10-holdout.json")
complete = data("blind-v10-first-evaluated/command-completion.json")
gate = data("release-gate.json")
fs = first["summary"]
mf = first["menuFlow"]
check("freshFirst26of28_2of15_0of5_AllSitesFail", tuple(fs[k] for k in ["correct","recommended","matched","expected","tasksRecommended"]) == (26,28,2,15,0) and first["quality"]["status"] == "FAIL" and all(not r["passed"] for r in first["quality"]["sites"]) and complete["summary"] == fs and gate["freshIndependent"]["firstScreen"] == fs, {"summary":fs,"sites":first["quality"]["sites"]}, ["blind-v10-first-evaluated/evaluation-current-institution-blind-v10-holdout.json", "blind-v10-first-evaluated/command-completion.json", "release-gate.json"])
check("separateMenuFlow32of40_3of15_0of5_Ambiguous9Repeated4", tuple(mf["summary"][k] for k in ["correct","recommended","matched","expected","tasksRecommended"]) == (32,40,3,15,0) and mf["unresolvedMappings"] == 9 and mf["repeatedCards"] == 4 and complete["menuFlow"] == mf and gate["freshIndependent"]["menuFlowSeparate"] == mf, {"summary":mf["summary"],"unresolvedMappings":mf["unresolvedMappings"],"repeatedCards":mf["repeatedCards"],"interpretation":"Ambiguous evaluator-to-source mapping is not proof of repeating the same original node or an S05 defect."}, ["blind-v10-first-evaluated/evaluation-current-institution-blind-v10-holdout.json", "release-gate.json", "docs/RUN_008_REPORT.md"])
first_path = ROOT / "docs/evidence/run008/blind-v10-first-evaluated/evaluation-current-institution-blind-v10-holdout.json"
check("firstResultDeclaredHash", sha(first_path) == complete["reportSha256"] == "e469fe25011392ea61be795a00d552e02ef7aa7d23789c1e9db08973c5a1c131", {"actualSha256":sha(first_path),"declaredSha256":complete["reportSha256"],"exitCode":complete["exitCode"]}, ["blind-v10-first-evaluated/command-completion.json"])
trace = data("post-first-trace/trace.json")
diagnosis = data("post-first-diagnosis/diagnosis.json")
stage_counts = Counter(g["stage"] for row in trace["results"] for g in row["groups"] if g["firstMissed"])
groups = [g for row in trace["results"] for g in row["groups"] if g["firstMissed"]]
check("postExposureStageTrace12Unclassified1OutsideFirst", dict(stage_counts) == {"CLASSIFIED_NOT_FIRST":1,"RAW_BUT_UNCLASSIFIED":12} and dict(stage_counts) == trace["missingStageCounts"] and trace["sourceStable"] and trace["firstReportUnchanged"] and trace["network"]["externalRequests"] == 0 and diagnosis["postExposureTraceAddendum"]["sha256"] == sha(ROOT / "docs/evidence/run008/post-first-trace/trace.json") and all(g["raw"] for g in groups) and all(not g["classified"] for g in groups if g["stage"] == "RAW_BUT_UNCLASSIFIED") and all(g["classified"] and not g["selected"] for g in groups if g["stage"] == "CLASSIFIED_NOT_FIRST"), {"countedMissedGroups":dict(stage_counts),"declared":trace["missingStageCounts"],"sourceStable":trace["sourceStable"],"firstReportUnchanged":trace["firstReportUnchanged"],"externalRequests":trace["network"]["externalRequests"],"scope":trace["scope"],"diagnosisTraceHashBound":diagnosis["postExposureTraceAddendum"]["sha256"]}, ["post-first-trace/trace.json","post-first-diagnosis/diagnosis.json","docs/RUN_008_REPORT.md"])
perf = [loaded[f"docs/evidence/run008/{n}"] for n in ["performance.json","performance-flat.json","performance-table.json"]]
check("existingSyntheticThreeShapesPASS", all(p["status"] == "PASS" and len(p["measures"]) == 10 and p["analyzerP95Milliseconds"] <= 300 and p["overlayReadyP95Milliseconds"] <= 1000 for p in perf), [{"shape":n,"analyzerP95":round(p["analyzerP95Milliseconds"],1),"readyP95":round(p["overlayReadyP95Milliseconds"],1),"samples":len(p["measures"]),"status":p["status"]} for n,p in zip(["mixed","flat","table"],perf)], ["performance.json", "performance-flat.json", "performance-table.json"])
pipeline = data("institution-performance-first/performance.json")
check("wholePipeline300msFAILPreservedSeparateExistingPASS", pipeline["existingBenchmarkStatus"] == "PASS" and pipeline["additionalPipelineDiagnosticStatus"] == "FAIL" and round(pipeline["modes"]["institution"]["analysisPipelineP95Milliseconds"],1) == 575.9 and round(pipeline["modes"]["generic"]["analysisPipelineP95Milliseconds"],1) == 437.9, {mode:{k:(round(v,1) if isinstance(v,float) else v) for k,v in values.items() if k in ["status","existingBenchmarkStatus","additionalPipelineDiagnosticStatus","analyzerP95Milliseconds","analysisPipelineP95Milliseconds","overlayReadyP95Milliseconds","currentnessBatchP95Milliseconds"]} for mode,values in pipeline["modes"].items()}, ["institution-performance-first/performance.json"])
check("acceptance5of10NOT_METAnd60Exposed", gate["completedStages"] == 5 and gate["totalStages"] == 10 and gate["overallAcceptance"] == "NOT_MET" and gate["uniqueExposedPagesAfterFirst"] == 60, {k:gate[k] for k in ["version","completedStages","totalStages","overallAcceptance","uniqueExposedPagesAfterFirst","states"]}, ["release-gate.json", "docs/PROGRESS.md", "docs/WORK_SPEC.md"])
check("actualManualNativeHumanNOT_RUNorZero", all(gate[k] == "NOT_RUN" for k in ["currentNativeInstall","actualVoiceOverSpeech","actualBrowserZoom"]) and all(gate[k] == 0 for k in ["pretestActualObservations","formalStudyActualObservations","CUAOrNativeAutomationCount"]), {k:gate[k] for k in ["currentNativeInstall","actualVoiceOverSpeech","actualBrowserZoom","pretestActualObservations","formalStudyActualObservations","CUAOrNativeAutomationCount"]}, ["release-gate.json", "docs/ACCESSIBILITY.md", "docs/INSTALL.md", "docs/PRETEST.md"])
usage = data("goal-usage-snapshot.json")
check("usageUnknownBillingHonestBoundary", usage["wholeRunElapsed"] == "UNKNOWN" and all(v == "UNKNOWN" for v in usage["billing"].values()) and "Not whole RUN008" in usage["scope"], {"scope":usage["scope"],"wholeRunElapsed":usage["wholeRunElapsed"],"billing":usage["billing"]}, ["goal-usage-snapshot.json", "docs/RUN_008_REPORT.md"])
check("localPreviewHTTPDoesNotProveActualManual", "not actual install/assistive-tech verification" in data("local-preview-http-final.json")["scope"] and "200/파일바이트일치만" in (ROOT / "docs/RUN_008_REPORT.md").read_text(), {"scope":data("local-preview-http-final.json")["scope"],"rows":len(data("local-preview-http-final.json")["rows"])}, ["local-preview-http-final.json", "docs/RUN_008_REPORT.md"])
opening_path = OUT / "opening-snapshot.json"
if not opening_path.exists():
    opening_path.write_text(json.dumps({"checkedAtUtc":started,"documents":hashes_before,"evidence":evidence_hashes,"linkSummary":link_report["summary"]},ensure_ascii=False,indent=2) + "\n")
opening = json.loads(opening_path.read_text())
findings = []
pre = (ROOT / "docs/PRETEST.md").read_text()
findings.append({"id":"D01","area":"pretest/global acceptance distinction","originalObservation":"PRETEST line57 said product acceptance NOT_EVALUATED despite current release gate NOT_MET.","status":"OPEN" if "제품 인수는 **NOT_EVALUATED**" in pre else "RESOLVED_DURING_AUDIT","file":"docs/PRETEST.md"})
for name in ["docs/SUPPORT_MATRIX.md","docs/INSTALL.md"]:
    text = (ROOT / name).read_text()
    findings.append({"id":"D02-"+Path(name).stem,"area":"relevance tier before category diversity","originalObservation":"Current policy summary said category diversity first without actual content relevance tier precedence.","status":"OPEN" if "분류 다양성을 먼저 확보한 뒤" in text else "RESOLVED_DURING_AUDIT","file":name})
support = (ROOT / "docs/SUPPORT_MATRIX.md").read_text()
findings.append({"id":"D03","area":"same-document fragment scope","originalObservation":"Support summary grouped all fragments with locate-only controls and omitted ordinary different-document fragment links.","status":"OPEN" if "JavaScript·팝업·fragment·인증" in support else "RESOLVED_DURING_AUDIT","file":"docs/SUPPORT_MATRIX.md"})
hashes_after = {str(p.relative_to(ROOT)):sha(p) for p in FILES}
stable = hashes_before == hashes_after and evidence_hashes == {name:sha(ROOT / name) for name in EVIDENCE}
pending = [row for row in link_report["missing"] if row["target"].endswith("run008/final-review.json")]
other_missing = [row for row in link_report["missing"] if row not in pending]
status = "PASS" if all(c["status"] == "PASS" for c in checks) and not any(f["status"] == "OPEN" for f in findings) and not link_report["missing"] and stable else "PENDING_FINAL_REVIEW_OR_DOCUMENT_CORRECTIONS"
report = {"checkedAtUtc":datetime.now(timezone.utc).isoformat(),"status":status,
          "scope":"Read-only offline document/artifact consistency audit; not safety/quality/performance/accessibility/native/human acceptance. Only this document-audit directory was written.",
          "primaryDocuments":PRIMARY,"documentHashesAtCheck":hashes_after,"evidenceHashesAtCheck":evidence_hashes,
          "openingSnapshot":"opening-snapshot.json","changedDocumentsSinceOpening":[name for name in hashes_after if opening["documents"].get(name) != hashes_after[name]],
          "stableDuringThisCheck":stable,"checks":checks,"findings":findings,
          "links":{"report":"markdown-links.json","summary":link_report["summary"],"pendingExpectedFinalReview":pending,"otherMissing":other_missing},
          "limits":["No builds, product tests, benchmarks, browser/native/CUA actions, network requests, server operations or product/source/tool/evaluation-input mutations were performed.",
                    "Recorded validation summaries and exact declared counts were cross-checked; independent product behavior was not re-executed.",
                    "Archive and frozen dataset byte/history integrity are handled by the parent artifact audit; this subtask does not independently claim them.",
                    "A separate source-stable post-exposure development trace confirms12 raw-but-unclassified groups and1 classified group outside the first screen; detailed branch-cause hypotheses and future improvements remain separate from this audit.",
                    "Menu mapping9/repeated4 cannot establish original-node duplicate or S05 failure.",
                    "External URLs, Markdown anchors and HTML href attributes are outside local path link scope.",
                    "Evidence files were read for documented outcomes; no fresh content was used for product tuning.",
                    "Final-review existence is checked without hashing its content to avoid a circular report dependency."]}
(OUT / "report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2) + "\n")
print(json.dumps({"status":status,"checks":len(checks),"failedChecks":[c["name"] for c in checks if c["status"] != "PASS"],"findings":findings,"stableDuringThisCheck":stable},ensure_ascii=False,indent=2))
