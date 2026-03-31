# 救急搬送支援システム 統合仕様書

最終更新: 2026-03-29

この文書は `medical-support-apps` の現行コードベースを基準にした統合仕様書です。
旧 `docs/legacy/system-spec-2026-03-06.md` と `docs/legacy/project-summary-2026-03-11.md` を補完し、現在の実装範囲を 1 本で把握できるようにまとめています。

## 1. 目的

- 救急隊、病院、指令、管理者が同一事案をロール別 UI で扱えること
- 事案作成、病院検索、受入要請、相談、搬送判断、通知、設定、監査を一貫した構造で扱うこと
- 内部参照を `case_uid`、外部表示を `case_id` に分離し、将来の拡張でも事案識別を安定させること
- EMS の一部業務をオフラインでも継続できる基盤を持つこと

## 2. システム概要

- フレームワーク: Next.js 16 App Router
- UI: React 19, Tailwind CSS v4
- API: App Router Route Handler
- DB: PostgreSQL (`pg`)
- 認証: NextAuth Credentials Provider
- 主ロール:
  - `EMS`
  - `HOSPITAL`
  - `ADMIN`
  - `DISPATCH`

### 2-1. 画面ドメイン

- EMS
  - 事案作成
  - 事案一覧
  - 事案詳細
  - 病院検索
  - EMS 設定
- HOSPITAL
  - 受入要請一覧
  - 相談事案一覧
  - 搬送患者一覧
  - 搬送辞退一覧
  - 診療情報入力
  - HOSPITAL 設定
- DISPATCH
  - 指令事案作成
  - 指令事案一覧
- ADMIN
  - 病院、救急隊、ユーザー、端末、組織、監査ログ、事案の管理

## 3. 認証・認可仕様

### 3-1. ログイン

- ログイン画面: `/login`
- 認証情報: `username + password`
- 認証成功後の既定遷移:
  - `EMS` -> `/paramedics`
  - `HOSPITAL` -> `/hospitals`
  - `ADMIN` -> `/admin`
  - `DISPATCH` -> `/dispatch`

### 3-2. ミドルウェア保護

`proxy.ts` により以下を保護します。

- `/settings/*` は `EMS` のみ
- `/hp/settings/*` は `HOSPITAL` のみ
- `/paramedics/*` は `EMS` のみ
- `/hospitals/*` は原則 `HOSPITAL` のみ
  - 例外で `EMS` は以下のみ許可
    - `/hospitals/search`
    - `/hospitals/request/confirm`
    - `/hospitals/request/completed`
- `/admin/*` は `ADMIN` のみ
- `/dispatch/*` は `DISPATCH` と `ADMIN` を許可

### 3-3. ページ・API 側の追加制御

- `/cases/*` はミドルウェアで全面保護していないため、ページ・API 側で `getAuthenticatedUser()` と role/team 制御を行います
- EMS の事案系 API は自隊事案のみ参照・更新可能です
- HOSPITAL の要請系 API は自院 target のみ参照・更新可能です
- ADMIN の管理 API は `ADMIN` のみ許可です

## 4. 事案識別仕様

### 4-1. ID の役割

- `case_id`
  - 表示用 ID
  - 通知文言、一覧表示、外部向け参照、運用上の事案番号として利用
- `case_uid`
  - 内部参照用の不変 ID
  - JOIN、更新系、通知 payload、病院要請関連テーブルの内部キーとして利用

### 4-2. 運用ルール

- 内部更新系は `case_uid` を正とする
- 表示とユーザー向け文言は `case_id` を使う
- 過渡互換のため一部 API は `caseRef` を入力名にし、`caseId` を後方互換 alias として受ける

## 5. 主要業務フロー

### 5-1. 指令起票

- `DISPATCH` が `/dispatch/new` または `/dispatch/cases` から事案を起票します
- 起票データは `cases` に保存され、担当救急隊が EMS 側の一覧で参照可能になります

### 5-2. EMS 事案作成・編集

- 画面:
  - `/cases/new`
  - `/cases/[caseId]`
- タブ:
  - 基本情報
  - 要請概要・バイタル
  - 患者サマリー
  - 送信履歴
- 保存先:
  - 構造列は `cases`
  - 詳細フォーム全体は `cases.case_payload` JSONB

### 5-3. EMS 病院検索・受入要請

- 画面: `/hospitals/search`
- 検索方式:
  - 直近検索
  - 市区名検索
  - 個別病院検索
- 送信時の保存:
  - `case_payload.sendHistory`
  - `hospital_requests`
  - `hospital_request_targets`
  - `hospital_request_events`
