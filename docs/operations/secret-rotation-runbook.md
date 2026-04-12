# Secret Rotation Runbook

## 目的

secret の定期更新、漏えい時の即時更新、環境分離を安全に行う。

## 対象 secret

| secret | 用途 | rotation 目安 | 注意 |
|---|---|---|---|
| `AUTH_SECRET` | Auth.js session / token 保護 | 90日または漏えい時 | 変更時は全ユーザー再ログイン |
| `DATABASE_URL` | PostgreSQL 接続 | DB credential 更新時 | 先に新 credential を発行して接続確認 |
| `BACKUP_REPORT_TOKEN` | backup job の結果報告 | 90日または担当者変更時 | cron / job 側も同時更新 |
| `OFFLINE_DATA_KEY_SECRET` | 将来の offline key 専用 secret | 90日または漏えい時 | 未設定時は `AUTH_SECRET` を利用 |

## 通常 rotation 手順

1. 対象環境を決める。production と staging を同時に変えない。
2. 新 secret を secret manager またはホスティング環境に登録する。
3. staging で同等手順を確認する。
4. production の低利用時間帯に反映する。
5. アプリを再起動または再デプロイする。
6. `/api/health` を確認する。
7. 代表ロールでログイン確認する。
8. backup report token の場合は `npm run backup:report -- --status success --job rotation-smoke-test` を実行し、`ADMIN / 監視` で反映を確認する。
9. 旧 secret を無効化する。

## 漏えい時手順

1. 影響 secret と環境を確定する。
2. production の該当 secret を即時差し替える。
3. `AUTH_SECRET` 漏えい時は全 session を失効扱いにするため、再ログイン発生を関係者へ通知する。
4. `DATABASE_URL` 漏えい時は DB credential を revoke し、接続元ログを確認する。
5. `BACKUP_REPORT_TOKEN` 漏えい時は token を差し替え、backup job 側も更新する。
6. `audit_logs`、`system_monitor_events`、hosting / DB logs を確認する。
7. incident record を残す。

## 禁止事項

- secret を docs、issue、チャット、スクリーンショットに貼らない。
- production secret を local / staging に流用しない。
- rotation 後に旧 secret を残し続けない。

## 関連文書

- [environment-separation-policy.md](/C:/practice/medical-support-apps/docs/policies/environment-separation-policy.md)
- [incident-response-runbook.md](/C:/practice/medical-support-apps/docs/operations/incident-response-runbook.md)
