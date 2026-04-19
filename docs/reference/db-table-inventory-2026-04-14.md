# DBテーブル一覧 2026-04-14

更新日: 2026-04-14

## 目的

- 本番DBで扱うテーブルを一覧化する
- 各テーブルの役割、主な利用シーン、主な読取/更新箇所をまとめる
- 直ちに削除できるものと、統合候補を分けて見えるようにする

## 結論

- 現時点で `本番DBから即削除してよいコアテーブル` はない
- 重複の中心は `テーブルそのもの` ではなく、`schema定義経路の重複` と `legacy互換のための query / fallback` にある
- したがって削除対象は、まず `runtime schema mutate` と `legacy fallback query` の統合候補として扱う

## テーブル一覧

### 認証 / 利用者 / 端末

`users`
- 役割: 利用者アカウント、role、所属、パスワード、session_version、mode を保持する中核テーブル
- 利用シーン: ログイン、認可、ユーザー管理、mode切替、MFA対象判定
- 主な参照: `lib/securityAuthRepository.ts` `lib/authContext.ts` `lib/userModeRepository.ts`
- 主な更新: `scripts/setup_auth.sql` `scripts/setup_security_auth.sql` `lib/securityAuthRepository.ts` `lib/admin/adminManagementRepository.ts`
- 判定: `保持`

`devices`
- 役割: 公用端末の登録、再登録、紛失、registered_device_key_hash、registered_user_id を保持
- 利用シーン: 端末登録、端末状態確認、管理画面からのコード発行/失効
- 主な参照: `lib/securityAuthRepository.ts` `lib/admin/adminDevicesRepository.ts`
- 主な更新: `scripts/setup_admin_management.sql` `scripts/setup_security_auth.sql` `lib/admin/adminDevicesRepository.ts`
- 判定: `保持`

`login_attempts`
- 役割: ログイン試行、失敗理由、lockout判定の履歴
- 利用シーン: ログイン失敗回数判定、監視画面、アカウント保護
- 主な参照: `lib/securityAuthRepository.ts` `lib/admin/adminMonitoringRepository.ts`
- 主な更新: `scripts/setup_security_auth.sql` `lib/securityAuthRepository.ts`
- 判定: `保持`

`user_mfa_credentials`
- 役割: WebAuthn credential の保存
- 利用シーン: HOSPITAL MFA 登録・検証
- 主な参照: `lib/webauthnMfaRepository.ts`
- 主な更新: `scripts/setup_security_auth.sql` `lib/webauthnMfaRepository.ts`
- 判定: `保持`

`user_mfa_challenges`
- 役割: WebAuthn challenge の一時保存
- 利用シーン: MFA 開始、認証応答検証
- 主な参照: `lib/webauthnMfaRepository.ts`
- 主な更新: `scripts/setup_security_auth.sql` `lib/webauthnMfaRepository.ts`
- 判定: `保持`

### 基本マスタ

`emergency_teams`
- 役割: EMS隊マスタ、division、team_code、case_number_code、phone
- 利用シーン: 所属判定、dispatch case 番号採番、送信元表示
- 主な参照: `app/api/cases/route.ts` `lib/dashboardAnalytics.ts` `lib/hospitalRequestRepository.ts` `lib/dispatch/dispatchRepository.ts`
- 主な更新: `scripts/seed_neon.sql` `lib/admin/adminManagementRepository.ts` `lib/dispatch/dispatchSchema.ts`
- 判定: `保持`

`hospitals`
- 役割: 病院マスタ、所在、連絡先、表示制御
- 利用シーン: 病院検索、送信先解決、病院管理
- 主な参照: `app/api/hospitals/recent-search/route.ts` `lib/hospitalRequestRepository.ts` `lib/admin/adminManagementRepository.ts`
- 主な更新: `scripts/seed_neon.sql` `lib/admin/adminManagementRepository.ts`
- 判定: `保持`

`medical_departments`
- 役割: 診療科マスタ
- 利用シーン: 病院検索、選定科目表示、可用性設定
- 主な参照: `app/api/hospitals/recent-search/route.ts` `lib/hospitalRequestRepository.ts` `lib/hospitalDepartmentAvailabilityRepository.ts`
- 主な更新: `scripts/setup_departments.sql`
- 判定: `保持`