- 病院向け通知:
  - `request_received`

### 5-4. HOSPITAL 応答

- 画面:
  - `/hospitals/requests`
  - `/hospitals/consults`
- HOSPITAL は target ごとに次を返せます
  - `NEGOTIATING`
  - `ACCEPTABLE`
  - `NOT_ACCEPTABLE`
- 応答時は履歴イベントと通知を生成します

### 5-5. 相談コメント

- HOSPITAL -> EMS
  - `PATCH /api/hospitals/requests/[targetId]/consult`
  - `hospital_request_events` に相談イベントを記録
  - EMS 通知 `consult_status_changed` を生成
- EMS -> HOSPITAL
  - `PATCH /api/cases/consults/[targetId]`
  - `hospital_request_events` に返信イベントを記録
  - HOSPITAL 通知 `consult_comment_from_ems` を生成

### 5-6. EMS 搬送判断

- `ACCEPTABLE` target に対して EMS が搬送判断を行います
- 正規更新 API:
  - `PATCH /api/cases/send-history/[id]/status`
- 互換 API:
  - `PATCH /api/cases/send-history`
  - body は `caseRef` を正、`caseId` は後方互換
- 結果:
  - `TRANSPORT_DECIDED` または `TRANSPORT_DECLINED`
  - `TRANSPORT_DECIDED` 時は `hospital_patients` を upsert
  - 決定病院へ通知、他 target は自動辞退処理

## 6. ステータス仕様

利用ステータス:

- `UNREAD`
- `READ`
- `NEGOTIATING`
- `ACCEPTABLE`
- `NOT_ACCEPTABLE`
- `TRANSPORT_DECIDED`
- `TRANSPORT_DECLINED`

### 6-1. 病院側遷移

- `UNREAD` -> `READ` / `NEGOTIATING` / `ACCEPTABLE` / `NOT_ACCEPTABLE`
- `READ` -> `NEGOTIATING` / `ACCEPTABLE` / `NOT_ACCEPTABLE`
- `NEGOTIATING` -> `ACCEPTABLE` / `NOT_ACCEPTABLE`
- `ACCEPTABLE` -> `NEGOTIATING` / `NOT_ACCEPTABLE`
- `NOT_ACCEPTABLE` -> `NEGOTIATING` / `ACCEPTABLE`
- `TRANSPORT_DECIDED` -> `NEGOTIATING` / `ACCEPTABLE` / `NOT_ACCEPTABLE`
- `TRANSPORT_DECLINED` -> 遷移不可

### 6-2. EMS 側遷移

- `NEGOTIATING` -> `TRANSPORT_DECLINED`
- `ACCEPTABLE` -> `TRANSPORT_DECIDED` / `TRANSPORT_DECLINED`

### 6-3. 代表ラベル

- `UNREAD`: 未読
- `READ`: 既読
- `NEGOTIATING`: 要相談
- `ACCEPTABLE`: 受入可能
- `NOT_ACCEPTABLE`: 受入不可
- `TRANSPORT_DECIDED`: 搬送決定
- `TRANSPORT_DECLINED`: 搬送辞退

## 7. ロール別画面仕様

### 7-1. EMS

主要ルート:

- `/paramedics`
- `/cases/new`
- `/cases/[caseId]`
- `/cases/search`
- `/hospitals/search`
- `/hospitals/request/confirm`
- `/hospitals/request/completed`
- `/settings`
- `/settings/device`
- `/settings/display`
- `/settings/input`
- `/settings/notifications`
- `/settings/sync`
- `/settings/offline-queue`
- `/settings/support`

主要 UI:

- EMS ホームダッシュボード
- 事案フォーム
- 事案一覧の親子テーブル表示
- 送信履歴と選定履歴
- 相談チャットモーダル
- オフラインバナーと未送信キュー確認

### 7-2. HOSPITAL

主要ルート:

- `/hospitals`
- `/hospitals/requests`
- `/hospitals/requests/[targetId]`
- `/hospitals/consults`
- `/hospitals/patients`
- `/hospitals/patients/[targetId]`
- `/hospitals/declined`
- `/hospitals/medical-info`
- `/hp/settings`
- `/hp/settings/facility`
- `/hp/settings/operations`
- `/hp/settings/notifications`
- `/hp/settings/display`
- `/hp/settings/support`

主要 UI:

- 受入要請一覧
- 患者サマリー詳細モーダル
- 相談事案一覧と相談チャット
- 搬送患者一覧
- 診療科修正
- 診療情報入力

