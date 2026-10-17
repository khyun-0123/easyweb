import concurrent.futures,json,ssl
from pathlib import Path
from urllib.request import urlopen,Request
from html.parser import HTMLParser
root=Path(__file__).resolve().parent
pages=json.loads((root/'candidate-pages.json').read_text())
class Text(HTMLParser):
 def __init__(self):super().__init__();self.out=[];self.skip=0
 def handle_starttag(self,t,a):
  if t in ['script','style']:self.skip+=1
 def handle_endtag(self,t):
  if t in ['script','style']:self.skip=max(0,self.skip-1)
 def handle_data(self,d):
  if not self.skip and d.strip():self.out.append(d.strip())
def fetch(p):
 try:
  r=urlopen(Request(p['url'],headers={'User-Agent':'Mozilla/5.0'}),timeout=35,context=ssl._create_unverified_context());b=r.read();(root/f"{p['siteId']}-candidate-http.html").write_bytes(b)
  t=Text();t.feed(b.decode('utf-8','replace'));(root/f"{p['siteId']}-candidate-text.txt").write_text('\n'.join(t.out))
  print(p['siteId'],r.status,r.url,len(b))
 except Exception as e:print(p['siteId'],type(e).__name__,str(e))
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:list(ex.map(fetch,pages))
