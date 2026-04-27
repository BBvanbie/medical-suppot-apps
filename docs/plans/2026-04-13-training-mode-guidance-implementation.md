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

## 追加実施記録

### 2026-04-22

- `app/admin/page.tsx`
  - `TRAINING ANALYTICS` 表示時に `TRAINING CONTROL` を追加した
  - `mode 切替 / reset`、`monitoring`、`TRAINING 事案一覧`、`support` を訓練時の確認順で近接表示した
  - `cases / requests / notifications` の training summary を追加し、訓練中の first look を補強した
- `app/hospitals/page.tsx`
  - 訓練中 hero に `TRAINING CHECK` を追加した
  - `mode 切替`、`受入要請一覧`、`相談一覧`、`support` を近接表示し、training 中の迷いを減らした
- focused E2E
  - `e2e/tests/admin-hospital-guidance.spec.ts` に admin / hospital home guidance の確認を追加した
  - `e2e/tests/training-mode.spec.ts` と合わせて `npx playwright test e2e/tests/admin-hospital-guidance.spec.ts e2e/tests/training-mode.spec.ts --reporter=line` を通過させた

## 補足

- 設定画面の guide panel に加え、role home でも `訓練中に次にどこへ行くか` が分かる構成へ寄せた