### 7-3. DISPATCH

主要ルート:

- `/dispatch`
- `/dispatch/new`
- `/dispatch/cases`

主要 UI:

- 指令トップ
- 指令起票フォーム
- 指令事案一覧

### 7-4. ADMIN

主要ルート:

- `/admin`
- `/admin/settings`
- `/admin/cases`
- `/admin/hospitals`
- `/admin/ambulance-teams`
- `/admin/users`
- `/admin/devices`
- `/admin/orgs`
- `/admin/logs`

主要 UI:

- 病院管理
- 救急隊管理
- ユーザー管理
- 端末管理
- 組織並び順・有効無効管理
- 監査ログ参照
- 事案一覧と事案詳細参照

## 8. API 仕様

### 8-1. 認証・通知

- `GET/POST /api/auth/[...nextauth]`
- `GET /api/notifications`
- `PATCH /api/notifications`

### 8-2. 事案・EMS

- `POST /api/cases`
- `GET /api/cases/search`
- `GET /api/cases/search/[caseId]`
- `GET /api/cases/send-history`
- `POST /api/cases/send-history`
- `PATCH /api/cases/send-history`
- `PATCH /api/cases/send-history/[id]/status`
- `GET /api/cases/consults`
- `GET /api/cases/consults/[targetId]`
- `PATCH /api/cases/consults/[targetId]`
- `PATCH /api/paramedics/requests/[targetId]/decision`
- `GET /api/ems/operator`

### 8-3. 指令

- `GET /api/dispatch/cases`

### 8-4. 病院

- `GET /api/hospitals/suggest`
- `POST /api/hospitals/recent-search`
- `GET /api/hospitals/requests`
- `GET /api/hospitals/requests/[targetId]`
- `PATCH /api/hospitals/requests/[targetId]/status`
- `PATCH /api/hospitals/requests/[targetId]/consult`
- `GET /api/hospitals/requests/[targetId]/consult`
- `PATCH /api/hospitals/requests/[targetId]/departments`
- `GET /api/hospitals/medical-info`
- `GET /api/hospitals/medical-info/[departmentId]`

### 8-5. EMS 設定

- `GET/PATCH /api/settings/ambulance/display`
- `GET/PATCH /api/settings/ambulance/input`
- `GET/PATCH /api/settings/ambulance/notifications`
- `GET /api/settings/ambulance/sync`
- `POST /api/settings/ambulance/sync/run`
- `POST /api/settings/ambulance/sync/retry`

### 8-6. HOSPITAL 設定

- `GET/PATCH /api/settings/hospital/dashboard`
- `GET/PATCH /api/settings/hospital/display`
- `GET/PATCH /api/settings/hospital/facility`
- `GET/PATCH /api/settings/hospital/notifications`
- `GET/PATCH /api/settings/hospital/operations`

### 8-7. ADMIN

- `GET /api/admin/cases`
- `GET /api/admin/cases/[caseId]`
- `GET/POST /api/admin/hospitals`
- `PATCH /api/admin/hospitals/[id]`
- `GET /api/admin/hospitals/[id]/logs`
- `GET/POST /api/admin/ambulance-teams`
- `PATCH /api/admin/ambulance-teams/[id]`
- `GET /api/admin/ambulance-teams/[id]/logs`
- `GET /api/admin/users`
- `PATCH /api/admin/users/[id]`
- `GET /api/admin/users/[id]/logs`
- `GET /api/admin/devices`
- `PATCH /api/admin/devices/[id]`
- `GET /api/admin/devices/[id]/logs`
- `GET /api/admin/orgs`
- `GET/PATCH /api/admin/orgs/[type]/[id]`
- `GET /api/admin/logs`

## 9. データモデル仕様

### 9-1. 基本テーブル

- `cases`
  - 事案本体
  - `case_id`, `case_uid`, team, dispatch 情報、患者基本列、`case_payload`
- `hospitals`
- `emergency_teams`
- `medical_departments`
- `users`

### 9-2. 病院要請系テーブル

- `hospital_requests`
  - request 単位ヘッダ
  - `case_id` と `case_uid` の両方を保持
  - `case_uid` は `NOT NULL`
- `hospital_request_targets`
  - 病院単位の current status
  - 診療科、距離、開封・応答・決定時刻を保持
- `hospital_request_events`
  - 送信、病院応答、相談返信、搬送判断の履歴
- `hospital_patients`
  - 搬送決定済み患者一覧
  - `case_uid` は `NOT NULL`
