import json,os,sys,collections
surv,rev,elems=sys.argv[1:4]
S={p['pageId']:p for p in json.load(open(surv))['pages'] if not p.get('error')}
agg=collections.defaultdict(lambda:collections.Counter())
ex=collections.defaultdict(list)
tot=collections.Counter()
for f in sorted(os.listdir(rev)):
  r=json.load(open(os.path.join(rev,f)));p=S.get(r['pageId'])
  if not p: continue
  t='home' if p['engine']['homePage'] else r['pageType']
  if t not in('home','post'): continue
  e=p['engine'];cards={c['i'] for c in e['cards']};com={c['i'] for c in e['common']}
  raw=set(e['rawIndex']);pool=set(e['poolIndex']);more={c['i'] for c in (e.get('more') or [])}
  lines={}
  for l in open(os.path.join(elems,r['pageId']+'.txt')):
    c=l.split(' | ')
    if c[0].isdigit(): lines[int(c[0])]=c
  tot[t,'pages']+=1
  for it in r['essential']:
    i=it['i'];tot[t,'ess']+=1
    if i in cards or i in com: st='covered'
    elif i in more: st='in-more'
    elif i in pool: st='classified-not-shown'
    elif i in raw: st='candidate-unclassified'
    else: st='not-candidate'
    agg[t][(it.get('kind'),st)]+=1; tot[t,st]+=1
    if st!='covered' and len(ex[t,it.get('kind'),st])<4: ex[t,it.get('kind'),st].append(f"{r['pageId']}:{it['label'][:25]}|{lines.get(i,['','?'])[1]}")
for t in('home','post'):
  print('==',t,{k[1]:v for k,v in tot.items() if k[0]==t})
  for (k,st),n in sorted(agg[t].items(),key=lambda x:-x[1]): print(f'  {k:12} {st:24} {n}', ex.get((t,k,st),[])[:3] if st!='covered' else '')
