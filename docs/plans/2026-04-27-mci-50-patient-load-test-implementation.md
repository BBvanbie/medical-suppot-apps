# 大規模災害50名搬送E2E実装

日付: 2026-04-27

## 目的

大規模災害TRIAGEモードで、統括救急隊が多数傷病者を番号管理し、本部が確保した病院枠へ複数隊へ搬送割当を展開し、各隊が搬送決定するまでの通し整合を確認する。

今回の検証条件は次の通り。

- 出場隊: 本部機動第一、三鷹、下連雀、府中、小金井、田無、西東京、武蔵野、武蔵野デイタイム、府中大規模、調布
- 傷病者: 50名
- 色別内訳: 赤10、黄15、緑25、黒0
- 病院: 災害医療センター、東京医療センター
- 割当: 災害医療センター25名、東京医療センター25名

## 実装方針

- `e2e/tests/mci-triage-incident.spec.ts` に大規模用のfocused scenarioを追加する。
- テスト専用prefix `E2E-MCI50-*` で11隊、2病院、各role user、TRIAGE本部報告caseをseedする。
- アプリ本体のAPIを迂回せず、dispatch承認、病院受入回答、統括救急隊の患者登録、搬送割当、各EMSの搬送決定、病院側確認までを既存routeで実行する。
- 患者番号は既存仕様通り `P-001` から `P-050` まで自動採番されることを確認する。
- テスト終了時に `E2E-MCI50-*` のfixtureをcleanupし、通常E2E seedへ影響を残さない。

## 確認観点

- dispatchが同一災害の11隊を候補抽出し、本部機動第一を統括救急隊として指定できる。
- 本部が災害医療センター、東京医療センターへMCI受入依頼を送信できる。
- 病院が色別受入可能人数を返し、病院枠を超えない範囲で50名を割り当てられる。
- 統括救急隊が50名をSTART/PAT/current tag付きで登録できる。
- 11隊すべてに搬送割当が作成され、各隊userで搬送決定できる。
- 病院側に搬送決定済みの傷病者番号と怪我詳細が合計50名分届く。

## 実行結果

- `npm run typecheck` 通過。
- `npm run check` 通過。
- 初回focused E2Eでは、テスト用隊の `case_number_code` を4桁でseedしていたため、DB制約 `emergency_teams_case_number_code_check` により失敗した。
- `case_number_code` を既存制約に合わせて3桁の `950` から `960` へ修正した。
- `npx.cmd playwright test e2e/tests/mci-triage-incident.spec.ts --reporter=line` 通過。MCI E2Eは `2 passed`。
- `git diff --check -- e2e/tests/mci-triage-incident.spec.ts docs/plans/2026-04-27-mci-50-patient-load-test-implementation.md docs/current-work.md` 通過。
- 追加・変更ファイルの日本語破損パターン検索は該当なし。