- `notifications`
  - 通知本体
  - `case_id` / `case_uid` の同時整合チェックを持つ

### 9-3. 設定・監査・同期

- `ems_user_settings`
- `hospital_settings`
- `ems_sync_state`
- `audit_logs`

## 10. 通知仕様

### 10-1. 通知 audience

- `EMS`
- `HOSPITAL`

### 10-2. 代表 kind

- `request_received`
- `consult_status_changed`
- `hospital_status_changed`
- `consult_comment_from_ems`
- `transport_decided`
- `transport_declined`

### 10-3. 通知 payload ルール

- `caseId` と `caseUid` を併載する
- `menuKey` / `tabKey` で画面導線を表現する
- 未読管理は `notifications.is_read` で扱う
- 取得はポーリングベースで、リアルタイム push ではない


### 10-4. 運用通知ルール

- HOSPITAL の `request_repeat`
  - `UNREAD` / `READ` の target が 5 分以上未確認のとき生成
  - `severity = warning`
- HOSPITAL の `reply_delay`
  - `UNREAD` / `READ` の target が `replyDelayMinutes` 以上未応答のとき生成
  - `severity = critical`
- EMS の `unread_repeat`
  - `consult_status_changed` / `hospital_status_changed` が 5 分以上未確認のとき生成
  - `severity = warning`
- 同一 bucket での再生成は `dedupe_key` により抑止する
- current phase の重要通知確認は `PATCH /api/notifications` の `ack` で行う

## 11. EMS オフライン仕様

### 11-1. 目的

- 電波不安定時でも EMS の最低限の作業継続を支える

### 11-2. 実装済み内容

- IndexedDB ベースのオフライン保存
- 共通オフラインバナー
- オフラインキュー閲覧画面
- 相談返信のキュー化
- 病院検索結果キャッシュと簡易検索
- 受入要請送信のキュー化
- ローカル下書き復元

### 11-3. 制限

- 搬送決定 / 搬送辞退はオフラインで実行不可
- 完全な自動競合解決は未完了
- 同期は一部手動・再送ベース

## 12. 設定仕様

### 12-1. EMS 設定

- 表示設定
- 入力補助設定
- 通知設定
- 同期状態・再送
- 端末設定

### 12-2. HOSPITAL 設定

- 施設情報
- 運用テンプレート
- 通知設定
- 表示設定

### 12-3. 保存方式

- role ごとの settings API 経由で DB 永続化
- 一部は即時保存、一部は確認ダイアログ経由

## 13. スクリプト仕様

### 13-1. 初期化・セットアップ

- `scripts/setup_auth.sql`
- `scripts/setup_departments.sql`
- `scripts/setup_hospital_requests.sql`

### 13-2. シード・投入

- `scripts/seed_neon.sql`
- `scripts/seed_hospital_departments_demo.sql`
- `scripts/seed_auth_users.js`
- `scripts/load_neon_seed.py`

### 13-3. 運用補助

- `scripts/execute_sql.js`
- `scripts/backfill_hospital_requests.js`
- `scripts/realign_ems_users.js`
- `scripts/replace_ambulance_teams.js`
- `scripts/renumber_ambulance_team_ids.js`
- `scripts/renumber_ambulance_team_codes.js`

## 14. テスト・検証仕様

### 14-1. 標準コマンド

- `npm run lint`
- `npm run typecheck`
- `npm run check`
- `npm run check:full`
- `npm run test:e2e`

### 14-2. カバー済み代表 E2E

- dispatch 起票 -> EMS 一覧反映
- role 別 API アクセス制御
- HOSPITAL 相談コメント -> EMS 通知
- HOSPITAL 要請詳細表示
- EMS `caseRef` 指定の send-history -> 搬送決定 -> HOSPITAL 患者一覧反映

## 15. 運用上の注意点

- 旧 `README.md` や旧 system spec の一部は現行実装より古い記述を含みます
- `cases` 系はミドルウェア全面保護ではなく、ページ/API 側の認可に依存する箇所があります
- 通知はリアルタイム push ではなくポーリングです
- オフライン基盤は段階実装です
- Git 上で一部ファイルは CRLF/LF 警告が出るため、改行方針の一括整理は別作業で扱います

## 16. 参照ドキュメント

- `docs/README.md`
- `docs/IMPLEMENTATION_GUIDE.md`
- `docs/legacy/system-spec-2026-03-06.md`
- `docs/legacy/project-summary-2026-03-11.md`
- `docs/UI_RULES.md`
- `docs/plans/`