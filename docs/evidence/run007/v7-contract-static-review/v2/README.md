# Separate v7 development correction v2

Created `evaluation/development-v7-corrected-v2/` from current v1 using only this independent static audit. Classification: ADJUDICATED_DEVELOPMENT; freshHoldout=false; product=NOT_RUN.

Exactly three semantic annotation changes: city-login and nps-login action become navigate; the actual NPS search input is accepted as search/locate. The only fixture-byte addition is `data-eval-id="nps-search-input"` on the exact existing search input. Five fixture references point to the new local copies. Existing categories, expected groups, task groups, labels, notes and observation metadata are preserved.

`exact-diff.json` lists every structural and fixture change. `source-preservation.json` and the before/after manifests verify all 21 original and current-v1 inputs are unchanged. VERSION.json lists SHA-256, byte count, original base path/hash and current-v1 parent path/hash for all ten new data files. No first result, product, evaluator or script was opened or changed; no product metrics were computed.

The same five pages remain exposed development data. This version supplies no new independent evidence or runtime success result.
