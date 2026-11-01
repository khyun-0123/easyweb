"""4B of docs/09_local_ai_review.md: LLM-generated training names (training folds only).

~/.venvs/easyweb-ml/bin/python -I scripts/ml/synthesize.py <model> <empty output dir>
Prompts use only category definitions. No development or holdout page content,
site names, URLs or annotations are sent to the model.
"""
import hashlib, json, os, sys, time, urllib.request

CATEGORIES = {
    'login': '내 계정과 개인 서비스에 들어가는 메뉴 (로그인, 회원 인증, 마이페이지 진입)',
    'search': '정보·자료를 찾는 검색 메뉴나 검색 버튼',
    'notice': '새 소식과 주요 안내 게시판 (공지사항, 보도자료, 행사 소식, 일정 알림)',
    'academic': '대학의 수업·학적·학교생활 메뉴 (학사일정, 수강신청, 성적, 등록금, 졸업)',
    'apply': '이용 신청과 내역 확인 메뉴 (민원 신청, 예약, 발급, 접수, 조회)',
    'help': '도움말과 이용 안내 (자주 묻는 질문, 이용 방법, 찾아오시는 길, 상담 안내, 전체 메뉴)',
    'none': '위 분류에 해당하지 않는 일반 제어 (기관 로고, 언어 전환, SNS 공유, 개인정보처리방침, 저작권, 배너 넘기기, 인쇄)',
}
INSTITUTIONS = ['대학교', '시청·구청', '중앙정부 서비스', '공공기관', '공공도서관']
PER_REQUEST = 15


def ask(model, prompt, seed):
    body = {'model': model, 'prompt': prompt, 'stream': False, 'format': 'json', 'think': False,
            'options': {'temperature': 0.8, 'seed': seed}}
    req = urllib.request.Request('http://127.0.0.1:11434/api/generate', json.dumps(body).encode(), {'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(req, timeout=300))


def main(model, out):
    os.makedirs(out, exist_ok=True)
    if os.listdir(out):
        raise SystemExit('output directory must be empty')
    rows, log, seed = [], [], 0
    for category, meaning in CATEGORIES.items():
        for institution in INSTITUTIONS:
            seed += 1
            prompt = (f'한국 {institution} 웹사이트에 실제로 있을 법한 메뉴·링크·버튼 이름을 {PER_REQUEST}개 만들어라. '
                      f'조건: {meaning}. 짧은 이름(2~12자) 위주로, 표현을 다양하게. 사이트 이름·URL·번호는 넣지 마라. '
                      'JSON {"names":["..."]}만 출력.')
            started = time.time()
            result = ask(model, prompt, seed)
            try:
                names = [n.strip() for n in json.loads(result['response']).get('names', []) if isinstance(n, str) and 1 < len(n.strip()) <= 30]
            except json.JSONDecodeError:
                names = []
            log.append({'category': category, 'institution': institution, 'seed': seed,
                        'promptSha256': hashlib.sha256(prompt.encode()).hexdigest(), 'returned': len(names),
                        'seconds': round(time.time() - started, 2)})
            rows += [{'label': n, 'gold': category} for n in names]
    seen, unique = set(), []
    for r in rows:
        if r['label'] not in seen:
            seen.add(r['label'])
            unique.append({**r, 'synthetic': True, 'generator': model})
    with open(os.path.join(out, 'synthetic.jsonl'), 'w', encoding='utf-8') as f:
        f.writelines(json.dumps(r, ensure_ascii=False) + '\n' for r in unique)
    digest = next((m['digest'] for m in json.load(urllib.request.urlopen('http://127.0.0.1:11434/api/tags'))['models'] if m['name'] == model), None)
    with open(os.path.join(out, 'summary.json'), 'w', encoding='utf-8') as f:
        json.dump({'generator': model, 'digest': digest, 'scope': 'Synthetic training-only names from category definitions; never used for validation.',
                   'generated': len(rows), 'unique': len(unique), 'requests': log}, f, ensure_ascii=False, indent=2)
    print(len(rows), 'generated', len(unique), 'unique')


if __name__ == '__main__':
    main(*sys.argv[1:3])
