# Backup / Restore Runbook

## 目的

- PostgreSQL のバックアップと復旧手順を、運用者が迷わず実行できる形で固定する。
- 初期目標は `RPO 12時間 / RTO 4時間` とする。

## 基本方針

- バックアップ対象は PostgreSQL を最優先とする。
- 実施時刻は毎日 `12:00` と `24:00` の 1 日 2 回とする。
- 保持期間は 14 日とする。
- 保存先は暗号化済み backup store に限定する。
- 少なくとも複数世代を維持し、追記可能な保存と追記不能または同等に保護された保存の組み合わせを確認する。
- 可能ならネットワークから論理的または物理的に分離した保管経路を持つ。
- production DB dump は local / staging へ直接復元しない。検証が必要な場合は匿名化・最小化したデータを使う。
- 失敗時は `ADMIN` が監視画面で検知できる状態にする。

## バックアップ結果の記録

- アプリ側では `POST /api/admin/monitoring/backup-runs` でバックアップ結果を記録できる。
- admin session からの手動記録、または `BACKUP_REPORT_TOKEN` を使った外部 job からの自動記録に対応する。
- 外部 job では `npm run backup:report` を使う。
- backup command の終了結果まで自動連携する場合は `npm run backup:job -- --job <job-name> -- <backup-command>` を使う。
- 本番連携前に `npm run ops:verify` を実行し、`DATABASE_URL`、`DIRECT_URL`、`BACKUP_REPORT_TOKEN`、`/api/health` の状態を確認する。
- 成功時:

```json
{
  "status": "success",
  "startedAt": "2026-04-09T03:00:00.000Z",
  "completedAt": "2026-04-09T03:04:00.000Z",
  "retentionDays": 14,
  "details": {
    "job": "postgres-noon-backup",
    "location": "secure-backup-store"
  }
}
```

- 失敗時:

```json
{
  "status": "failure",
  "startedAt": "2026-04-09T15:00:00.000Z",
  "completedAt": "2026-04-09T15:02:00.000Z",
  "retentionDays": 14,
  "details": {
    "job": "postgres-midnight-backup",
    "reason": "storage timeout"
  }
}
```

## 日次運用

### 12:00 バックアップ

1. バックアップジョブを実行する
2. 保存先、暗号化状態、サイズ、終了時刻を確認する
3. `npm run backup:report -- --status success --job postgres-noon-backup --location secure-backup-store` で結果を記録する
4. `ADMIN / 監視` 画面で成功反映を確認する

自動連携する場合:

```powershell
npm run backup:job -- --job postgres-noon-backup --location secure-backup-store -- pg_dump --version
```

### 24:00 バックアップ

1. 夜間ジョブを実行する
2. 保存先、暗号化状態、サイズ、終了時刻を確認する
3. `npm run backup:report -- --status success --job postgres-midnight-backup --location secure-backup-store` で結果を記録する
4. 翌朝に `ADMIN / 監視` 画面で失敗がないことを確認する

自動連携する場合:

```powershell
npm run backup:job -- --job postgres-midnight-backup --location secure-backup-store -- pg_dump --version
```

## 失敗時対応

1. `ADMIN / 監視` で失敗 source と時刻を確認する
2. 直前の成功バックアップ時刻を確認する
3. 保存先障害、容量不足、接続失敗のどれかを切り分ける
4. 原因解消後、手動で再実行する
5. 再実行結果を `backup-runs` API へ記録する
6. 失敗記録が必要な場合は `npm run backup:report -- --status failure --job postgres-midnight-backup --details "{\"reason\":\"storage timeout\"}"` を実行する

## 復旧手順

### 前提確認

1. 復旧対象の障害時刻を確定する
2. 使用するバックアップの取得時刻を確定する
3. 影響範囲を共有し、復旧作業開始時刻を決める

### 復旧の流れ

1. アプリの書き込み系操作を停止する
2. 復旧対象の DB を切り離す
3. 直近の正常バックアップから PostgreSQL を復元する
4. アプリ接続を復帰する
5. `ADMIN / 監視` で DB 状態と API 失敗が落ち着いていることを確認する
6. 必要なら監査ログ、通知、直近案件の整合を spot check する

## 復旧後確認

- `ADMIN / 監視` の `DB 接続状態` が正常
- `重要 API 失敗` が急増していない
- `通知生成 / 配信失敗` が増えていない
- 主要ロールでログインできる
- 主要一覧が表示できる

## 定期確認

- 14 日保持が守られているかを週 1 回確認する
- backup store の暗号化設定が有効なままかを週 1 回確認する
- 複数世代、複数方式、追記不能保管が維持されているかを月 1 回確認する
- 監視画面に最新バックアップ時刻が反映されているかを確認する
- 月 1 回、復旧手順の読み合わせか軽い restore drill を行う

## 月次確認欄

| 日付 | 世代保持 | 方式の複線化 | 追記不能保管 | 分離保管 | drill 実施 | 実施者 |
|---|---|---|---|---|---|---|
| 2026-05-31 | 済 | 済 | 要確認 | 未 | 済 | admin-a |

## 注意点

- 本番 DB の復旧は書き込み停止を先に行う
- 不完全なバックアップを成功扱いで記録しない
- 暗号化されていない保存先へ DB dump を置かない
- `backup:job` の `--` 以降に secret を直接書かない。DB password は環境変数や secret store から渡す
- 復旧後に監視画面を見ずに終了しない
