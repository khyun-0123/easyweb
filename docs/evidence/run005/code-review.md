# RUN-005 bounded source review

Reviewed the uncommitted analyzer/classifier/ranker changes against `99fb6d82fd4b51f524790fa9e52485b187468400`. This is a bounded static review plus one offline synthetic reproduction, not product acceptance. Full verification belongs to root; no independent dataset or results were read.

## Concrete finding: R005-CR01 (medium, high confidence)

`src/analyzer.ts:295-306` permits generic detail controls to borrow a title across an `aside` boundary. The ancestor stop selector omits `aside` / `role="complementary"`; title-only branch validation does not check the control branch against that semantic boundary.

Offline headless Chromium reproduction:

```html
<main><div>
  <strong>시설 이용 기록 조회</strong>
  <aside><a id="side" href="https://structure.test/resource/92">상세보기</a></aside>
</div></main>
```

Observed: `side` becomes `apply`, `pageTask=control`, `relatedLabel=시설 이용 기록 조회`, `action=navigate`. The title lies outside the complementary region that contains the control. Without other evidence this generic link should remain unclassified. Stop ascent at the full content-boundary set and retain a plain-div positive regression. This is a recommendation quality defect; no automatic action execution was observed.

## Other bounded observations

Safe static text excludes editable subtrees in the inspected new paths. New classification branches retain original actions and existing URL/script guards. New supplemental evidence is included in the snapshot and recomputed by page-session. Capacity fill uses already deduplicated candidates, follows category diversity selection, and stays bounded to six. No further concrete bug was established in this short review.

The structural-context and ranker-capacity tests were inspected; the full suite was not duplicated. No native UI, visible browser, network, source edits, original history changes or actual user input were used. Semantic DOM coverage remains limited. Completion remains 5/10 and overall acceptance remains NOT_MET.

## Reviewed source SHA-256

- `src/analyzer.ts`: `aa577b2360e35527f5fbb35e04e61de75065da3b89e332e9f7ebbd2ff4645644`
- `src/classifier.ts`: `0be8b8cb49d8d22c91443584b3322987041962ad99b99b78052cfc1975ff4fac`
- `src/ranker.ts`: `e3459131d494e684cf28f2b73164cc0c16e0f422b89986e4e77c0791a854224d`

Findings apply to these hashes; subsequent fixes need separate verification evidence.