`hospital_departments`
- 役割: 病院と診療科の紐付け
- 利用シーン: 病院検索、診療科対応判定
- 主な参照: `app/api/hospitals/recent-search/route.ts` `lib/hospitalDepartmentAvailabilityRepository.ts`
- 主な更新: `scripts/setup_departments.sql` `scripts/seed_hospital_departments_demo.sql`
- 判定: `保持`

`hospital_department_availability`
- 役割: 病院ごとの診療科可用性 override
- 利用シーン: 病院検索結果の可否表示、病院側設定
- 主な参照: `app/api/hospitals/recent-search/route.ts` `lib/hospitalDepartmentAvailabilityRepository.ts`
- 主な更新: `lib/hospitalDepartmentAvailabilityRepository.ts`
- 判定: `保持`

### 事案 / 搬送調整

`cases`
- 役割: 事案本体。`case_id` と `case_uid`、基本属性、case_payload、mode を持つ
- 利用シーン: EMS事案作成、dispatch起票、全検索、analytics、送信履歴
- 主な参照: `app/api/cases/*.ts` `app/api/admin/cases*.ts` `lib/dashboardAnalytics.ts` `lib/caseAccess.ts`
- 主な更新: `app/api/cases/route.ts` `lib/dispatch/dispatchRepository.ts`
- 判定: `保持`

`hospital_requests`
- 役割: 1回の病院送信リクエスト単位。`request_id`、`case_uid`、送信元隊、patient_summary を持つ
- 利用シーン: 送信履歴、病院一覧、病院詳細、analytics
- 主な参照: `app/api/cases/send-history/route.ts` `lib/hospitalRequestRepository.ts` `lib/dashboardAnalytics.ts`
- 主な更新: `app/api/cases/send-history/route.ts`
- 判定: `保持`

`hospital_request_targets`
- 役割: 送信先病院単位の状態管理。UNREAD/READ/NEGOTIATING/ACCEPTABLE など
- 利用シーン: 病院側の受入管理、EMSの送信先追跡、analytics、運用アラート
- 主な参照: `lib/hospitalRequestRepository.ts` `lib/sendHistoryStatusRepository.ts` `lib/dashboardAnalytics.ts`
- 主な更新: `app/api/cases/send-history/route.ts` `lib/sendHistoryStatusRepository.ts` `app/api/hospitals/requests/[targetId]/consult/route.ts`
- 判定: `保持`

`hospital_request_events`
- 役割: targetごとの状態遷移 / コメント履歴
- 利用シーン: 相談コメント、送信イベント、既読化、搬送決定/辞退、analytics
- 主な参照: `lib/sendHistoryStatusRepository.ts` `lib/hospitalRequestRepository.ts` `lib/dashboardAnalytics.ts`
- 主な更新: `app/api/cases/send-history/route.ts` `lib/sendHistoryStatusRepository.ts` `app/api/cases/consults/[targetId]/route.ts`
- 判定: `保持`

`hospital_patients`
- 役割: 搬送決定済みの受入先を 1 case_uid 1件で保持
- 利用シーン: 搬送決定の一意制御、病院患者一覧
- 主な参照: `lib/sendHistoryStatusRepository.ts` `app/hospitals/patients` 系
- 主な更新: `lib/sendHistoryStatusRepository.ts`
- 判定: `保持`

`notifications`
- 役割: EMS/HOSPITAL 向け通知、未読、ack、dedupe、expires を保持
- 利用シーン: 通知一覧、未読集計、運用アラート、病院応答通知
- 主な参照: `lib/notifications.ts` `app/api/notifications/route.ts`
- 主な更新: `lib/notifications.ts` `app/api/cases/send-history/route.ts` `lib/sendHistoryStatusRepository.ts`
- 判定: `保持`

### 設定 / 同期

`hospital_settings`
- 役割: 病院側の運用設定
- 利用シーン: 病院 settings、通知や応答ポリシーの読み書き
- 主な参照: `lib/hospitalSettingsRepository.ts` `lib/notifications.ts`
- 主な更新: `lib/hospitalSettingsRepository.ts`
- 判定: `保持`

