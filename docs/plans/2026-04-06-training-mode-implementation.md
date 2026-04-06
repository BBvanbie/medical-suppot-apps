# 訓練 / デモモード実装メモ

最終更新: 2026-04-06

## 目的

- LIVE / TRAINING の運用分離を、段階導入で安全に入れる。
- 初回は user mode foundation を先に実装し、後続で case / notification / analytics に広げる。

## 実装ステップ

### Step 1. user mode foundation

- `users.current_mode` を追加
- `getAuthenticatedUser()` で `currentMode` を返す
- `/api/settings/user-mode` を追加
- EMS / HOSPITAL / ADMIN 設定ページに mode 切替 UI を追加
- shell / settings 上で現在 mode を表示

### Step 2. case mode foundation

- `cases.mode` を追加
- training 作成時に `mode=TRAINING`
- 一覧 / 詳細 / send-history / consult / request で mode filter を適用

### Step 3. notification / analytics separation

- `notifications.mode` を追加
- training 通知を LIVE に混入させない
- dashboard / stats / KPI 集計から TRAINING を除外

### Step 4. training reset

- `ADMIN` 専用の training 一括リセット導線
- 対象範囲確認 dialog

## 初回実装の完了条件

- 設定画面で LIVE / TRAINING を切替できる
- auth context から current mode を参照できる
- EMS / HOSPITAL / ADMIN で現在 mode が見える
- `npm run check` が通る

## 実施記録

### 2026-04-06 開始

- Step 1 を開始
- 実装対象:
  - user mode schema / repository
  - settings API
  - settings page UI
  - minimal badge / banner vocabulary

### 2026-04-06 更新

- Step 1 完了
  - `users.current_mode`
  - settings mode 切替
  - EMS / HOSPITAL / ADMIN settings shell banner
- Step 2 完了
  - `cases` / `hospital_requests` / `hospital_patients` / `notifications` へ `mode` を追加
  - case / request / dispatch / consult / send-history へ mode filter / propagation を追加
- Step 3 完了
  - EMS / HOSPITAL / ADMIN home / stats で TRAINING 時の analytics 除外表示を追加
  - EMS / DISPATCH create UI に current mode 表示を追加
- Step 4 完了
  - Admin 専用の training 一括リセット API / UI を追加
  - `e2e/tests/training-mode.spec.ts` を追加し focused E2E を通過
- 残件
  - role page / notification edge case の追加点検
  - localhost が安定した状態での追加 regression
