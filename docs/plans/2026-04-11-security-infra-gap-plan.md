# Security / Infrastructure Gap Plan

作成日: 2026-04-11

## 目的

現時点の実装と運用文書を、追加指摘された「セキュリティで不足しているもの」「サーバー / インフラで不足しているもの」と照合し、正しい不足分を実装計画へ落とし込む。

## 照合結論

指摘は概ね正しい。ただし、すでに一部実装済みの項目があるため、扱いは次の 3 種類に分ける。

- `未実装`: まだコードや運用文書に実体がない
- `一部実装済み`: 最小実装はあるが、本番運用に必要な自動化、保管方針、通知先、説明資料が不足
- `文書更新必要`: 実装は進んだが、docs に古い PIN / 8時間再ログイン仕様などが残っている

## 現状確認メモ

### 既にあるもの

- 監査ログ: `audit_logs` と `writeAuditLog` / `writeForbiddenAccessAudit`
- ログイン失敗記録: `login_attempts`
- ログインロック: `5回 / 5分` 方針
- レート制限: `lib/rateLimit.ts`
- レート超過監視: `system_monitor_events` の `rate_limit`
- 監視画面: `/admin/monitoring`
- バックアップ結果記録: `/api/admin/monitoring/backup-runs` と `backup_run_reports`
- バックアップ runbook: `docs/operations/backup-restore-runbook.md`
- 障害時 runbook: `docs/operations/incident-response-runbook.md`
- オフライン基盤: IndexedDB に `caseDrafts`、`offlineQueue`、`hospitalCache` などを保存

### 明確に不足しているもの

- セキュリティヘッダの明示設定
- secret rotation / 本番開発分離 / secret 参照権限の運用方針
- DB 保存データ暗号化方針の具体化
- IndexedDB オフラインデータの暗号化、保存期間、消去条件
- 不正操作検知ルールのしきい値と監視イベント化
- 脆弱性対応運用の標準化
- 本番構成図の具体化
- 外部監視 / ジョブ監視 / キュー監視 / 障害通知先
- バックアップジョブの自動実行と自動結果報告
- ステージング環境の位置づけ
- ログ保管先と保持期間
- 1000件以上、長期運用時の性能目標
- DB停止 / 通知失敗 / 部分障害時の制限運転設計

### 文書更新が必要なもの

- `docs/policies/security-overview.md`
  - 3時間 PIN、8時間完全再ログインの古い記述が残っている
  - 現行方針は EMS / HOSPITAL の WebAuthn MFA 必須、5時間再ログイン
- `docs/policies/data-handling-overview.md`
  - ローカル端末の扱いに PIN 前提が残っている
- `docs/operations/admin-operations-guide.md`
  - PIN / 8時間前提が残っている

## セキュリティ項目別判定

| 項目 | 判定 | 根拠 | 次アクション |
|---|---|---|---|
| セキュリティログ | 一部実装済み | `audit_logs`、`login_attempts`、`system_monitor_events` はある | ログイン失敗、MFA失敗、端末登録失敗、権限逸脱、rate limit hit を同じ管理画面で追える分類へ整理する |
| セキュリティヘッダ | 未実装 | `next.config.ts` に headers 設定なし | CSP、HSTS、frame 制御、referrer、permissions policy を追加する |
| secret 管理 | 未実装 | env 利用前提のみ | `.env.example`、rotation 手順、環境分離、閲覧権限、漏えい時手順を定義する |
| 保存データ暗号化方針 | 未実装 | DB 暗号化や列単位暗号化の方針がない | DB at-rest 暗号化を本番基盤要件にし、列単位暗号化の対象を決める |
| オフライン保存の保護 | 一部実装済み | IndexedDB 保存はあるが暗号化なし | IndexedDB 暗号化、TTL、ログアウト / 端末停止時削除、紛失時対応を設計する |
| 不正操作検知 | 一部実装済み | rate limit hit は監視化済み | 大量送信、異常ログイン、権限逸脱試行を `system_monitor_events` に集約する |
| 脆弱性対応運用 | 未実装 | CI / npm audit / Dependabot 方針が未整理 | npm audit、依存更新、緊急パッチ、リリース判定を runbook 化する |

## サーバー / インフラ項目別判定

| 項目 | 判定 | 根拠 | 次アクション |
|---|---|---|---|
| 本番構成図 | 一部文書あり | `docs/policies/infrastructure-overview.md` は最小構成のみ | App / DB / backup / logs / monitoring / notification の構成図を追加する |
| 監視基盤 | 一部実装済み | `/admin/monitoring` はある | 外部 uptime、ジョブ監視、キュー監視、通知先を追加設計する |
| 障害通知先 | 未実装 | 通知先、条件、経路が未定義 | severity 別の通知先と通知方法を固定する |
| バックアップ運用 | 一部実装済み | runbook と結果記録 API はある | 実行ジョブ、自動報告、復元訓練ログを追加する |
| ステージング環境 | 未実装 | 本番前検証環境の定義なし | staging の DB、secret、MFA、通知、テストデータ方針を定義する |
| ログ保管基盤 | 一部実装済み | DB 内監査 / 監視ログはある | アプリログ、障害ログ、監査ログの保存先と保持期間を決める |
| 大量データ性能設計 | 一部実装済み | 100件 dataset と E2E はある | 1000件、10000件、長期保持時の目標と索引確認を行う |
| 障害時フェイルセーフ | 一部実装済み | EMS offline と runbook はある | DB停止、通知失敗、部分障害時の制限運転をロール別に定義する |

