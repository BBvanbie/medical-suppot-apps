# DBクエリ一覧 2026-04-14

更新日: 2026-04-14

## 目的

- 現在の query 発生源を `利用シーン単位` で整理する
- 本番で重要な query、重複 query、削除候補 query を分ける
- DB 改善計画の対象範囲を明確にする

## 整理方針

- 1 SQL 文ごとの完全列挙ではなく、`route / repository / analytics / monitoring` ごとの query 群でまとめる
- 重複判定は `同じ責務を別経路で解いているか` を基準にする

## query inventory

### 事案作成 / 解決

`app/api/cases/route.ts`
- 利用シーン: EMS 事案保存
- 主対象: `cases`
- 主 query: `case_id` 既存確認、`INSERT ... ON CONFLICT (case_id)`
- 重要性: 高
- コメント: `case_uid` は補助、upsert 主軸は `case_id`

`lib/caseAccess.ts`
- 利用シーン: case / target 単位の認可
- 主対象: `cases` `hospital_requests` `hospital_request_targets`
- 主 query: `case_uid OR case_id` 解決、target から case/team 解決
- 重要性: 高
- 統合候補: `resolveCaseByAnyId` 系と責務重複あり

`app/api/cases/search/route.ts`
- 利用シーン: 事案検索
- 主対象: `cases` `hospital_requests` `hospital_request_targets`
- 主 query: `ILIKE` 検索、LATERAL による incident_status / decided hospital 集約
- 重要性: 高
- 再評価: trigram index 候補

`app/api/admin/cases/route.ts`
- 利用シーン: ADMIN 全事案一覧と drill-down
- 主対象: `cases` `hospital_requests` `hospital_request_targets` `hospitals`
- 主 query: filter 条件付き一覧、stalled candidate 連携
- 重要性: 高
- 再評価: `ILIKE` と EXISTS 条件の index 最適化候補

`app/api/admin/cases/[caseId]/route.ts`
- 利用シーン: ADMIN case 詳細
- 主対象: `cases`
- 主 query: `case_uid OR case_id` 解決、履歴取得
- 重要性: 中

### 送信履歴 / 搬送調整

`app/api/cases/send-history/route.ts`
- 利用シーン: 受入要請送信、送信履歴取得、EMS 側相談返信
- 主対象: `hospital_requests` `hospital_request_targets` `hospital_request_events` `notifications`
- 主 query: request upsert、target upsert、sent event insert、履歴一覧取得
- 重要性: 最高
- 重複 / 問題候補:
  - 再送時の `sent` event 重複
  - 通知 dedupe が schema 前提

`lib/sendHistoryStatusRepository.ts`
- 利用シーン: HOSPITAL/EMS の状態遷移、搬送決定、辞退、通知、監査
- 主対象: `hospital_request_targets` `hospital_request_events` `hospital_patients` `notifications` `audit_logs`
- 主 query: target 更新、event 追加、transport decided 一意制御、関連 target 自動 decline
- 重要性: 最高

`lib/hospitalRequestRepository.ts`
- 利用シーン: HOSPITAL requests 一覧 / 詳細 / 既読化
- 主対象: `hospital_request_targets` `hospital_requests` `hospital_request_events` `cases` `medical_departments`
- 主 query: requests list、detail、mark as read
- 重要性: 高

`app/api/hospitals/requests/[targetId]/consult/route.ts`
- 利用シーン: HOSPITAL 側相談コメント
- 主対象: `hospital_request_targets` `hospital_request_events` `notifications`
- 重要性: 高

`app/api/cases/consults/[targetId]/route.ts`
- 利用シーン: EMS 側相談返信
- 主対象: `hospital_request_targets` `hospital_request_events`
- 重要性: 高

`app/api/cases/consults/route.ts`
- 利用シーン: EMS 側相談一覧
- 主対象: `hospital_request_targets` `hospital_requests` `cases`
- 重要性: 中

### analytics / stats / alerts

`lib/dashboardAnalytics.ts`
- 利用シーン: EMS / HOSPITAL / ADMIN dashboard
- 主対象: `cases` `hospital_requests` `hospital_request_targets` `hospital_request_events` `hospitals` `emergency_teams`
- 主 query: EMS dashboard、Hospital dashboard、Admin dashboard
- 重要性: 高
- 削除候補:
  - legacy fallback query branch
- 理由:
  - `case_uid join` と `case_id join` が混在し、互換ではなく別結果を返す

