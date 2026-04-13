# 訓練 / デモモード設定導線と利用者ガイド実装メモ

最終更新: 2026-04-13

## 実装対象

- `components/settings/TrainingModeGuidePanel.tsx`
- `app/settings/mode/page.tsx`
- `app/hp/settings/mode/page.tsx`
- `app/admin/settings/mode/page.tsx`
- `app/dispatch/settings/page.tsx`
- `app/dispatch/settings/mode/page.tsx`
- `lib/dispatchNavItems.ts`
- `docs/operations/training-demo-runbook.md`

## 実装内容

1. role 共通の `TrainingModeGuidePanel` を追加
   - EMS / HOSPITAL / ADMIN / DISPATCH ごとに文言を切り替える
   - `最初に確認すること`、`簡易フロー`、`注意点`、`FAQ`、`次の画面へのリンク` を表示
2. EMS / HOSPITAL / ADMIN の mode 設定画面に guide panel を追加
3. `DISPATCH` の settings overview と mode 設定画面を追加
   - sidebar に `設定` を追加
   - mode 切替と guide panel を指令 role でも利用可能にした
4. runbook に FAQ と設定画面から確認すべきポイントを追記

## 実装後の完了条件

- 4 role すべてで訓練 / デモモードの説明を設定画面から読める
- `DISPATCH` が UI から TRAINING / LIVE を切り替えられる
- 既存の training mode E2E が通る
