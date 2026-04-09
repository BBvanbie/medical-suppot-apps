# 2026-04-09 Auth / Device Guide Design

## 目的

- `ID` と `username` の違い、端末登録から運用開始までの流れ、端末紛失時の新端末引継ぎを、非開発者でも読める資料として固定する。
- 同じ内容を `docs/operations/` の文書と `ADMIN` 画面内の資料ページから参照できるようにする。

## 対象読者

- `ADMIN`
- 導入担当
- 現場責任者
- `EMS` / `HOSPITAL` 利用者

## 追加するもの

1. `docs/operations/` の原本文書
   - `ID` と `username` の違い
   - 端末登録から運用開始までの全体フロー
   - 端末紛失から新端末引継ぎまでの全体フロー
2. `ADMIN` 画面内の資料ページ
   - フローチャート風の流れ表示
   - 手順文書
   - docs 原本への導線

## 設計方針

- 初見でも分かる語彙を使い、内部実装用語は必要最小限にする。
- `ID / password / username / 端末名 / deviceKey / PIN / 登録コード` を混ぜずに整理する。
- `ADMIN がやること` と `利用者がやること` を分ける。
- `EMS iPad` と `HOSPITAL PC` の両方を例に出す。
- 文書の正本は `docs/operations/` とし、画面側は現場で読める要約版 + docs 参照導線にする。
