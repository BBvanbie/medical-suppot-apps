# Hospital Notification Settings Persistence Design

**Date:** 2026-03-07

## Scope
- HOSPITAL 側通知設定を永続化する。
- 返信遅延通知とそのしきい値（10/15/20分）を含める。
- `hospital_settings` を拡張し、`GET/PATCH /api/settings/hospital/notifications` を実装する。
- `/hp/settings/notifications` を API 接続し、即時保存を導入する。

## Background
- HOSPITAL 側では `facility` と `operations` の一部永続化まで完了している。
- `notifications` は軽量設定であり、確認付き保存ではなく即時保存にするのが仕様に沿う。
- 返信遅延通知は運用上重要で、単なる ON/OFF ではなくしきい値も設定できる必要がある。

## Goals
- 病院側が通知条件を保存し、再読込後も保持されるようにする。
- 返信遅延通知の ON/OFF と しきい値 を一貫して扱えるようにする。
- API は `HOSPITAL` のみ許可し、病院スコープはログインユーザーから決定する。

## Non-Goals
- EMS 側通知設定の追加変更
- HOSPITAL `display` の永続化
- 実際の返信遅延通知ジョブや通知発火処理

## Data Model
### `hospital_settings` add columns
- `notify_new_request BOOLEAN NOT NULL DEFAULT TRUE`
- `notify_reply_arrival BOOLEAN NOT NULL DEFAULT TRUE`
- `notify_transport_decided BOOLEAN NOT NULL DEFAULT TRUE`
- `notify_transport_declined BOOLEAN NOT NULL DEFAULT TRUE`
- `notify_repeat BOOLEAN NOT NULL DEFAULT FALSE`
- `notify_reply_delay BOOLEAN NOT NULL DEFAULT TRUE`
- `reply_delay_minutes INTEGER NOT NULL DEFAULT 10`

Validation:
- `reply_delay_minutes IN (10, 15, 20)`

## API Design
### Notifications
- `GET /api/settings/hospital/notifications`
- `PATCH /api/settings/hospital/notifications`

Response / Payload:
- `notifyNewRequest`
- `notifyReplyArrival`
- `notifyTransportDecided`
- `notifyTransportDeclined`
- `notifyRepeat`
- `notifyReplyDelay`
- `replyDelayMinutes`

## Authorization
- `HOSPITAL` のみ許可
- `EMS` / `ADMIN` は `403`
- `hospital_id` はログインユーザーから決定

## Validation
- 通知フラグは boolean
- `replyDelayMinutes` は `10 | 15 | 20`
- `notifyReplyDelay = false` の場合でも `replyDelayMinutes` は保持してよい

## UI Behavior
- `/hp/settings/notifications` は server page を維持
- 編集部だけ client form に切り出す
- トグル/選択変更時に即時保存
- `saving / saved / error`
- 返信遅延通知が OFF でも、しきい値選択値は保持する

## React / Next.js Considerations
- 初期値は server page で取得
- client form に必要最小限の初期値だけ渡す
- route handler は薄く保ち、validation/update は `lib` に寄せる

## Testing and Validation
- HOSPITAL ユーザーで `GET` 時に保存済み値または初期値が返る
- `PATCH` 後に `GET` すると値が反映される
- 返信遅延通知としきい値が保持される
- `EMS` / `ADMIN` は `403`
- `npm.cmd run lint`
- `npm.cmd run build`

## Rollout Sequence
1. `hospital_settings` 通知列追加
2. repository / validation 拡張
3. 通知 API 実装
4. `/hp/settings/notifications` API 接続
5. lint/build と DB 保存確認