`lib/operationalAlerts.ts`
- 利用シーン: selection stalled / consult stalled 抽出
- 主対象: `hospital_requests` `hospital_request_targets` `hospital_request_events`
- 主 query: 集約と最新相談時刻の抽出
- 重要性: 高

`lib/caseSelectionHistory.ts`
- 利用シーン: case ごとの選定履歴
- 主対象: `cases` `hospital_requests` `hospital_request_targets`
- 重要性: 中

`scripts/check_query_performance.mjs`
- 利用シーン: 性能点検
- 主対象: `cases` `hospital_requests` `hospital_request_targets` `notifications` `system_monitor_events`
- 重要性: 高
- コメント: 本番相当データでの定期実行候補

### 通知 / 設定 / 同期

`lib/notifications.ts`
- 利用シーン: 通知作成、一覧、既読、運用通知 materialize
- 主対象: `notifications` `ems_user_settings` `hospital_settings`
- 主 query: scope unread count、list、mark read、dedupe insert
- 重要性: 高
- 問題候補:
  - dedupe が unique index 前提

`app/api/notifications/route.ts`
- 利用シーン: 通知 API
- 主対象: `notifications`
- 重要性: 高

`lib/emsSettingsRepository.ts`
- 利用シーン: EMS settings
- 主対象: `ems_user_settings`
- 重要性: 中

`lib/hospitalSettingsRepository.ts`
- 利用シーン: HOSPITAL settings
- 主対象: `hospital_settings`
- 重要性: 中

`lib/emsSyncRepository.ts`
- 利用シーン: sync state 更新
- 主対象: `ems_sync_state`
- 重要性: 中

### 認証 / セキュリティ / 監視

`lib/securityAuthRepository.ts`
- 利用シーン: ログイン、lockout、端末登録、パスワード変更
- 主対象: `users` `devices` `login_attempts`
- 重要性: 高

`lib/webauthnMfaRepository.ts`
- 利用シーン: WebAuthn challenge / credential
- 主対象: `user_mfa_challenges` `user_mfa_credentials`
- 重要性: 中

`lib/admin/adminMonitoringRepository.ts`
- 利用シーン: ADMIN monitoring
- 主対象: `login_attempts` `system_monitor_events` `backup_run_reports`
- 重要性: 高

`lib/systemMonitor.ts`
- 利用シーン: event 記録、backup report 記録
- 主対象: `system_monitor_events` `backup_run_reports`
- 重要性: 高

`lib/rateLimit.ts`
- 利用シーン: API rate limiting
- 主対象: `api_rate_limit_events`
- 重要性: 中

### マスタ / 管理

`lib/admin/adminManagementRepository.ts`
- 利用シーン: 病院 / 隊 / user 管理、監査一覧
- 主対象: `hospitals` `emergency_teams` `users` `audit_logs`
- 重要性: 高

`lib/admin/adminDevicesRepository.ts`
- 利用シーン: device 一覧 / 更新 / 登録コード発行 / logs
- 主対象: `devices` `audit_logs`
- 重要性: 高

`app/api/hospitals/recent-search/route.ts`
- 利用シーン: 病院検索、診療科と可用性の参照
- 主対象: `hospitals` `hospital_departments` `medical_departments` `hospital_department_availability`
- 重要性: 高

## 削除候補 / 統合候補

### 削除候補

`lib/dashboardAnalytics.ts` の fallback query 群
- 理由: legacy 互換の名目だが、join 条件、期間条件、incident_type が別ロジックになっている
- 条件: 全環境 migration 完了後に削除

### 統合候補

`resolveCaseAccessContext` と `resolveCaseByAnyId`
- 理由: `case_uid OR case_id` 解決を別々に持っている
- 対象: `lib/caseAccess.ts` `app/api/cases/send-history/route.ts`

`request/detail query の表現揺れ`
- 理由: `send-history`、`hospitalRequestRepository`、`consult route` で event 抽出ロジックが似ている
- 方針: shared repository 化の余地あり

### 保持

- `search` と `admin list` は見た目が似ていても利用者、filter、認可条件が違うため削除対象ではない
- `operationalAlerts` と `dashboardAnalytics` も用途が違うため削除対象ではない

## 参照

- `docs/reference/db-table-inventory-2026-04-14.md`
- `docs/plans/2026-04-14-db-hardening-design.md`
