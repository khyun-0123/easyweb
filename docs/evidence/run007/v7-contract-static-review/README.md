# v7 static contract audit

Completed static review of the permitted exposed v7 inputs. No product source, dist, evaluation output, future data, network, browser or native UI was used. Input SHA-256 and byte counts match before and after for all 21 files.

The audit covers 33 unique retained controls on five pages: 32 already labeled and one unlabeled actual NPS search text input. The ten annotation copies contain 64 accepted entries and zero rejected entries; each accepted entry, all expected entries and all task actions were checked against source purpose and markers. Counts are audit coverage/change counts, not product metrics.

Four finding groups are recorded:

- V7-C01: Original city reservation-guidance rolebutton requires locate; development copy already corrected it.
- V7-C02: Five original SMU cross-document fragment links require navigate, with their dependent expected/task fields; development copy already corrected them.
- V7-C03: Both versions still mark city-login and nps-login locate. These plain HTTPS login-form links require navigate under the supplied contract. Their category remains login.
- V7-C04: Both versions omit the retained NPS search text input from accepted/rejected annotation. Propose a fixed-metadata search/locate annotation, with an annotation-only source ID in a future copy. No editable values or expected membership changes are involved.

`audit.json` contains every retained control's explicit accepted audit disposition, category/action reason, all annotation assessments and limitations. `corrections-proposed.json` gives exact non-applied JSON-pointer proposals, plus the HTML identity prerequisite by exact source-node path. Original files remain unchanged; no corrected dataset or evaluator change was created. Historical first results are not recalculated or replaced.

The fixtures omit original CSS and scripts. No claim is made about original pixel visibility, hidden event listeners, destination contents, downloads, authentication, submission, installation or human task success. The same five pages are exposed development evidence, not fresh independent pages.
