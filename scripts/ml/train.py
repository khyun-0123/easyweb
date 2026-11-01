"""M1 of docs/09_local_ai_review.md: char n-gram logistic regression, leave-one-site-out.

Run with the separate venv:  ~/.venvs/easyweb-ml/bin/python -I scripts/ml/train.py <dataset.jsonl> <empty output dir>
Gold labels are human annotations. The rule column is a comparison baseline;
the rule engine was tuned on these same exposed pages, so it is optimistic.
"""
import hashlib, json, os, sys
from collections import Counter

import numpy as np
from scipy.sparse import hstack
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score
from sklearn.preprocessing import OneHotEncoder

SEED = 0
CLASSES = ['none', 'login', 'search', 'notice', 'academic', 'apply', 'help']


def load(path):
    with open(path, encoding='utf-8') as f:
        return [r for r in map(json.loads, f) if r['gold'] is not None]


def views(rows):
    label = [r['label'] for r in rows]
    context = [' '.join(r['contextLabels']) for r in rows]
    href = [r['hrefPath'] or '' for r in rows]
    meta = [[r['context'], r['action'], r['tag'], r['role'] or '-', str(r['sameHost']), str(r['opensNewWindow'])] for r in rows]
    return label, context, href, meta


class Model:
    def fit(self, rows, weights=None):
        label, context, href, meta = views(rows)
        self.v_label = TfidfVectorizer(analyzer='char_wb', ngram_range=(1, 3), sublinear_tf=True)
        self.v_context = TfidfVectorizer(analyzer='char_wb', ngram_range=(1, 3), sublinear_tf=True, max_features=3000)
        self.v_href = TfidfVectorizer(analyzer='char_wb', ngram_range=(2, 4), sublinear_tf=True, lowercase=True)
        self.v_meta = OneHotEncoder(handle_unknown='ignore')
        x = hstack([self.v_label.fit_transform(label), 0.5 * self.v_context.fit_transform(context),
                    0.5 * self.v_href.fit_transform(href), 0.5 * self.v_meta.fit_transform(meta)]).tocsr()
        self.clf = LogisticRegression(C=4.0, max_iter=3000, class_weight='balanced', random_state=SEED)
        self.clf.fit(x, [r['gold'] for r in rows], sample_weight=weights)
        return self

    def transform(self, rows):
        label, context, href, meta = views(rows)
        return hstack([self.v_label.transform(label), 0.5 * self.v_context.transform(context),
                       0.5 * self.v_href.transform(href), 0.5 * self.v_meta.transform(meta)]).tocsr()

    def predict_proba(self, rows):
        return self.clf.predict_proba(self.transform(rows))


def scores(gold, pred):
    return {'accuracy': round(float(np.mean([g == p for g, p in zip(gold, pred)])), 4),
            'macroF1': round(float(f1_score(gold, pred, labels=CLASSES, average='macro', zero_division=0)), 4)}


SYNTHETIC_WEIGHT = 0.3


def synthetic_rows(path):
    if not path:
        return []
    with open(path, encoding='utf-8') as f:
        return [{'label': r['label'], 'gold': r['gold'], 'contextLabels': [], 'hrefPath': None, 'context': 'primary',
                 'action': 'navigate', 'tag': 'a', 'role': None, 'sameHost': True, 'opensNewWindow': False} for r in map(json.loads, f)]


def cross_site(rows, keep, synthetic=()):
    """Leave-one-site-out predictions for rows; the model trains only on rows where keep(row).
    Synthetic rows join every training fold and never a test fold."""
    pred, conf = [None] * len(rows), [0.0] * len(rows)
    for held in sorted({r['siteId'] for r in rows}):
        train = [r for r in rows if r['siteId'] != held and keep(r)]
        extra = [r for r in synthetic if keep(r)]
        m = Model().fit(train + extra, [1.0] * len(train) + [SYNTHETIC_WEIGHT] * len(extra))
        idx = [i for i, r in enumerate(rows) if r['siteId'] == held]
        for i, p in zip(idx, m.predict_proba([rows[i] for i in idx])):
            k = int(np.argmax(p))
            pred[i], conf[i] = m.clf.classes_[k], float(p[k])
    return pred, conf


