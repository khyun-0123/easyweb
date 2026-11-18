"""Fine-tuned small cross-encoder check (docs/reviews/business_review_20261118.md section 7).

A multilingual MiniLM cross-encoder (about 118M parameters) is fine-tuned to score
(page, control) pairs with the engine-blind reviews as labels (essential 1.0, useful 0.5, else 0),
then the top six controls of each page become the picks. Diagnostic only; nothing here ships.
Same control text as scripts/ml/ondevice-rank.py: fixed label, nearby heading, region, short path.

Without --predict, pages are scored by site-grouped k-fold over the review set (--folds, default 5).
With --predict=<elements dir>@<survey.json>, one model is trained on every review and applied there.

usage: python ondevice-crossenc.py --train=<elements dir>@<review dir>@<survey.json> --output=<picks.json>
       [--predict=<elements>@<survey.json>] [--folds=5] [--model=<hf id>] [--epochs=2]
"""
import json, os, random, re, sys, time
import numpy as np
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

args = dict(a[2:].split('=', 1) for a in sys.argv[1:])
for key in args:
    if key not in {'train', 'predict', 'output', 'folds', 'model', 'epochs'}:
        raise SystemExit(f'Unknown option: --{key}')
MODEL = args.get('model', 'cross-encoder/mmarco-mMiniLMv2-L12-H384-v1')
EPOCHS, FOLDS, SEED, NEG_PER_POS, BATCH, MAX_LEN, LR = int(args.get('epochs', 2)), int(args.get('folds', 5)), 20261118, 8, 32, 96, 2e-5
device = 'mps' if torch.backends.mps.is_available() else 'cpu'
REGIONS = {'-', 'main', 'footer', 'nav', 'header', 'aside', 'navigation'}


def rows(elements, page_id):
    text = open(os.path.join(elements, page_id + '.txt'), encoding='utf8').read()
    title = (re.search(r'^title: (.*)$', text, re.M) or [None, ''])[1][:80]
    out = []
    for line in text.split('\n'):
        cells = line.split(' | ')
        if len(cells) < 8 or not cells[0].isdigit():
            continue
        middle = cells[2:-2]
        k = max(n for n, cell in enumerate(middle) if n >= 2 and cell in REGIONS) if len(middle) > 4 else 2
        label, href, region, heading = ' | '.join(middle[:k - 1]), middle[k - 1], middle[k], ' | '.join(middle[k + 1:])
        path = ' '.join(re.split(r'[/._?=&-]+', re.sub(r'^[a-z0-9.-]+\.[a-z]{2,}(?=/|$)', ' ext ', href.lower())))[:40]
        out.append(dict(i=int(cells[0]), doc=f'{label[:60]} | {heading[:30]} | {region} | {path}'))
    return title, out


def load(spec, labelled):
    parts = spec.split('@')
    elements, survey = parts[0], parts[-1]
    engine = {p['pageId']: p for p in json.load(open(survey))['pages'] if not p.get('error')}
    pages = []
    if labelled:
        for name in sorted(os.listdir(parts[1])):
            if not name.endswith('.json'):
                continue
            review = json.load(open(os.path.join(parts[1], name)))
            if review['pageId'] not in engine:
                continue
            gain = {**{x['i']: 0.5 for x in review.get('useful', [])}, **{x['i']: 1.0 for x in review['essential']}}
            title, items = rows(elements, review['pageId'])
            pages.append(dict(page=review['pageId'], site=engine[review['pageId']]['siteId'], title=title, items=[dict(r, y=gain.get(r['i'], 0.0)) for r in items]))
    else:
        for page_id, page in sorted(engine.items()):
            if os.path.exists(os.path.join(elements, page_id + '.txt')):
                title, items = rows(elements, page_id)
                pages.append(dict(page=page_id, site=page['siteId'], title=title, items=items))
    return pages


def query(page):
    return f'어르신이 "{page["title"]}" 페이지에서 가장 하려는 일'


def train(pages):
    random.seed(SEED); np.random.seed(SEED); torch.manual_seed(SEED)
    tok = AutoTokenizer.from_pretrained(MODEL)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL, num_labels=1).to(device)
    opt = torch.optim.AdamW(model.parameters(), lr=LR)
    for _ in range(EPOCHS):
        pairs = []
        for page in pages:
            pos = [r for r in page['items'] if r['y'] > 0]
            neg = [r for r in page['items'] if r['y'] == 0]
            pairs += [(query(page), r['doc'], r['y']) for r in pos + random.sample(neg, min(len(neg), NEG_PER_POS * max(len(pos), 1)))]
        random.shuffle(pairs)
        model.train()
        for b in range(0, len(pairs), BATCH):
            q, d, y = zip(*pairs[b:b + BATCH])
            enc = tok(list(q), list(d), padding=True, truncation=True, max_length=MAX_LEN, return_tensors='pt').to(device)
            loss = torch.nn.functional.binary_cross_entropy_with_logits(model(**enc).logits.squeeze(-1), torch.tensor(y, dtype=torch.float32, device=device))
            opt.zero_grad(); loss.backward(); opt.step()
    model.eval()
    return tok, model


picks, predict_ms = {}, []


@torch.no_grad()
def choose(tok, model, pages):
    for page in pages:
        started = time.perf_counter()
        scores = []
        for b in range(0, len(page['items']), 128):
            chunk = page['items'][b:b + 128]
            enc = tok([query(page)] * len(chunk), [r['doc'] for r in chunk], padding=True, truncation=True, max_length=MAX_LEN, return_tensors='pt').to(device)
            scores += model(**enc).logits.squeeze(-1).float().cpu().tolist()
        predict_ms.append((time.perf_counter() - started) * 1000)
        picks[page['page']] = [page['items'][k]['i'] for k in np.argsort(-np.array(scores))[:6]]


reviewed = load(args['train'], labelled=True)
started = time.perf_counter()
if 'predict' in args:
    targets = load(args['predict'], labelled=False)
    choose(*train(reviewed), targets)
    protocol = f'fine-tuned on {len(reviewed)} reviewed pages, applied to {len(targets)} pages'
else:
    sites = sorted({p['site'] for p in reviewed})
    random.Random(SEED).shuffle(sites)
    for f in range(FOLDS):
        held = set(sites[f::FOLDS])
        choose(*train([p for p in reviewed if p['site'] not in held]), [p for p in reviewed if p['site'] in held])
    protocol = f'site-grouped {FOLDS}-fold over {len(sites)} sites, {len(picks)} pages'
json.dump(dict(model=f'crossenc-ft:{MODEL.split("/")[-1]}', modelId=MODEL, protocol=protocol, device=device,
               settings=dict(epochs=EPOCHS, negPerPos=NEG_PER_POS, batch=BATCH, maxLen=MAX_LEN, lr=LR, seed=SEED),
               scope='Diagnostic only. Reference is an engine-blind Claude review, not human users.',
               totalSeconds=round(time.perf_counter() - started, 1), predictMsPerPageMedian=round(float(np.median(predict_ms)), 1),
               pages=[dict(pageId=p, picks=v) for p, v in sorted(picks.items())]),
          open(args['output'], 'w'), ensure_ascii=False, indent=1)
print(f'{protocol}; {time.perf_counter() - started:.0f}s total, predict {np.median(predict_ms):.0f}ms/page on {device}')
