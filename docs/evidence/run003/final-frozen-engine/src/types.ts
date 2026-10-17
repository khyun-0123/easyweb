export type Category = 'login' | 'search' | 'notice' | 'academic' | 'apply' | 'help';
export type ActionType = 'navigate' | 'locate';
export type PagePurpose = 'academic-calendar' | 'help';

export interface SourceSnapshot {
  pageUrl: string;
  baseUrl: string;
  attributes: string;
}

export interface Candidate {
  element: HTMLElement;
  label: string;
  href?: string;
  context: 'primary' | 'body' | 'footer';
  category?: Category;
  score: number;
  reasons: string[];
  action: ActionType;
  snapshot?: SourceSnapshot;
  sectionLabel?: string;
  target?: string;
  destinationHost?: string;
  opensNewWindow?: boolean;
  contextLabels?: string[];
  pagePurpose?: PagePurpose;
  pageTask?: 'control' | 'collection' | 'reading';
  collectionDependent?: boolean;
}

export const CATEGORY_INFO: Record<Category, { title: string; description: string; icon: string }> = {
  login: { title: '로그인', description: '내 계정과 개인 서비스', icon: 'user' },
  search: { title: '검색', description: '원하는 정보 찾기', icon: 'search' },
  notice: { title: '공지사항', description: '새 소식과 주요 안내', icon: 'bell' },
  academic: { title: '학사정보', description: '수업·학적·학교생활', icon: 'book' },
  apply: { title: '신청·조회', description: '이용 신청과 내역 확인', icon: 'file' },
  help: { title: '이용 안내', description: '도움말과 자주 묻는 질문', icon: 'help' },
};
