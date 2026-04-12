# 性能 / index 確認 runbook

## 目的

1000件以上の事案、搬送要請、通知、監視イベントが蓄積しても、主要画面とAPIが実用速度を維持できるか確認する。

## 対象画面 / API

| 対象 | 主な query | 目標 |
|---|---|---|
| `ADMIN / 事案一覧` | `cases.mode + updated_at` | 通常 500ms 未満、警告 1500ms 以上 |
| `EMS / 事案一覧・検索` | `cases.mode + team_id + timeline` | 通常 500ms 未満、警告 1500ms 以上 |
| `HOSPITAL / 受入要請一覧` | `hospital_request_targets.hospital_id + hospital_requests.mode` | 通常 500ms 未満、警告 1500ms 以上 |
| `送信履歴 / 詳細` | `hospital_requests.case_uid + targets` | 通常 500ms 未満、警告 1500ms 以上 |
| `通知` | `notifications.role/mode/scope/is_read` | 通常 500ms 未満、警告 1500ms 以上 |
| `ADMIN / 監視` | `system_monitor_events` / `backup_run_reports` | 通常 500ms 未満、警告 1500ms 以上 |

## 1000件 dataset の作成

注意: `reset` は事案関連データを削除する。実データが入っている環境では実行前に必ず確認する。

```powershell
node scripts/manage_case_load_test_data.js reset
node scripts/manage_case_load_test_data.js seed --count 1000
node scripts/manage_case_load_test_data.js verify --expected 1000
```

`seed --count` は 100 の倍数のみ許可する。10種類のシナリオを100件単位で繰り返すため、1000件では各シナリオが100件ずつ入る。

## 代表 query timing

```powershell
npm run performance:check
```

詳細な execution plan を見る場合:

```powershell
npm run performance:check -- --explain
```

しきい値を変える場合:

```powershell
npm run performance:check -- --warn-ms 800 --fail-ms 2000
```

## 追加済み index

### `cases`

- `idx_cases_case_id`
- `idx_cases_mode_updated`
- `idx_cases_mode_team_timeline`
- `idx_cases_mode_division`

### `hospital_requests`

- `idx_hospital_requests_case_uid_sent_at`
- `idx_hospital_requests_mode_sent_at`
- `idx_hospital_requests_created_by_created`

### `hospital_request_targets`

- `idx_hospital_request_targets_hospital_updated`
- `idx_hospital_request_targets_hospital_status_updated`
- `idx_hospital_request_targets_request_status_updated`

### `hospital_request_events`

- `idx_hospital_request_events_target_type_status_acted`
- `idx_hospital_request_events_actor_acted`

### `notifications`

- `idx_notifications_role_mode_scope_unread_created`
- `idx_notifications_target_user_mode_unread_created`

## 判断

- `performance:check` が `fail` を返したら、対象 query の `EXPLAIN` を確認する。
- `Seq Scan` が大きなテーブルで出る場合は index 条件と where/order 条件のズレを見る。
- `Nested Loop` が過大になる場合は一覧側の件数制限、LATERAL query、join順を見直す。
- 1000件で問題なく、10000件で遅くなる場合は pagination / cursor 化を優先する。

## 非目標

- 1000件 seed は本番負荷試験ではない。
- 同時接続、ネットワーク遅延、外部監視SaaS、DB managed service の性能までは測らない。
- UIの見た目回帰は Playwright / browser verification の対象であり、この runbook では query timing を中心に扱う。
