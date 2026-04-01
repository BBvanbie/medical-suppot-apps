# 通知マトリクス

最終更新: 2026-04-01

## 主通知

| kind | audience | 発火契機 | menuKey / tabKey | 備考 |
| --- | --- | --- | --- | --- |
| `request_received` | HOSPITAL | EMS が受入要請送信 | `hospitals-requests` | 初回要請 |
| `consult_status_changed` | EMS | HOSPITAL が `NEGOTIATING` へ更新 | `cases-list` / `consults` | 要相談通知 |
| `hospital_status_changed` | EMS | HOSPITAL が応答更新 | `cases-list` / `selection-history` | `dedupeKey` あり |
| `consult_comment_from_ems` | HOSPITAL | EMS が相談返信 | `hospitals-consults` | コメント通知 |
| `transport_decided` | HOSPITAL | EMS が搬送決定 | `hospitals-patients` | decision 系 |
| `transport_declined` | HOSPITAL | EMS が搬送辞退 | `hospitals-declined` | decision 系 |

## 運用通知

| kind | audience | 条件 | severity | dedupe / expiry |
| --- | --- | --- | --- | --- |
| `request_repeat` | HOSPITAL | `UNREAD` / `READ` が 5 分以上未確認 | `warning` | 5 分 bucket |
| `reply_delay` | HOSPITAL | `UNREAD` / `READ` が `replyDelayMinutes` 以上未応答 | `critical` | 設定値 bucket |
| `unread_repeat` | EMS | 応答通知が 5 分以上未確認 | `warning` | 5 分 bucket |
| `selection_stalled` | EMS / ADMIN | 搬送決定なしで停滞 | `warning` / `critical` | age bucket |
| `consult_stalled` | EMS / HOSPITAL / ADMIN | 要相談案件が停滞 | `warning` / `critical` | age bucket |

## 運用メモ

- payload は `caseId` と `caseUid` を併載する
- `dedupeKey` は audience/team/hospital/user scope 単位で評価する
- `expiresAt` は再通知・運用通知の有効期限
- `ackedAt` は重要通知を `PATCH /api/notifications` の `ack` で確認した時刻
- unique index の本適用は [`scripts/fix_notification_dedupe_unique.sql`](/C:/practice/medical-support-apps/scripts/fix_notification_dedupe_unique.sql) を使う
