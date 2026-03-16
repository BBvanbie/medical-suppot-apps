---
name: test-check
description: 変更内容に応じて lint、typecheck、build、E2E のどこまで回すべきかを判断し、回帰リスクと未検証項目を整理するための skill。実装後の確認、品質ゲート、検証不足の明示が必要なときに使う。
---

# test-check

## purpose

- 変更後の検証をタスクに応じて十分かつ過不足なく実施する。

## use this skill when

- 実装後に確認コマンドや回帰観点を整理するとき
- CI 失敗の切り分けや追加テストの必要性を判断するとき
- E2E を書く前に検証範囲を整理したいとき

## do not use this skill when

- まだ設計前で、何を変えるか固まっていないとき
- 変更を伴わない単純な質疑応答だけのとき

## workflow

1. 変更ファイルと変更種別を確認する。
2. `lint`、`typecheck`、`build`、`test:e2e` の必要範囲を決める。
3. 実行結果と未実施項目を分けて記録する。
4. 回帰リスクが高い箇所を短くまとめる。

## output format

- 実施した確認
- 結果
- 未実施の確認
- 残るリスク

## quality bar

- 実施/未実施が明確であること
- 変更内容に対して検証の深さが釣り合っていること
- 結果を誇張しないこと

## minimum checks by change type

- UI 変更: 表示崩れ、tablet/desktop 幅、loading/empty/error/disabled 状態、文言や状態表示
- API 変更: 正常系、異常系、権限失敗、validation 失敗、既存 caller との整合
- routing/画面遷移変更: 遷移元/遷移先、ブラウザ戻る、直リンク、権限なし時の扱い
- DB/状態遷移変更: 既存データ影響、旧状態からの遷移、一覧/詳細/履歴への反映

## command selection guide

- `npm run check`: 小〜中規模修正の基本確認
- `npm run check:full`: 複数層にまたがる変更、状態遷移や DB 影響を含む変更
- `npm run test:e2e`: 主要 workflow、画面遷移、操作連鎖に影響する変更

## minimum reporting

- 何を確認したか
- 何を未確認としたか
- どこにリスクが残るか
- 必要なら追加確認候補

## project-specific notes

- UI/設定/API の変更は最低でも `npm run check` を基準にする。
- 主要な user workflow に触れたら Playwright E2E の要否を必ず検討する。
