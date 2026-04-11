# セキュリティログ / 監視イベント方針

## 目的

- ログイン失敗、MFA 失敗、端末登録失敗、権限逸脱、レート制限超過を、`ADMIN / 監視` で同じ判断軸として確認できるようにする。
- 監査ログと監視イベントの役割を分け、原因調査と異常検知を混同しない。

## ログの種類

### 1. 監査ログ

- 保存先: `audit_logs`
- 主な用途: 誰が何を変更したか、またはどの権限逸脱が起きたかを後から追跡する
- 代表イベント:
  - ユーザー作成 / 更新
  - 一時パスワード発行
  - 端末登録コード発行
  - forbidden access attempt

### 2. ログイン試行ログ

- 保存先: `login_attempts`
- 主な用途: ログイン失敗回数、ロック状態、異常なログイン集中を確認する
- 代表イベント:
  - ログイン成功
  - ログイン失敗
  - ロック中のログイン試行
  - レート制限による拒否

### 3. 監視イベント

- 保存先: `system_monitor_events`
- 主な用途: `ADMIN / 監視` に異常兆候として表示する
- 代表 category:
  - `api_failure`
  - `notification_failure`
  - `rate_limit`
  - `security_signal`
  - `backup_failure`
  - `backup_success`

## `security_signal` に集約するもの

- MFA 登録失敗
- MFA 認証失敗
- MFA 対象外ロールによる MFA API 試行
- 端末登録コード不一致
- 端末登録対象外ロールによる端末登録試行
- 権限逸脱試行

## 表示方針

- `ADMIN / 監視` では、24時間以内の `security_signal` 件数を `不正操作兆候` として表示する。
- source が集中している場合は `SECURITY SIGNAL HOTSPOTS` に表示する。
- 個別詳細は `直近監視イベント` と `監査ログ` を併用して確認する。

## 記録してよい情報

- actor user id
- actor role
- target type
- target id
- signal type
- source
- 発生時刻

## 記録しない情報

- パスワード
- 一時パスワード
- MFA credential の秘密情報
- 登録コードの平文
- 患者氏名や本文詳細
- cookie / session token

## 初動判断

- `security_signal` が単発:
  - 利用者の入力ミスや登録手順ミスとして、直近イベントを確認する
- 同じ source に集中:
  - 該当 API の運用ミス、bot、連続試行の可能性を確認する
- 同じ user id に集中:
  - 本人確認後、必要なら一時停止、MFA 再登録、端末再登録を行う
- forbidden access が集中:
  - 権限設定ミス、mode 切替ミス、または不正操作を疑う

## 関連文書

- [security-overview.md](/C:/practice/medical-support-apps/docs/policies/security-overview.md)
- [auth-authorization-policy.md](/C:/practice/medical-support-apps/docs/policies/auth-authorization-policy.md)
- [admin-operations-guide.md](/C:/practice/medical-support-apps/docs/operations/admin-operations-guide.md)
- [incident-response-runbook.md](/C:/practice/medical-support-apps/docs/operations/incident-response-runbook.md)
