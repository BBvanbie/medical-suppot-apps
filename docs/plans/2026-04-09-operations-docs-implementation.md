# 2026-04-09 Operations / Explanation Docs Implementation

## 実装単位

1. 運用フロー文書を追加する
2. 方針書 / 説明資料を追加する
3. 導入 / 管理ガイドを追加する
4. PoC 説明資料を追加する
5. `docs/README.md` と `docs/current-work.md` から辿れるようにする

## 完了条件

- ユーザーが挙げた運用不足項目がすべていずれかの文書でカバーされている
- ユーザーが挙げた説明資料不足項目がすべていずれかの文書でカバーされている
- `docs/README.md` に新規文書群への入口がある
- `docs/current-work.md` に今回の docs 整備が反映されている

## 2026-04-09 追記

- 初版は入口整備が中心で、各文書の本文が薄かったため、運用担当がそのまま使える粒度まで追記した。
- `docs/operations/` は check list ではなく、対象画面、判断基準、記録項目、関連 runbook まで含める方針へ寄せた。
- `docs/proposals/poc-overview.md` は、単なる機能列挙ではなく、現場導線、管理導線、運用保全、次段階の残件を説明できる内容へ拡張した。
