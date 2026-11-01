# 사이트 조사 검토 기준 (2026-11-01)

엔진을 보지 않은 검토자(Claude 하위 에이전트)가 페이지별로 "쉬운 화면 첫 화면에 무엇이 있어야 하는지"를 고르는 기준입니다. 정답표가 아니라 설계 자료입니다. 사람 사용자 관찰을 대신하지 않습니다.

## 입력

- `docs/evidence/run010/site-survey-20261101b/elements/<pageId>.txt`만 봅니다.
  - 각 줄: `i | 태그 | 이름 | 주소 | 영역 | 가까운 제목 | 세로 위치 | 글씨 크기`
  - 주소는 같은 사이트면 경로만, 다른 사이트면 호스트부터 보입니다. 입력칸 값은 수집하지 않았습니다.
- `survey.json`과 엔진 결과는 **보지 않습니다** (독립성).

## 사용자

- 대표: 홈페이지에서 메뉴 찾기가 어려운 할머니(고령).
- 두 번째: 예전엔 잘 찾았지만 버튼이 작아서 찾기 힘들어진 어머니(중년).
- 이 사람이 **이 페이지에 와서** 가장 하려고 할 일을 기준으로 고릅니다. 사이트 전체가 아니라 이 페이지입니다.

## 고르는 것 (페이지마다 JSON 1개)

```json
{
  "pageId": "seoul-board",
  "pageType": "board",
  "purpose": "한 문장",
  "essential": [ { "i": 12, "label": "원문 이름", "kind": "search", "reason": "짧게" } ],
  "useful":    [ { "i": 40, "label": "...", "kind": "filter" } ],
  "common":    [ { "i": 3, "kind": "login" } ],
  "idealSlots": 6,
  "board": { "pinnedTop": 3, "latestPostIs": [51, 52, 53], "showPinned": false, "note": "..." },
  "notes": "엔진 설계에 도움이 될 관찰"
}
```

- **essential**: 첫 화면 카드에 꼭 있어야 할 것, 중요한 순서대로. 칸 수 제한 없음. 실제로 목록에 있는 요소(`i`)만.
- **useful**: 「다른 기능 보기」에 있으면 좋은 것 (최대 10개).
- **common**: 어느 페이지에나 있는 처음 화면(로고·홈)·로그인·회원가입·사이트맵·마이페이지 (essential에 넣었더라도 여기에도 적음).
- **idealSlots**: 이 페이지 첫 화면 카드가 몇 개면 가장 좋은지 (자주 쓰는 버튼 줄 제외). 근거는 essential 수와 고령 사용자가 한눈에 볼 수 있는 양.
- **board** (게시판 목록일 때만): 맨 위 고정 공지 수, 실제 최신 글의 `i`, 고정 공지를 카드에 넣을지와 이유.

## pageType

`gate`(사이트 고르기 관문), `home`, `board`(글 목록), `post`(글 보기), `faq`, `service`(업무·민원 안내와 신청 입구), `info`(설명 문서), `search`(검색 화면), `calendar`, `location`(오시는 길·조직·전화번호), `form`, `other`

## kind

`search` 검색창 · `service` 대표 업무(신청·조회·발급·예약) · `board-list` 게시판 목록 가기 · `post` 개별 글 · `filter` 게시판 분류·탭 · `faq` FAQ·질문 분류 · `contact` 상담·문의·전화 · `location` 오시는 길·조직·부서 · `guide` 이용 안내·절차 문서 · `download` 첨부·서식 · `related` 같은 메뉴의 관련 페이지 · `back-list` 목록으로 · `prev-next` 이전·다음 글 · `calendar` 일정 조작 · `site-choice` 관문에서 사이트 고르기 · `login` · `signup` · `home` · `mypage` · `other:<설명>`

## 넣지 않는 것

배너·슬라이드 넘김, SNS, 개인정보처리방침·저작권·웹접근성 같은 바닥글 정책 링크, 글자 크기·언어 변경, 본문 바로가기, 페이지 번호(필요하면 notes에).
