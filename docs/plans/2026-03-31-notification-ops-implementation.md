# 通知運用項目 実装メモ

作成日: 2026-03-31

## 目的

`docs/current-work.md` の最優先タスクだった通知の運用項目を、既存通知基盤の延長で実装する。

## 実装内容

1. `notifications` テーブル拡張
   - `severity`
   - `dedupe_key`
   - `expires_at`
   - `acked_at`
   - `idx_notifications_dedupe_key`

2. 通知 repository 拡張
   - `NotificationPayload` / `NotificationItem` に新項目を追加
   - `createNotification()` に `dedupe_key` 判定を追加
   - `listNotificationsForUser()` で期限切れ通知を除外
   - `markNotificationsRead()` に `ack` オプションを追加

3. 運用通知生成
   - HOSPITAL: `request_repeat`, `reply_delay`
   - EMS: `unread_repeat`
   - 生成契機は `GET /api/notifications`

4. UI 更新
   - NotificationBell で severity badge を表示
   - warning / critical に `確認` ボタンを追加
   - `確認` 時は `PATCH /api/notifications` に `ack: true` を送る

5. 通知発火元の重複抑止
   - `request_received`
   - `transport_decided` / `transport_declined`
   - `hospital_status_changed` の非相談系

## 運用ルール

- `request_repeat` は 5 分 bucket ごとに 1 件
- `reply_delay` は `replyDelayMinutes` bucket ごとに 1 件
- `unread_repeat` は 5 分 bucket ごとに 1 件
- 同一 bucket の再生成は `dedupe_key` で抑止する
- `expires_at` で古い運用通知を自然消滅させる

## 非目標

- リアルタイム push
- バックグラウンド scheduler / cron
- 通知専用の一覧ページ新設
- 重要通知の多段階エスカレーション

## 確認コマンド

```powershell
npm run typecheck
npm run check
npx.cmd playwright test e2e/tests/hospital-flows.spec.ts --grep "operational notifications|consult comment emits EMS notification"
```

## 注意点

- `GET /api/notifications` は current phase では運用通知生成の副作用を持つ
- 将来 worker を導入する場合は、生成ロジックを scheduler 側へ移す
- `acked_at` は current phase では既読化と同時に付く
