# EasyWeb 작업 안내

## 재개할 때

- `docs/WORK_SPEC.md`, `docs/PROGRESS.md`, 필요한 부분의 `docs/EXECUTION_BUDGET.md`를 읽는다. 사용자 지정 단계·예산·범위를 우선하고 끝난 단계를 반복하지 않는다.
- 사용자가 컴퓨터로 다른 작업을 해야 하므로 컴퓨터 유즈와 native UI 자동화를 중단했다. 브라우저/앱의 창·초점을 임의로 바꾸지 않는다. 터미널·헤드리스 검증을 우선하고 필요한 수동 검증은 사용자 안내로 남긴다.
- 현재는 `docs/RUN_005_REPORT.md`와 `docs/PROGRESS.md`의 v0.6.0 동결 후보 인계 지점이다. 최종 로컬222/222·core72/74정확/45/45재현/15/15추천·자동접근성21조건·합성성능3종은 PASS이나 v8 독립 최초10/17정확·4/15재현·과제1/5, 모든5사이트 FAIL이다. 명시 다운로드 식별 누락2건으로 S05를 IN_PROGRESS/NEEDS_FIX로 재개해 현재 완료4/10·전체 인수NOT_MET이다. 과거5/10은 발견 전 이력으로 보존한다. 공개과제최종15/15(HTTP9/원본안내6·retry/오류0)·ZIP315,166bytes/SHA6ddd10dd…·두 빌드/ZIP동일·sourceStable도 확인했다. 개발9suite도 같은 동결·sourceStable로 확인했다. `docs/evidence/run005/final-review.json`의 산출물 검토도 PASS(해시305비교/불일치0·검사시점406링크/깨짐0·ZIP5entry일치)이며 필수 품질/사용자 인수의 대체가 아니다. 확인하지 않은 값을 임의 수치로 채우지 않는다.
- v0.5 최종 소스는 `docs/evidence/run004/v0.5-engine-freeze.json`의 14파일과 별도 아카이브로 02:53:53 KST에 고정했다. root/구현자는 동결 전 v7 본문을 읽지 않았고 첫 평가 뒤 소스 변경·재실행은 없다. 같은 해시의 검증인지 확인한다. RUN-003 동결·v5/v6 첫 실패·ZIP도 보존한다.
- v7-v2 첫 결과는 정확 6/12(50%)·재현 4/15(26.7%)·과제 추천 1/5, 모든 5사이트 FAIL이다. 추가 메뉴 표시도 6/12·4/15·1/5이며 unresolvedMappings 1·repeatedCards 0이다. `docs/evidence/run004/blind-v7-v2-first/`를 보존하고 첫 화면을 추가 메뉴 합집합으로 대체하지 않는다.
- 첫 결과 후 독립 감사에서 accepted action 충돌 6건(city 1·SMU 다른 문서 fragment 5), expected 3건·SMU 과제 영향을 확정했다. RUN-004 당시에는 후보 승인만 했고, RUN-005의 `evaluation/development-v7-corrected/VERSION.json`은 accepted6·expected3·SMU task2의 11필드만 별도 정정했다. `docs/evidence/run005/v7-adjudication/validation.json`의 프로토콜10/10·fixture5개 동일·원본freeze11입력 해시 보존은 정적 검증이며 제품 실행·점수 재계산이 아니다. 로그인2건·미주석 검색 입력은 미해결 유지. 원본 첫 raw 점수를 순수 제품 품질로 단정하지 않는다.
- 알려진 자료는 v8 최초 평가 뒤 기존45+새5=총50페이지다. 원본 v7/v2/정정본은 같은5페이지이므로 중복 세지 않는다. 최종v0.6 소스는 `docs/evidence/run005/v0.6-engine-freeze-v2.json`의14파일·아카이브로03:25:20KST(UTC18:25:20.245610)에 동결했다. root·구현자는 그 전에 v8 본문·URL·정답 미열람이었다. 첫 결과 `docs/evidence/run005/blind-v8-first/`는 같은 동결의 UTC18:25:41.668686→18:25:42.472586·exit1이며 그대로 보존한다. v8을 본 후의 재평가는 개발용이다.
- v8 추가 메뉴는11/19정확·5/15재현·과제1/5, unresolvedMappings0·repeatedCards0이다. 첫 화면10/17·4/15·1/5를 추가 표시 합집합으로 대체하지 않는다. static QA320/320(전체89제어, accepted50/rejected39)은 작성자 보고이며 제품품질·사람성공의 증거가 아니다. v8 `/cmm/fms/FileDown.do` + `i.ir-download`의 명시 다운로드2건을 navigate로 처리한 식별누락은 S05 미해결 반례이며 근거·한계·현재4/10 판정은 `docs/evidence/run005/file-download-root-review.json`이다. MIME/body·실제 파일실행·피해는 미관찰이고 기존core/live15는 이2건 수행 결과가 아니다. 다음 첫 작업은 별도v0.7에서 경로+다운로드아이콘 결합근거를 보수적locate로 식별하고 일반양성·유사일반링크음성·stale회귀로 검증하는 것이다. 그 뒤 범용 규칙·명세 허용 기관adapter를 분리 평가한다. v0.6 동결·첫결과·ZIP과 과거5/10이력은 보존한다.
- v6 category v1은 `evaluation/development-v6-corrected/`, fixture 충실도 v2는 `evaluation/development-v6-corrected-v2/`의 별도 `ADJUDICATED_DEVELOPMENT`다. v1은 category 5필드, v2는 이를 유지한 city 3행의 빈 td 9개·fixture 경로 1곳만 정정했다. 원본 11파일·v1 전체 11파일과 첫 실패를 보존하고 원본/v1/v2 해시를 확인해 개발용으로만 평가한다.
- RUN-004 개발용 v6-v2는 첫 화면24/24·14/15·과제5/5이나 city2/3으로 사이트75% 기준 미달이었다. 추가 표시41/41·15/15·5/5로 첫 화면 인수를 대체하지 않는다. v0.5 공개 과제15/15·HTTP9/원본안내6도 과거 해시의 관찰이며 v0.6 결과·사람의 업무 성공·실제 설치로 이전하지 않는다.
- 구 v7의 조상 평탄화·heading/form 변환 때문에 root가 S07 증거 범위상 v2 복원을 선택했다. 감사자는 좁은 fixed-control 평가 허용 가능으로 보았으므로 이를 감사자의 필수 승인 요구로 쓰지 않는다. `docs/evidence/run004/v7-fidelity-decision.json`과 관찰자 교체 사건 `v7-observer-boundary-incident.json`을 보존한다.
- RUN-005는 카드 고정 제목·외부 관련 제목 `relatedLabel`·탭 읽기 문맥, 구체 목적 우선 규칙을 보강하고 원본 근거 과제·분류 다양성 우선 선택 뒤 분류된 서로 다른 후보로 빈 자리를 최대6개까지 채운다. threshold·최대6개·권한·action 정책은 유지한다. 초기204PASS 뒤 semantic 경계 제목차용을, 이후208PASS·v1동결 뒤 기존개발/live 분류회귀14/15를 찾아 v8미열람·첫실행0상태에서 수정했다. `docs/evidence/run005/before-code-review-fix/`, `before-development-regression-fix/`, `pre-first-engine-revision.json`과 첫ZIP·v1동결을 보존하고 최종222검사와 혼용하지 않는다.
- RUN-005의 관찰 경계는 `docs/evidence/run005/goal-usage-snapshot.json`의03:10:33→03:31:44KST(UTC18:10:33→18:31:44), 1,271초(21분11초)다. 이전 준비·분담과 이후 최종문서·산출물검토·commit 제외이며 전체RUN005경과가 아니다. 누적counter6,672,859tokensUsed/8,825초와 이전RUN004대비1,168,622/1,559초 차분은 이번고유·생성·청구량이 아니며 중복합산하지 않는다. 전체실제경과·계정토큰세부·비용은UNKNOWN이다.
- RUN-004의 기술 검증·정적 감사 관찰 경계는 `docs/evidence/run004/goal-usage-snapshot.json`의 02:39:51→03:05:48 KST, 1,557초다. 전체 실제 시작/경과가 아니며 이후 문서 마감·commit은 제외한다. 목표 도구 누적값·이전 대비 차분을 이번 고유 사용량이나 청구량으로 쓰지 않고 전체 실제 경과·계정 토큰·비용은 UNKNOWN으로 둔다.
- 초기 `docs/DEVELOPMENT_PLAN.md`는 v0.1 이력이며 v1.0 단계 번호의 기준으로 혼용하지 않는다.

