import json,os,sys,collections
old,new,rev=sys.argv[1:4]
L=lambda f:{p['pageId']:p for p in json.load(open(f))['pages'] if not p.get('error')}
O,N=L(old),L(new)
t=collections.Counter();bt=collections.defaultdict(collections.Counter)
for f in sorted(os.listdir(rev)):
  r=json.load(open(os.path.join(rev,f)));pid=r['pageId']
  if pid not in O or pid not in N: print('skip',pid);continue
  E={x['i'] for x in r['essential']};U=E|{x['i'] for x in r.get('useful',[])}
  res=[]
  for S in (O,N):
    e=S[pid]['engine'];sh={c['i'] for c in e['cards']+e['common']};cards=[c['i'] for c in e['cards']]
    res.append((len(E&sh),sum(i in U for i in cards),len(cards),e['pageType'],[ (c.get('title') or '')[:12] for c in e['cards']]))
  for k,(cov,u,n,ty,_) in zip('on',res): t[k+'cov']+=cov;t[k+'u']+=u;t[k+'n']+=n;bt[r['pageType']][k]+=cov
  t['E']+=len(E);bt[r['pageType']]['E']+=len(E)
  if res[0][:4]!=res[1][:4] or res[0][4]!=res[1][4]: print(f'{pid}: {res[0][3]} {res[0][0]}/{len(E)} -> {res[1][3]} {res[1][0]}/{len(E)}  {res[0][4]} -> {res[1][4]}')
p=lambda a,b:round(100*a/b,1)
print('coverage',p(t['ocov'],t['E']),'->',p(t['ncov'],t['E']),' useful',p(t['ou'],t['on']),'->',p(t['nu'],t['nn']))
for k,v in bt.items():
  if v['o']!=v['n']: print(' ',k,p(v['o'],v['E']),'->',p(v['n'],v['E']))
