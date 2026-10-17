import json,re,ssl,hashlib
from pathlib import Path
from urllib.request import urlopen,Request
from urllib.parse import urljoin
root=Path(__file__).resolve().parent
cache={};proof=[]
pattern=re.compile(r'@import\s+(?:url\(\s*[\"\']?([^\"\')]+)[\"\']?\s*\)|[\"\']([^\"\']+)[\"\'])([^;]*);',re.I)
def expand(text,base,stack=()):
 def replacement(m):
  u=urljoin(base,m.group(1) or m.group(2));media=(m.group(3) or '').strip()
  if u in stack:return ''
  if u not in cache:
   r=urlopen(Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=30,context=ssl._create_unverified_context());raw=r.read();cache[u]=raw.decode('utf-8','replace');h=hashlib.sha256(raw).hexdigest();fn='css-'+h[:20]+'.txt';(root/fn).write_bytes(raw);proof.append({'url':u,'finalUrl':r.url,'status':r.status,'sha256':h,'file':fn})
  body=expand(cache[u],u,stack+(u,))
  return ('@media '+media+'{\n'+body+'\n}') if media and media!='all' else body
 return pattern.sub(replacement,text)
for sid in ['cheonan','safekorea','nl','nps','smu']:
 data=json.loads((root/f'{sid}-styles.json').read_text());base=json.loads((root/f'{sid}-capture.json').read_text())['baseURI']
 result=[{**s,'text':expand(s['text'],s['href'] or base)} for s in data]
 (root/f'{sid}-styles-expanded.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
(root/'css-import-provenance.json').write_text(json.dumps({'reason':'Pre-product static QA found imported stylesheets were not expanded in static replay, making originally hidden menus appear. Expanded only original @import references; original DOM and labels remain unchanged.','productExecuted':False,'resources':proof},ensure_ascii=False,indent=2))
print('Expanded CSS imports:',len(proof))