`ems_user_settings`
- 役割: EMS 個人設定
- 利用シーン: EMS settings、UI表示や個人化設定
- 主な参照: `lib/emsSettingsRepository.ts` `lib/notifications.ts`
- 主な更新: `lib/emsSettingsRepository.ts`
- 判定: `保持`

`ems_sync_state`
- 役割: EMS 同期状態、最後の同期時刻や状態管理
- 利用シーン: オフライン同期状態表示
- 主な参照: `lib/emsSyncRepository.ts`
- 主な更新: `lib/emsSyncRepository.ts`
- 判定: `保持`

### 監査 / 監視 / レート制御

`audit_logs`
- 役割: 管理操作、権限逸脱、重要状態変更の監査ログ
- 利用シーン: ADMIN audit、device操作履歴、send-history 状態変更監査
- 主な参照: `lib/auditLog.ts` `lib/admin/adminManagementRepository.ts` `lib/admin/adminDevicesRepository.ts`
- 主な更新: `lib/auditLog.ts` `lib/sendHistoryStatusRepository.ts`
- 判定: `保持`

`system_monitor_events`
- 役割: security_signal、運用イベント、失敗イベントの監視記録
- 利用シーン: `/admin/monitoring`、通知失敗、API失敗、bulk-send検知
- 主な参照: `lib/systemMonitor.ts` `lib/admin/adminMonitoringRepository.ts` `lib/securityOperationSignals.ts`
- 主な更新: `lib/systemMonitor.ts`
- 判定: `保持`

`backup_run_reports`
- 役割: backup job の実行報告
- 利用シーン: backup 監視、最新成功/失敗の確認
- 主な参照: `lib/systemMonitor.ts` `lib/admin/adminMonitoringRepository.ts`
- 主な更新: `lib/systemMonitor.ts`
- 判定: `保持`

`api_rate_limit_events`
- 役割: API レート制限のイベント窓口
- 利用シーン: search_read、critical_update などの制御
- 主な参照: `lib/rateLimit.ts`
- 主な更新: `lib/rateLimit.ts`
- 判定: `保持`

## 削除候補と統合候補

### 即削除候補

- なし
- 理由: 参照されていない本番テーブルは今回のコード読解範囲では見つかっていない

### 統合候補

`runtime schema定義`
- 対象: `lib/casesSchema.ts` `lib/hospitalRequestSchema.ts` `lib/securityAuthSchema.ts` `lib/admin/adminManagementSchema.ts` `lib/hospitalSettingsSchema.ts` `lib/emsSettingsSchema.ts` `lib/emsSyncSchema.ts`
- 重複元: `scripts/setup_*.sql`
- 理由: 同じテーブル / index / column を `script` と `runtime ensure` の二系統で管理しており、schema drift と `42501` 隠蔽を起こしやすい
- 方針: migration 一本化後に runtime mutate を縮退または削除

`audit_logs schema定義`
- 対象: `lib/auditLog.ts` と `lib/admin/adminManagementSchema.ts` と `scripts/setup_admin_management.sql`
- 理由: `audit_logs` の定義責務が複数箇所に分散している
- 方針: migration 正本へ統合

`devices schema定義`
- 対象: `lib/admin/adminManagementSchema.ts` と `scripts/setup_admin_management.sql` と `scripts/setup_security_auth.sql`
- 理由: device 基礎定義と security 拡張が複数経路に分かれている
- 方針: migration 群へ再編し、役割ごとに分割する

## 再評価候補

`notifications の ON DELETE CASCADE`
- 理由: team/hospital/target の削除で通知履歴が消える
- 今回の扱い: 削除対象ではなく、保持ポリシー見直し対象

`hospital_patients の一意制約前提`
- 理由: `case_uid` 1件に寄せるため履歴を強く捨てる設計
- 今回の扱い: 削除対象ではなく、設計確認対象

## 参照

- `docs/reference/db-query-inventory-2026-04-14.md`
- `docs/plans/2026-04-14-db-hardening-design.md`
- `docs/plans/2026-04-14-db-hardening-implementation.md`