def accuracy(pairs):
    pairs = list(pairs)
    return {'n': len(pairs), 'correct': sum(g == p for g, p in pairs),
            'accuracy': round(sum(g == p for g, p in pairs) / len(pairs), 4) if pairs else None}


def main(dataset, out, synthetic_path=None):
    os.makedirs(out, exist_ok=True)
    if os.listdir(out):
        raise SystemExit('output directory must be empty')
    rows = load(dataset)
    gold = [r['gold'] for r in rows]
    rule = [r['ruleCategory'] or 'none' for r in rows]
    # `accepted` is permissive: an accepted control the rule leaves unshown is
    # not a rule error. Compare where each side makes an actual claim.
    synthetic = synthetic_rows(synthetic_path)
    gate_pred, gate_conf = cross_site(rows, lambda r: True, synthetic)
    cat_pred, cat_conf = cross_site(rows, lambda r: r['gold'] != 'none', synthetic)
    rule_claims = [i for i in range(len(rows)) if rule[i] != 'none']
    expected = [i for i, r in enumerate(rows) if r['expected']]
    rule_errors = [i for i in rule_claims if rule[i] != gold[i]]
    by_site = {s: {'ruleClaims': accuracy((gold[i], rule[i]) for i in rule_claims if rows[i]['siteId'] == s),
                   'modelOnRuleClaims': accuracy((gold[i], gate_pred[i]) for i in rule_claims if rows[i]['siteId'] == s),
                   'expectedCategoryModel': accuracy((gold[i], cat_pred[i]) for i in expected if rows[i]['siteId'] == s)}
               for s in sorted({r['siteId'] for r in rows})}
    errors = [{'pageId': rows[i]['pageId'], 'label': rows[i]['label'], 'section': rows[i]['sectionLabel'],
               'gold': gold[i], 'rule': rule[i], 'ruleSelected': rows[i]['ruleSelected'],
               'model7': str(gate_pred[i]), 'model7Confidence': round(gate_conf[i], 3),
               'categoryModel': str(cat_pred[i]), 'categoryConfidence': round(cat_conf[i], 3)} for i in rule_errors]
    report = {
        'classification': 'EXPOSED_DEVELOPMENT_ONLY',
        'protocol': 'leave-one-site-out over 5 normalized institutions; features: label/context/href-path char n-grams + control metadata',
        'caveat': 'Rule baseline was developed on these same 60 pages, so its numbers are optimistic. Model numbers are cross-site held out.',
        'labelSemantics': 'gold = human accepted category; none = annotated but not accepted; accepted is permissive, so rule "none" on an accepted control is not counted as a rule error',
        'datasetSha256': hashlib.sha256(open(dataset, 'rb').read()).hexdigest(),
        'synthetic': {'path': synthetic_path, 'rows': len(synthetic), 'weight': SYNTHETIC_WEIGHT,
                      'sha256': hashlib.sha256(open(synthetic_path, 'rb').read()).hexdigest() if synthetic_path else None},
        'n': len(rows), 'goldDistribution': dict(Counter(gold)),
        'ruleClaims': {'rule': accuracy((gold[i], rule[i]) for i in rule_claims),
                       'model7': accuracy((gold[i], gate_pred[i]) for i in rule_claims)},
        'expectedCategory': {'rule': accuracy((gold[i], rule[i]) for i in expected),
                             'categoryModel': accuracy((gold[i], cat_pred[i]) for i in expected)},
        'allLabeled7Class': {'model7': accuracy(zip(gold, gate_pred)), 'macroF1': round(float(f1_score(gold, gate_pred, labels=CLASSES, average='macro', zero_division=0)), 4)},
        'bySite': by_site,
        'ruleErrors': errors,
        'ruleErrorsModelRight': {'model7': sum(e['model7'] == e['gold'] for e in errors), 'categoryModel': sum(e['categoryModel'] == e['gold'] for e in errors)},
    }
    with open(os.path.join(out, 'report.json'), 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(json.dumps({'ruleClaims': report['ruleClaims'], 'expectedCategory': report['expectedCategory'], 'allLabeled7Class': report['allLabeled7Class'],
                      'expectedBySite': {s: v['expectedCategoryModel']['accuracy'] for s, v in by_site.items()}}, ensure_ascii=False))
    print('ruleErrorsModelRight', report['ruleErrorsModelRight'])


if __name__ == '__main__':
    main(*sys.argv[1:4])
