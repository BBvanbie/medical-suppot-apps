# オフライン差分比較 UI / 自動マージの保留判断

## 目的

- オフライン競合導線の次段として検討していた `差分比較 UI` と `自動マージ` について、現時点の採否を固定する。

## 変更内容

- 現時点では `差分比較 UI` を追加しない。
- 現時点では `自動マージ` を実装しない。
- 当面は既存の `手動解決` `server優先で破棄` `事案フォーム再保存` を正本運用とする。

## 判断理由

1. 現在の競合検知は [`offlineConflict.ts`](/C:/practice/medical-support-apps/lib/offline/offlineConflict.ts) のとおり、`baseServerUpdatedAt` と最新 `updatedAt` の比較だけで成立している。
2. 競合 item には、差分表示や安全な自動マージに必要な `server payload snapshot` が保持されていない。
3. この状態で差分比較 UI を足しても、表示できるのは「時刻が変わった」という事実に近く、利用者に十分な比較材料を渡せない。
4. 自動マージは、どのフィールドを優先し、どこを破棄するかの安全なルールを持てないため、EMS の業務データを壊すリスクがある。

## 運用方法

- オフライン競合は、引き続き次の 3 つで回復する。
  1. `手動解決`
  2. `server優先で破棄`
  3. `事案フォームへ戻って確認後に再保存`
- `差分比較 UI` と `自動マージ` は backlog に残すが、着手条件を満たすまで保留扱いとする。

## 再開条件

- 再検討は、次の条件がそろった時点で行う。
  1. 競合 item に `server payload snapshot` を安全に保持できる
  2. 差分比較対象フィールドを EMS 運用で限定できる
  3. 自動マージ対象を一部フィールドに限定した安全仕様を書ける

## 注意点

- 「未対応」と「今すぐ実装すべき」を混同しないこと。今回は技術的に未着手ではなく、現行モデルでは危険度が高いため保留にする判断である。
- 次に優先するのは `docs の最終整形`、`role 横断の細部 UI polishing`、`追加の回帰 E2E`。

## 2026-04-05 再確認

- [`offlineSync.ts`](/C:/practice/medical-support-apps/lib/offline/offlineSync.ts) を再確認し、競合検知は引き続き `baseServerUpdatedAt` と payload 内 `updatedAt` の比較のみであることを確認。
- conflict UI は `baseServerUpdatedAt`、推奨操作、`server優先で破棄` までで、`server payload snapshot` を使った比較 UI にはなっていないことを確認。
- したがって、差分比較 UI / 自動マージの保留条件は崩れておらず、2026-04-05 時点でも deferred 継続が妥当。
