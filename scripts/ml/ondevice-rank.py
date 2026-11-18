"""Lightweight on-device ranker check (docs/09_local_ai_review.md sections 10-11).

Learns "is this control essential on this page" and picks the top six per
page. Diagnostic only; nothing here ships. Features are the fixed label,
nearby heading, short path, region, tag, position and the engine's rule page
type. With --embeddings a sentence embedding of the same text is appended.

Training sources (comma-separated in --train), each <kind>:<elements dir>@<labels>@<survey.json>:
  review:  labels = a directory of engine-blind reviews; essential = positive
  teacher: labels = a picks file from ondevice-llm.mjs; the model's picks = positive
Without --predict, pages are scored leave-one-site-out over the training
sources (section 10). With --predict=<elements dir>@<survey.json>, one model is
trained on everything and applied to those pages (section 11, independent set).

--export=<model.json> (lambdarank with --predict) writes the fitted vocabularies, encoder
categories and trees for the extension's experiment build (src/learned-ranker.ts); --scores=<file>
writes every predicted control score so the JS port can be checked against this script.
--algo=lambdarank swaps the logistic model for LightGBM LambdaRank grouped by page, with graded
labels from reviews (essential 2, useful 1); teacher picks count as 2. Default stays logreg.

usage: python ondevice-rank.py --train=<sources> --output=<picks.json>
       [--predict=<elements>@<survey.json>] [--embeddings=<file.json>] [--name=<label>] [--algo=logreg|lambdarank]
"""
import json, os, re, sys, time
import numpy as np
from scipy.sparse import hstack, csr_matrix
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import OneHotEncoder

args = dict(a[2:].split('=', 1) for a in sys.argv[1:])
for key in args:
    if key not in {'train', 'predict', 'output', 'embeddings', 'name', 'algo', 'export', 'scores'}:
        raise SystemExit(f'Unknown option: --{key}')

ALGO = args.get('algo', 'logreg')
if ALGO not in {'logreg', 'lambdarank'}:
    raise SystemExit(f'Unknown algo: {ALGO}')
REGIONS = {'-', 'main', 'footer', 'nav', 'header', 'aside', 'navigation'}


def rows(elements, page_id):
    out = []
    for line in open(os.path.join(elements, page_id + '.txt'), encoding='utf8'):
        cells = line.rstrip('\n').split(' | ')
        if len(cells) < 8 or not cells[0].isdigit():
            continue
        # A label or heading may itself contain " | "; the region cell anchors the split.
        i, tag, middle, y, font = cells[0], cells[1], cells[2:-2], cells[-2], cells[-1]
        k = max(n for n, cell in enumerate(middle) if n >= 2 and cell in REGIONS) if len(middle) > 4 else 2
        label, href, region, heading = ' | '.join(middle[:k - 1]), middle[k - 1], middle[k], ' | '.join(middle[k + 1:])
        out.append(dict(i=int(i), tag=tag, label=label, href=href, region=region, heading=heading,
                        y=float(y or 0), font=float(font or 0)))
    return out


def load_engine(path):
    return {p['pageId']: p for p in json.load(open(path))['pages'] if not p.get('error')}


def page_records(elements, page, positives, source, gains=None):
    items = rows(elements, page['pageId'])
    height = max([r['y'] for r in items] + [1])
    rule_type = 'home' if page['engine'].get('homePage') else page['engine'].get('pageType', 'default')
    out = []
    for n, r in enumerate(items):
        path = re.sub(r'^[a-z0-9.-]+\.[a-z]{2,}(?=/|$)', ' ext ', r['href'].lower())
        out.append(dict(page=page['pageId'], site=page['siteId'], source=source, i=r['i'], y=int(r['i'] in positives), gain=(gains or {}).get(r['i'], 2 if r['i'] in positives else 0),
                        text=r['label'], context=f"{r['heading']} {' '.join(re.split(r'[/._?=&-]+', path))}",
                        meta=[r['tag'], r['region'], rule_type, f"{rule_type}:{r['region']}",
                              'same' if not path.startswith(' ext ') else 'ext'],
                        num=[r['y'] / height, n / max(len(items), 1), r['font'] / 20, min(len(r['label']), 40) / 40]))
    return out


records = []
for spec in args['train'].split(','):
    kind, rest = spec.split(':', 1)
    elements, labels, survey = rest.split('@')
    engine = load_engine(survey)
    if kind == 'review':
        for name in sorted(os.listdir(labels)):
            if name.endswith('.json'):
                review = json.load(open(os.path.join(labels, name)))
                if review['pageId'] in engine:
                    essential = {item['i'] for item in review['essential']}
                    gains = {**{item['i']: 1 for item in review.get('useful', [])}, **{i: 2 for i in essential}}
                    records += page_records(elements, engine[review['pageId']], essential, kind, gains)
    elif kind == 'teacher':
        for page in json.load(open(labels))['pages']:
            if page['pageId'] in engine and not page.get('error') and page['picks']:
                records += page_records(elements, engine[page['pageId']], set(page['picks']), kind)
    else:
        raise SystemExit(f'Unknown training source: {kind}')

targets = []
if 'predict' in args:
    elements, survey = args['predict'].split('@')
    for page in load_engine(survey).values():
        if os.path.exists(os.path.join(elements, page['pageId'] + '.txt')):
            targets += page_records(elements, page, set(), 'predict')