## 推奨実装順

### Phase 1: すぐ閉じるべき安全性の穴

1. セキュリティヘッダを `next.config.ts` に追加する
2. 古い PIN / 8時間仕様が残る docs を WebAuthn / 5時間仕様へ更新する
3. security event taxonomy を定義し、監査ログと監視イベントの分類を統一する
4. MFA失敗、端末登録失敗、権限逸脱、rate limit hit を監視イベントへ寄せる
5. `/admin/monitoring` で不正操作兆候を見えるようにする

### Phase 2: オフラインと保存データの保護

1. IndexedDB に保存しているデータの一覧とリスクを再整理する
2. オフライン保存 TTL を決める
3. ログアウト、端末登録解除、アカウント停止時にローカルデータを削除する設計を追加する
4. Web Crypto による IndexedDB 暗号化方式を検討し、MFA / 端末登録との鍵管理関係を決める
5. DB at-rest 暗号化は本番基盤要件として固定し、列単位暗号化の対象を最小選定する

### Phase 3: 本番運用基盤

1. 本番構成図を docs に追加する
2. `production / staging / local` の環境分離を定義する
3. secret rotation runbook を追加する
4. バックアップジョブを自動化し、`backup-runs` API へ結果を自動報告する
5. 外部 uptime 監視、DB監視、ジョブ監視、障害通知先を決める

### Phase 4: 長期運用 / 性能 / 脆弱性対応

1. npm audit / dependency update / emergency patch の運用を CI と runbook に追加する
2. 1000件以上の性能目標を定義する
3. 主要一覧、検索、監視 query の index を見直す
4. 1000件 / 10000件 dataset の seed と focused E2E / API timing check を追加する
5. 障害時フェイルセーフをロール別に固定する

## 実装時の注意

- セキュリティヘッダは CSP を強くしすぎると Next.js、WebAuthn、開発環境、画像 / font / dev websocket を壊すため、まず `report-only` 相当の設計から始める。
- オフライン暗号化は「暗号化したら安全」ではなく、鍵をどこに置くかが本体。WebAuthn credential そのものを復号鍵には使えないため、端末登録キーやセッション由来鍵との関係を別途設計する。
- DB暗号化はアプリだけで完結しない。本番基盤、PostgreSQL managed service、backup store の暗号化設定を含めて決める。
- 監視通知は画面表示だけでは不十分。本番では Slack / email / SMS / 電話などの通知先が必要。

## 確認済みコマンド

```powershell
rg "audit|security log|login|rate|backup|monitor|HSTS|CSP|Content-Security|offline|encrypt|secret" docs app lib scripts .github -n
Get-Content -Raw lib/auditLog.ts
Get-Content -Raw lib/rateLimit.ts
Get-Content -Raw lib/systemMonitor.ts
Get-Content -Raw lib/admin/adminMonitoringRepository.ts
Get-Content -Raw next.config.ts
Get-Content -Raw lib/offline/offlineDb.ts
```

## 次の着手候補

推奨は Phase 1 から着手する。

最初の実装単位:

1. `next.config.ts` に security headers を追加
2. security docs の古い PIN / 8時間記述を修正
3. `docs/policies/security-logging-policy.md` を追加
4. `system_monitor_events` のカテゴリに `security_signal` を追加
5. admin monitoring に `不正操作兆候` セクションを追加

## Phase 1 実装結果

実施日: 2026-04-11

完了:

- `next.config.ts` に security headers を追加した
  - `Content-Security-Policy`
  - `X-Frame-Options`
  - `X-Content-Type-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - production のみ `Strict-Transport-Security`
- `system_monitor_events` の category に `security_signal` を追加した
- `recordSecuritySignalEvent` を追加した
- MFA 登録 / 認証失敗を `security_signal` として記録するようにした
- 端末登録失敗を `security_signal` として記録するようにした
- 権限逸脱試行を `audit_logs` と `security_signal` の両方へ記録するようにした
- `/admin/monitoring` に `SECURITY 24H` と `不正操作兆候` を追加した
- `SECURITY SIGNAL HOTSPOTS` を追加した
- `docs/policies/security-logging-policy.md` を追加した
- 古い PIN / 8時間仕様が残っていた主要 docs を WebAuthn MFA / 5時間仕様へ更新した

残る注意:

- CSP は Next.js と現行 client component の都合で `unsafe-inline` / `unsafe-eval` を許容している。将来 nonce / hash 方式へ強化する。
- `security_signal` のしきい値通知はまだ画面表示のみ。外部通知先は Phase 3 で扱う。
- オフライン保存暗号化、TTL、ローカルデータ削除条件は Phase 2 で扱う。

## Phase 2 実装結果

実施日: 2026-04-11

完了:

- IndexedDB `medical-support-apps-offline` の store 別 TTL を定義した
  - `hospitalCache`: 1日
  - `searchState`: 1日
  - `caseDrafts`: 同期済み 1日、未同期 14日
  - `offlineQueue`: 14日
  - `emsSettings`: 14日
  - `syncMeta`: 30日
- `purgeExpiredOfflineData` を追加し、`OfflineProvider` 起動時に期限切れ record を削除するようにした
- `clearProtectedLocalData` を追加し、ログアウト時に IndexedDB と一部 `sessionStorage` を削除するようにした
- `secureSignOut` を追加し、各 role sidebar、端末登録後の再ログイン、パスワード変更後の再ログインでローカル保護データを削除してから sign out するようにした
- セッション失効または端末未信頼を `/api/security/device-status` で検知した場合にローカル保護データを削除できる helper を用意した
- `/api/security/offline-key` を追加し、ログイン済み EMS かつ登録端末だけが IndexedDB 暗号鍵を取得できるようにした
- `caseDrafts` と `offlineQueue` の新規保存を Web Crypto AES-GCM で暗号化した
- 旧平文 record は読み取り互換を維持し、読み取り時に暗号化 record へ寄せる方針にした
- `docs/policies/offline-data-protection-policy.md` を追加した

残る注意:

- IndexedDB の Web Crypto 暗号化は `caseDrafts` / `offlineQueue` から開始。`hospitalCache` は 1日 TTL とログアウト削除で保護し、必要なら次段階で暗号化対象へ追加する。
- セッション失効 / 端末未信頼時の自動削除は常時 polling ではなく、次に明示的な検知タイミングを決める。
- DB at-rest 暗号化はアプリコードだけでは完結しないため、Phase 3 の本番基盤要件で固定する。

## Phase 3 実装結果

実施日: 2026-04-12

完了:

- `/api/health` を追加し、外部 uptime 監視から app / DB の最小生存確認ができるようにした
- `POST /api/admin/monitoring/backup-runs` に `BACKUP_REPORT_TOKEN` による外部 job 報告を追加した
- `scripts/report_backup_run.mjs` と `npm run backup:report` を追加した
- `.env.example` に `APP_BASE_URL`、`BACKUP_REPORT_TOKEN`、`BACKUP_REPORT_URL` を追加した
- `docs/policies/infrastructure-overview.md` に App / DB / backup / logs / monitoring / notification の構成図を追加した
- `docs/policies/environment-separation-policy.md` を追加し、`local / staging / production` の DB、secret、通知、データ分離を固定した
- `docs/operations/secret-rotation-runbook.md` を追加した
- `docs/operations/monitoring-alerting-runbook.md` を追加した
- `docs/operations/backup-restore-runbook.md` に backup report CLI の実行手順を追記した

残る注意:

- 外部監視 SaaS / 通知経路の製品名は未固定。導入先に合わせて Slack、email、SMS、電話連絡網のいずれかを設定する。
- backup job 本体の DB dump / restore automation は環境依存のため、現時点では report CLI までを repo に含める。
- Phase 4 で npm audit / dependency update / emergency patch、1000件以上性能目標、index 見直しを扱う。

## Phase 4 先行実装結果

実施日: 2026-04-12

完了:

- ログイン失敗を `login_attempts` に加えて `system_monitor_events.security_signal` へ記録するようにした
- ログイン失敗がロックしきい値へ到達した場合は `error` severity として監視画面へ出すようにした
- 権限逸脱試行を `audit_logs` に加えて `system_monitor_events.security_signal` へ記録するようにした
- ログイン失敗の監視 metadata ではユーザー名を平文ではなく hash として保存する方針にした
- `docs/policies/security-logging-policy.md` にログイン失敗と username hash の扱いを追記した

残る注意:

- 今回は既存の監視基盤への集約を優先し、自動ブロック追加や通知連携のしきい値変更は行っていない。
- 大量送信検知、dependency update / emergency patch、1000件以上性能目標、index 見直しは後続の Phase 4 残件として扱う。

## Phase 4 脆弱性対応運用 実装結果

実施日: 2026-04-12

完了:

- `npm audit fix` と `next@16.2.3` への更新で `npm audit --audit-level=high` の検出を 0 件にした
- `npm run security:audit` を追加した
- GitHub Actions CI に dependency security audit step を追加した
- `.github/dependabot.yml` を追加し、npm dependency update PR を週次で作成する設定を追加した
- `docs/operations/vulnerability-response-runbook.md` を追加した
- `docs/operations/README.md` に脆弱性対応 runbook を追加した

残る注意:

- Next.js runtime 更新を含むため、`npm run check:full` で build まで確認する。
- Dependabot PR の自動マージはまだ設定しない。runtime / auth / DB 関連は人が内容確認してから merge する。
- 大量送信検知、1000件以上性能目標、index 見直しは後続の Phase 4 残件。
