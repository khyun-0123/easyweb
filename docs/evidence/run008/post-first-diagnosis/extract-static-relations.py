from html.parser import HTMLParser
from pathlib import Path
import json
import urllib.parse

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
class Node:
    def __init__(self, tag='', attrs=(), parent=None):
        self.tag, self.attrs, self.parent, self.children = tag, dict(attrs), parent, []
class Parser(HTMLParser):
    def __init__(self):
        super().__init__(); self.root = Node('root'); self.current = self.root
    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.current); self.current.children.append(node)
        if tag not in ['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']:
            self.current = node
    def handle_endtag(self, tag):
        node = self.current
        while node and node.tag != tag: node = node.parent
        if node and node.parent: self.current = node.parent
    def handle_data(self, text): self.current.children.append(text)
def descendants(node):
    yield node
    for child in node.children:
        if isinstance(child, Node): yield from descendants(child)
def fixed_text(node):
    if isinstance(node, str): return node
    if node.tag in ['input','textarea','select','script','style'] or node.attrs.get('contenteditable','false') != 'false' or any(role in node.attrs.get('role','').split() for role in ['textbox','searchbox','combobox','spinbutton','slider']): return ''
    return ' '.join(fixed_text(child) for child in node.children)
def text(node): return ' '.join(fixed_text(node).split())
def relation(node):
    result = {'tag':node.tag,'fixedText':text(node)[:160]}
    for key in ['class','role','title','aria-label','aria-labelledby','aria-controls','aria-expanded','aria-selected','type','target','download']:
        if key in node.attrs: result[key] = node.attrs[key]
    raw = node.attrs.get('href','')
    if raw:
        if raw.lower().startswith('javascript:'): result['hrefKind'] = 'explicit-javascript'
        elif raw.startswith('#'): result['hrefKind'] = 'local-fragment'
        else:
            parsed = urllib.parse.urlparse(raw)
            result['hrefKind'] = 'ordinary-http-or-relative'
            result['path'] = parsed.path
            result['queryKeysOnly'] = list(dict.fromkeys(urllib.parse.parse_qs(parsed.query, keep_blank_values=True)))
            result['hasFragment'] = bool(parsed.fragment)
    result['hasExplicitHandler'] = any(key.lower().startswith('on') for key in node.attrs)
    return result
rows = []
for sitefile in sorted((ROOT/'evaluation/blind-v10/sites').glob('*.json')):
    site = json.loads(sitefile.read_text())
    for page in site['pages']:
        parser = Parser(); parser.feed((ROOT/page['fixture']).read_text())
        nodes = list(descendants(parser.root)); by_id = {node.attrs.get('data-eval-id'):node for node in nodes if 'data-eval-id' in node.attrs}
        for expected in page['expected']:
            for source_id in expected['sourceIds']:
                node = by_id[source_id]; parent = node.parent; ancestors = []
                for depth in range(7):
                    if not parent: break
                    entry = {'tag':parent.tag,'class':parent.attrs.get('class'), 'idPresent':bool(parent.attrs.get('id'))}
                    headings = [q for q in descendants(parent) if q.tag in ['h1','h2','h3','h4','h5','h6','caption','th']]
                    entry['headingNames'] = [text(q)[:100] for q in headings[:8]]
                    if parent.tag in ['tr','li','dt','dd'] and len(text(parent)) <= 240: entry['fixedText'] = text(parent)
                    if parent.tag in ['ul','ol','dl','tr','li','td']:
                        controls = [q for q in descendants(parent) if q.tag in ['a','button']]
                        if len(controls) <= 8: entry['localControls'] = [relation(q) for q in controls]
                    ancestors.append(entry); parent = parent.parent
                accepted = next((x for x in page['accepted'] if x['sourceId']==source_id),{})
                rows.append({'siteId':site['siteId'],'pageId':page['id'],'expectedId':expected['id'],'expectedCategory':expected['category'],'expectedAction':expected['action'],'sourceId':source_id,'control':relation(node),'acceptedFixedName':accepted.get('evidence',{}).get('fixedName'),'acceptedRowText':accepted.get('evidence',{}).get('rowText'),'ancestors':ancestors})
(OUT/'expected-source-relations.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'sources':len(rows),'output':str((OUT/'expected-source-relations.json').relative_to(ROOT))}))
