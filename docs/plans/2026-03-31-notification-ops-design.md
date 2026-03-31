# 通知運用項目 設計メモ

作成日: 2026-03-31

## 結論

通知基盤は既存の `notifications` テーブルを拡張し、通知メタデータと運用通知生成を同じ経路で扱う。
今回の Phase では以下を実装対象にする。

- 通知本体に `severity` `dedupe_key` `expires_at` `acked_at` を追加する
- `dedupe_key` による重複抑止を通知生成側で行う
- HOSPITAL 向けに未応答 target から再通知と返信遅延エスカレーションを生成する
- EMS 向けに未確認通知の再通知を生成する
- NotificationBell で重要通知の確認済み操作を行えるようにする

## 前提と制約

- 既存通知は `GET /api/notifications` のポーリング取得を前提にしている
- push 配信や worker はまだ導入しない
- 既存の `notifyRepeat` `notifyReplyDelay` 設定を実動作へ結び付ける
- 大規模な通知設定 UI 追加や通知センター画面の新設は今回の対象外とする

## 方式比較

### 案1. 通知取得時に運用通知を都度生成する

- 長所
  - 既存のポーリング経路だけで完結する
  - scheduler や cron を追加しなくてよい
  - 今の App Router + PostgreSQL 構成に最も小さく乗る
- 短所
  - `GET /api/notifications` が副作用を持つ
  - ポーリングされない間は運用通知が生成されない

### 案2. 別 API や定期ジョブで通知を事前生成する

- 長所
  - 取得 API を read only に保ちやすい
  - 将来の監視や集計に発展させやすい
- 短所
  - 実行契機が増える
  - このリポジトリではジョブ基盤がまだない
  - 今回のスコープを超える

## 推奨設計

案1を採用する。

### 1. 通知メタデータ

`notifications` に以下を持たせる。

- `severity`: `info | warning | critical`
- `dedupe_key`: 同一運用通知の重複抑止キー
- `expires_at`: 運用通知の表示期限
- `acked_at`: warning / critical の確認済み時刻

### 2. 重複抑止

- 同じ scope と同じ `dedupe_key` の通知が有効期間内に存在する間は再作成しない
- 将来の再通知は `dedupe_key` 側で bucket を変える
- 一般通知の `request_received` や `transport_decided` には固定 `dedupe_key` を付ける

### 3. 運用通知ルール

#### HOSPITAL

- `request_repeat`
  - 対象: `UNREAD` / `READ`
  - 条件: `notifyRepeat = true` かつ送信から 5 分以上
  - severity: `warning`
  - 5 分 bucket ごとに 1 件まで
- `reply_delay`
  - 対象: `UNREAD` / `READ`
  - 条件: `notifyReplyDelay = true` かつ `replyDelayMinutes` 以上未応答
  - severity: `critical`
  - `replyDelayMinutes` bucket ごとに 1 件まで

#### EMS

- `unread_repeat`
  - 対象: 未読の `consult_status_changed` / `hospital_status_changed`
  - 条件: `notifyRepeat = true` かつ通知作成から 5 分以上未確認
  - severity: `warning`
  - 5 分 bucket ごとに 1 件まで

### 4. 確認済み

- `warning` / `critical` は NotificationBell 上で `確認` を押すと `acked_at` を記録する
- この操作は current phase では `is_read = true` も同時に付与する
- `ack` 後も履歴表示は残すが、同じ bucket の再作成はしない

## 影響ファイル

- `lib/notifications.ts`
- `app/api/notifications/route.ts`
- `components/shared/NotificationBell.tsx`
- `lib/hospitalRequestSchema.ts`
- `e2e/global-setup.ts`
- `scripts/setup_hospital_requests.sql`
- 通知発火元の route / repository

## 検証方針

- `npm run check`
- `npx.cmd playwright test e2e/tests/hospital-flows.spec.ts --grep "operational notifications|consult comment emits EMS notification"`
- 通知 API を 2 回連続で叩いて重複が増えないことを E2E で確認する
