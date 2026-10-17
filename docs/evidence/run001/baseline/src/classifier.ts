import type { Candidate, Category } from './types';

const rules: { category: Category; label: RegExp; url: RegExp }[] = [
  { category: 'login', label: /로그인|log\s*in|sign\s*in/i, url: /(?:login|signin)/i },
  { category: 'search', label: /검색|search/i, url: /(?:search)/i },
  { category: 'notice', label: /공지사항|공지|notice|announcement/i, url: /(?:notice|announcement)/i },
  { category: 'academic', label: /학사정보|학사안내|학사일정|학사|샘물|수강|학적|성적조회|등록금|academic|student\s*portal/i, url: /(?:academic|haksa|sugang)/i },
  { category: 'help', label: /이용안내|이용 안내|도움말|자주\s*묻는|문의|faq|help/i, url: /(?:faq|help)/i },
  { category: 'apply', label: /신청|접수|예약|조회|apply|reservation/i, url: /(?:apply|reservation)/i },
];

export function classify(candidates: Candidate[]): Candidate[] {
  return candidates.flatMap(candidate => {
    // 로그아웃·삭제·결제·최종 제출은 간편 기능으로 추천하지 않습니다.
    if (/로그아웃|log\s*out|sign\s*out|탈퇴|삭제|결제|최종\s*제출/i.test(candidate.label)) return [];
    let best: Candidate | undefined;
    for (const rule of rules) {
      const textMatch = rule.label.test(candidate.label);
      const urlMatch = !!candidate.href && rule.url.test(new URL(candidate.href).pathname);
      if (!textMatch && !urlMatch) continue;
      const score = (textMatch ? 60 : 0) + (urlMatch ? 15 : 0) + (candidate.context === 'primary' ? 15 : candidate.context === 'footer' ? -25 : 0) + (candidate.label.length <= 14 ? 10 : 0);
      const reasons = [textMatch ? `문구 일치: ${candidate.label}` : 'URL 경로 일치', candidate.context === 'primary' ? '주요 메뉴 영역' : candidate.context === 'footer' ? '하단 영역 감점' : '본문 영역'];
      if (!best || score > best.score) best = { ...candidate, category: rule.category, score, reasons };
    }
    return best && best.score >= 55 ? [best] : [];
  });
}
