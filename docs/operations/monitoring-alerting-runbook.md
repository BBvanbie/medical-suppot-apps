# Monitoring / Alerting Runbook

## 目的

本番運用で何を監視し、どの条件で、誰に、どう通知するかを固定する。

## 監視対象

| 対象 | 方法 | 異常条件 | 優先度 |
|---|---|---|---|
| App uptime | `GET /api/health` | 2回連続 503 / timeout | 高 |
| DB 接続 | `/api/health` の `checks.db` | `error` | 高 |
| API 失敗 | `system_monitor_events.api_failure` | 15分で 5件以上 | 高 |
| security signal | `system_monitor_events.security_signal` | 15分で 5件以上、または同一 source 連続 | 高 |
| rate limit | `system_monitor_events.rate_limit` | 15分で 10件以上 | 中 |
| notification failure | `system_monitor_events.notification_failure` | 15分で 3件以上 | 高 |
| backup job | `backup_run_reports` | 12:00 / 24:00 の結果未報告、または failure | 高 |
| offline queue | admin / E2E / operational review | 長時間未送信が増加 | 中 |

## 通知先

初期運用では具体的な SaaS 製品名は固定しない。導入先に合わせて Slack、email、SMS、電話連絡網のいずれかを設定する。

| severity | 通知先 | 期待対応 |
|---|---|---|
| critical | 管理責任者 + 技術担当 + 現場窓口 | 15分以内に一次確認 |
| high | 技術担当 + admin | 30分以内に一次確認 |
| medium | admin | 当日中に確認 |
| low | admin 監視画面 | 定期確認 |

## 外部監視設定

- `/api/health` を 1分間隔で監視する。
- timeout は 10秒を目安にする。
- 2回連続失敗で high alert とする。
- 5分以上継続で critical alert とする。
- `failSafe.status = degraded_db_unavailable` の場合は [fail-safe-runbook.md](/C:/practice/medical-support-apps/docs/operations/fail-safe-runbook.md) に沿ってロール別制限運転へ移る。

## Backup job 監視

backup job は実行後に以下を呼ぶ。

```powershell
npm run backup:report -- --status success --job postgres-noon-backup --location secure-backup-store
```

失敗時:

```powershell
npm run backup:report -- --status failure --job postgres-midnight-backup --details "{\"reason\":\"storage timeout\"}"
```

backup command の終了結果ごと自動報告する場合:

```powershell
npm run backup:job -- --job postgres-noon-backup --location secure-backup-store -- pg_dump --version
```

`BACKUP_REPORT_TOKEN` を job 環境に設定し、アプリ側にも同じ token を設定する。

本番連携前の確認:

```powershell
npm run ops:verify
```

`BACKUP_REPORT_TOKEN` が missing の場合、backup job の自動報告は受け付けられない。`/api/health` が `healthy` でない場合は、backup 連携より先に fail-safe / incident 対応を優先する。

## 日次確認

1. `ADMIN / 監視` を開く。
2. DB 接続、API 失敗、通知失敗、security signal、backup result を確認する。
3. backup result が 12:00 / 24:00 の 2回分揃っていることを確認する。
4. 異常がある場合は incident runbook へ移る。

## 関連文書

- [incident-response-runbook.md](/C:/practice/medical-support-apps/docs/operations/incident-response-runbook.md)
- [backup-restore-runbook.md](/C:/practice/medical-support-apps/docs/operations/backup-restore-runbook.md)
- [infrastructure-overview.md](/C:/practice/medical-support-apps/docs/policies/infrastructure-overview.md)
