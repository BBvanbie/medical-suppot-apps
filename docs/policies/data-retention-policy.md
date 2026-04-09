# データ保持 / 削除方針

## 目的

- どのデータをどのくらい保持し、削除や再利用をどう扱うかを整理する。

## 基本方針

- 患者情報、相談履歴、通知、監査ログは役割が違うため、同じ扱いにしない。
- アプリ内で即時物理削除を乱用せず、まずは運用ルールを固定する。

## データ分類

### 1. 患者情報 / 事案情報

- 対象:
  - `cases`
  - `hospital_requests`
  - `hospital_request_targets`
  - `hospital_patients`
- 方針:
  - 本番運用データとして保持する
  - 管理者が自由に物理削除しない

### 2. 相談履歴 / 通知

- 対象:
  - `hospital_request_events`
  - `notifications`
- 方針:
  - 運用履歴として保持する
  - 画面上の既読や期限切れと、DB 物理削除を分ける

### 3. 認証 / 監査 / 監視

- 対象:
  - `audit_logs`
  - `login_attempts`
  - `user_security_devices`
  - `system_monitor_events`
  - `backup_run_reports`
- 方針:
  - セキュリティと運用確認のため保持する
  - 短期ログと長期監査を区別して棚卸しする

## 初期保持方針

- バックアップ:
  - 14日
- 監視イベント:
  - 当面は保持し、後続でアーカイブ方針を決める
- ログイン試行履歴:
  - 当面は保持し、後続で削除バッチを検討する
- 監査ログ:
  - 当面は保持し、削除ポリシーは別途決定する

## 削除方針

- 本番患者データは、管理 UI から即時物理削除しない
- テストデータは専用スクリプトや明示的な管理手順で削除する
- 削除が必要な場合は、対象範囲、理由、実施者を残す

## 外部説明向け整理

- 患者情報は業務継続に必要な範囲で扱う
- 通知は業務導線の補助情報として扱う
- 認証、監査、監視系データは安全運用のために分離して保持する

## 関連文書

- [security-overview.md](/C:/practice/medical-support-apps/docs/policies/security-overview.md)
- [auth-authorization-policy.md](/C:/practice/medical-support-apps/docs/policies/auth-authorization-policy.md)