if 'embeddings' in args:
    data = json.load(open(args['embeddings']))
    lookup = {(row['page'], row['i']): np.array(row['vector']) for row in data['rows']}
    for r in records + targets:
        r['vec'] = lookup[(r['page'], r['i'])]


def fit(train):
    label = TfidfVectorizer(analyzer='char_wb', ngram_range=(2, 4), min_df=2, sublinear_tf=True)
    context = TfidfVectorizer(analyzer='char_wb', ngram_range=(2, 3), min_df=3, sublinear_tf=True, max_features=4000)
    meta = OneHotEncoder(handle_unknown='ignore')

    def features(part, first=False):
        blocks = [
            (label.fit_transform if first else label.transform)([r['text'] for r in part]),
            (context.fit_transform if first else context.transform)([r['context'] for r in part]) * 0.5,
            (meta.fit_transform if first else meta.transform)([r['meta'] for r in part]),
            csr_matrix(np.array([r['num'] for r in part])),
        ]
        if 'vec' in part[0]:
            blocks.append(csr_matrix(np.array([r['vec'] for r in part])))
        return hstack(blocks).tocsr()

    if ALGO == 'lambdarank':
        import lightgbm
        groups, last = [], None
        for r in train:  # records are appended page by page, so pages are contiguous
            if r['page'] != last:
                groups.append(0); last = r['page']
            groups[-1] += 1
        model = lightgbm.LGBMRanker(objective='lambdarank', n_estimators=300, learning_rate=0.05, num_leaves=31,
                                    min_child_samples=10, lambdarank_truncation_level=10, random_state=20261118, verbose=-1)
        model.fit(features(train, first=True).astype(np.float32), [r['gain'] for r in train], group=groups, eval_at=[6])
        fitted.update(label=label, context=context, meta=meta, model=model)
        return lambda part: model.predict(features(part).astype(np.float32))
    model = LogisticRegression(C=1.0, max_iter=3000, class_weight='balanced')
    model.fit(features(train, first=True), [r['y'] for r in train])
    return lambda part: model.predict_proba(features(part))[:, 1]


picks, fit_ms, predict_ms, fitted, all_scores = {}, [], [], {}, {}


def choose(score, part_records):
    for page_id in sorted({r['page'] for r in part_records}):
        part = [r for r in part_records if r['page'] == page_id]
        started = time.perf_counter()
        scores = score(part)
        predict_ms.append((time.perf_counter() - started) * 1000)
        picks[page_id] = [int(part[k]['i']) for k in np.argsort(-scores)[:6]]
        all_scores[page_id] = {int(r['i']): float(v) for r, v in zip(part, scores)}


if targets:
    started = time.perf_counter()
    score = fit(records)
    fit_ms.append((time.perf_counter() - started) * 1000)
    choose(score, targets)
    protocol = 'trained on %d controls (%s), applied to %d pages' % (len(records), ', '.join(sorted({r['source'] for r in records})), len(picks))
else:
    sites = sorted({r['site'] for r in records})
    for site in sites:
        started = time.perf_counter()
        score = fit([r for r in records if r['site'] != site])
        fit_ms.append((time.perf_counter() - started) * 1000)
        choose(score, [r for r in records if r['site'] == site and r['source'] == 'review'])
    protocol = 'leave-one-site-out over %d sites, %d pages, %d controls' % (len(sites), len(picks), len(records))

json.dump(dict(model=args.get('name', ('char-ngram-lambdarank' if ALGO == 'lambdarank' else 'char-ngram-logreg') + ('+embedding' if 'embeddings' in args else '')), protocol=protocol,
               scope='Diagnostic only. Reference is an engine-blind Claude review, not human users.',
               fitMsMedian=round(float(np.median(fit_ms)), 1), predictMsPerPageMedian=round(float(np.median(predict_ms)), 2),
               pages=[dict(pageId=p, picks=v) for p, v in sorted(picks.items())]),
          open(args['output'], 'w'), ensure_ascii=False, indent=1)
if 'scores' in args:
    json.dump(all_scores, open(args['scores'], 'w'))
if 'export' in args:
    if ALGO != 'lambdarank' or not targets or 'embeddings' in args:
        raise SystemExit('--export needs --algo=lambdarank and --predict, without --embeddings')
    def vocab(v):
        return dict(ngram=list(v.ngram_range), terms={t: [int(n), float(v.idf_[n])] for t, n in v.vocabulary_.items()})
    dump = fitted['model'].booster_.dump_model()
    json.dump(dict(format='easyweb-lambdarank-1', note='Diagnostic experiment model. Trained on engine-blind Claude reviews of the 2026-11-01 development pages.',
                   trained=protocol, label=vocab(fitted['label']), context=vocab(fitted['context']), contextWeight=0.5,
                   meta=[list(map(str, c)) for c in fitted['meta'].categories_], numeric=['y/pageHeight', 'index/count', 'fontPx/20', 'min(labelLength,40)/40'],
                   trees=[t['tree_structure'] for t in dump['tree_info']]),
              open(args['export'], 'w'), ensure_ascii=False, separators=(',', ':'))
print(f"{protocol}; fit {np.median(fit_ms):.0f}ms, predict {np.median(predict_ms):.2f}ms/page")
