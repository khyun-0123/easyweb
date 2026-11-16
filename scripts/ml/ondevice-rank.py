"""Lightweight on-device ranker check (docs/09_local_ai_review.md section 10).

Learns "is this control essential on this page" from the engine-blind review
of the 2026-11-01 site survey and picks the top six per page. Leave-one-site-
out: a page is always scored by a model that never saw its site. Diagnostic
only; nothing here ships. Features are the fixed label, nearby heading, short
path, region, tag, position and the engine's rule page type. With --embeddings
a sentence embedding of the same text is appended.

usage: python ondevice-rank.py --elements=<dir> --review=<dir> --engine=<survey.json>
       --output=<picks.json> [--embeddings=<file.json>] [--name=<label>]
"""
import json, os, re, sys, time
import numpy as np
from scipy.sparse import hstack, csr_matrix
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import OneHotEncoder

args = dict(a[2:].split('=', 1) for a in sys.argv[1:])
for key in args:
    if key not in {'elements', 'review', 'engine', 'output', 'embeddings', 'name'}:
        raise SystemExit(f'Unknown option: --{key}')

engine = {p['pageId']: p for p in json.load(open(args['engine']))['pages'] if not p.get('error')}
reviews = {}
for name in os.listdir(args['review']):
    if name.endswith('.json'):
        review = json.load(open(os.path.join(args['review'], name)))
        reviews[review['pageId']] = review


REGIONS = {'-', 'main', 'footer', 'nav', 'header', 'aside', 'navigation'}


def rows(page_id):
    out = []
    for line in open(os.path.join(args['elements'], page_id + '.txt'), encoding='utf8'):
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


records = []
for page_id, review in sorted(reviews.items()):
    page = engine.get(page_id)
    if not page:
        continue
    essential = {item['i'] for item in review['essential']}
    items = rows(page_id)
    height = max([r['y'] for r in items] + [1])
    rule_type = 'home' if page['engine'].get('homePage') else page['engine'].get('pageType', 'default')
    for n, r in enumerate(items):
        path = re.sub(r'^[a-z0-9.-]+\.[a-z]{2,}(?=/|$)', ' ext ', r['href'].lower())
        records.append(dict(page=page_id, site=page['siteId'], i=r['i'], y=int(r['i'] in essential),
                            text=r['label'], context=f"{r['heading']} {' '.join(re.split(r'[/._?=&-]+', path))}",
                            meta=[r['tag'], r['region'], rule_type, f"{rule_type}:{r['region']}",
                                  'same' if not path.startswith(' ext ') else 'ext'],
                            num=[r['y'] / height, n / max(len(items), 1), r['font'] / 20, min(len(r['label']), 40) / 40]))

embedding = None
if 'embeddings' in args:
    data = json.load(open(args['embeddings']))
    lookup = {(row['page'], row['i']): np.array(row['vector']) for row in data['rows']}
    embedding = np.array([lookup[(r['page'], r['i'])] for r in records])

sites = sorted({r['site'] for r in records})
picks, fit_ms, predict_ms = {}, [], []
for site in sites:
    train = [r for r in records if r['site'] != site]
    test = [r for r in records if r['site'] == site]
    label = TfidfVectorizer(analyzer='char_wb', ngram_range=(2, 4), min_df=2, sublinear_tf=True)
    context = TfidfVectorizer(analyzer='char_wb', ngram_range=(2, 3), min_df=3, sublinear_tf=True, max_features=4000)
    meta = OneHotEncoder(handle_unknown='ignore')

    def features(part, fit=False):
        blocks = [
            (label.fit_transform if fit else label.transform)([r['text'] for r in part]),
            (context.fit_transform if fit else context.transform)([r['context'] for r in part]) * 0.5,
            (meta.fit_transform if fit else meta.transform)([r['meta'] for r in part]),
            csr_matrix(np.array([r['num'] for r in part])),
        ]
        if embedding is not None:
            blocks.append(csr_matrix(np.array([r['vec'] for r in part])))
        return hstack(blocks).tocsr()

    if embedding is not None:
        for r, v in zip(records, embedding):
            r['vec'] = v
    started = time.perf_counter()
    model = LogisticRegression(C=1.0, max_iter=3000, class_weight='balanced')
    model.fit(features(train, fit=True), [r['y'] for r in train])
    fit_ms.append((time.perf_counter() - started) * 1000)
    for page_id in sorted({r['page'] for r in test}):
        part = [r for r in test if r['page'] == page_id]
        started = time.perf_counter()
        scores = model.predict_proba(features(part))[:, 1]
        predict_ms.append((time.perf_counter() - started) * 1000)
        order = np.argsort(-scores)
        picks[page_id] = [int(part[k]['i']) for k in order[:6]]

json.dump(dict(model=args.get('name', 'char-ngram-logreg' + ('+embedding' if embedding is not None else '')),
               protocol='leave-one-site-out over %d sites, %d pages, %d controls' % (len(sites), len(picks), len(records)),
               scope='Diagnostic only. Exposed development pages; reference is an engine-blind Claude review, not human users.',
               fitMsMedian=round(float(np.median(fit_ms)), 1), predictMsPerPageMedian=round(float(np.median(predict_ms)), 2),
               pages=[dict(pageId=p, picks=v) for p, v in sorted(picks.items())]),
          open(args['output'], 'w'), ensure_ascii=False, indent=1)
print(f"{len(picks)} pages, fit {np.median(fit_ms):.0f}ms, predict {np.median(predict_ms):.2f}ms/page")
