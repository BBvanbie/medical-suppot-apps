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

## 1000件 / 10000件 dataset の作成

注意: `reset` は事案関連データを削除する。実データが入っている環境では実行前に必ず確認する。

```powershell
node scripts/manage_case_load_test_data.js reset
node scripts/manage_case_load_test_data.js seed --count 1000 --chunk-size 100
node scripts/manage_case_load_test_data.js verify --expected 1000
```

10000件で見る場合:

```powershell
node scripts/manage_case_load_test_data.js reset
node scripts/manage_case_load_test_data.js seed --count 10000 --chunk-size 100
node scripts/manage_case_load_test_data.js verify --expected 10000
```

`seed --count` は 100 の倍数のみ許可する。10種類のシナリオを100件単位で繰り返すため、1000件では各シナリオが100件ずつ、10000件では各シナリオが1000件ずつ入る。
`seed` は chunk 単位で bulk insert / update する。`--chunk-size 100` は DB transaction を長時間抱えず、リモート DB でも 10000件投入を現実的な時間で終えるための標準値とする。

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

## 2026-04-13 10000件確認結果

- dataset: `cases=10000`、`hospital_requests=9000`、`hospital_request_targets=19000`、`hospital_request_events=20000`、`notifications=15000`、`hospital_patients=1000`
- `node scripts/check_query_performance.mjs --explain` は全 query が warn / fail なしで通過した。
- `admin_cases_latest`、`ems_cases_latest_by_team`、`case_send_history` は想定 index を使用した。
- `hospital_requests_by_hospital` は Incremental Sort + Nested Loop が残るが、実行計画上は約3msで許容範囲だった。
- `notifications_unread_scope` は 10000件でも Seq Scan + top-N Sort が残るが、約2.7msで許容範囲だった。実データが通知中心に増える場合は最優先で再確認する。
- `e2e/tests/load-10000-readonly.spec.ts` で ADMIN / EMS / HOSPITAL / DISPATCH の read-only 大量一覧と横スクロールなしを確認した。
- EMS の事案検索初期表示は 40件に制限し、repeat / stalled 系の materialized notification は1回20件までに制限する。10000件 dataset では、一覧 UI の初期描画を query timing と別に確認する。

## 非目標

- 1000件 seed は本番負荷試験ではない。
- 同時接続、ネットワーク遅延、外部監視SaaS、DB managed service の性能までは測らない。
- UIの見た目回帰は Playwright / browser verification の対象であり、この runbook では query timing を中心に扱う。