## 제품 기준

- 사용자는 최대 6개와 “다른 메뉴 보기” 흐름을 재확인했다. 현재 구현 정책과 일치하며 이 확인만으로 소스/UI를 바꾸거나 첫 화면 품질을 추가 메뉴 합집합으로 대체하지 않는다.
- 사용자가 요청한 시점에 현재 페이지의 실제 기능을 찾아 쉬운 화면으로 안내한다.
- 원본 인증·결제·삭제·최종 제출을 자동 수행하지 않는다. 불확실한 동작은 원본 위치 안내로 처리한다.
- 실제 사용자 입력 내용을 읽거나 후보·UI·로그에 넣지 않는다. 사용자 정의 편집 제어도 포함한다.
- 사용자는 “일반 링크는 바로 이동 유지”를 선택했다. 일반 HTTP(S) 링크는 직접 이동하고 명시적 JS·팝업·다운로드·인증 제어는 원본 위치로 안내한다. 속성/위임 이벤트의 완전한 식별이나 모든 원본 JS 보존을 보증하지 않는다. 낡은 후보의 실행을 막는다.
- 접근 권한을 불필요하게 확대하지 않는다. 권한 확대가 필요하면 원인과 대안을 먼저 구체화한다.

## 구현과 검증

- TypeScript + Manifest V3, 빌드는 `npm run build`, 타입 검사는 `npm run typecheck`.
- 로컬 통합 검증은 `npm run verify`다. 타입·빌드·Playwright·개발용 core 평가·합성 성능을 실행한다. 독립 평가·실사이트 과제·실제 설치·사용자 실증의 대체가 아니다. 외부 관찰은 필요한 범위에서만 실행한다.
- 결함 수정 시 실패를 재현하고 관련 검증을 실행한다. 이미 통과한 검사를 이유 없이 반복하지 않는다.
- 로컬 예시, API 모형, localhost 권한을 추가한 통합 검사, CDP isolated-world 실사이트 검사, 원래 Manifest의 실제 도구 모음 클릭, 사용자 실증을 구별한다.
- 최초 holdout과 blind-v2~v7의 실패·해시·동결 엔진을 보존한다. 새 독립 자료도 동결 후 첫 결과를 그대로 보존한다. 열어 보고 수정에 사용한 자료는 이후 개발용이며 재실행을 새로운 독립 평가로 부르지 않는다. 정답 오류는 근거와 별도 버전으로 고치고 최초 판정은 덮어쓰지 않는다.
- 동일 파일을 여러 작업자가 동시에 수정하지 않는다. 독립 검토·조사는 필요하면 병렬로 진행한다.

## 기록과 인계

- 작업 묶음 종료 시 진행표에 변경·검증·남은 결함·다음 첫 작업을 기록한다.
- 필수 인수 조건을 통과해야 DONE이다. 수행 시간·예산 소진·보고서 작성만으로 완료하지 않는다.
- 완료 단계 수는 공수 비율이 아니다. 실제 사용자 실증을 가상 결과로 채우지 않는다.
- 계측이 없는 경과 시간·실제 토큰 사용량은 UNKNOWN. 예측값을 실제 소비량처럼 쓰지 않는다.
- 사용자는 먼저 직접 시험할 수 있다고 했다. 1인 사전 테스트는 `docs/PRETEST.md`로 안내하며 정식 6~8명 실증이나 사용성 개선 달성으로 합산하지 않는다. VoiceOver의 실제 발화·상태 안내도 관찰 없이 통과로 채우지 않는다.
- 사용자 참여가 필요한 검증을 남기더라도 독립적인 기술 작업은 진행할 수 있다.
- 공개 게시·외부 배포·연락·유료 API 사용은 해당 행동에 대한 사용자 지시 범위에 따른다.
