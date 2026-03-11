# medical-support-apps 現況まとめ

最終更新: 2026-03-11

このドキュメントは、`medical-support-apps` の現時点の実装内容をコードベースから要約したスナップショットです。  
既存の `README.md`、`docs/system-spec-2026-03-06.md`、`docs/IMPLEMENTATION_GUIDE.md` を補完し、現在の仕様と構成を 1 ファイルで把握できるようにしています。

## 1. プロジェクト概要

- 救急隊（EMS）による事案作成、病院検索、受入要請送信を支援する Next.js アプリ
- 病院側が受入要請を確認し、受入可否や相談コメントを返し、搬送決定後の患者一覧を管理できる構成
- 管理者向けに病院、救急隊、ユーザー、端末、監査ログなどの管理 UI / API を持つ
- 認証は `next-auth` の Credentials Provider を使用し、ロールは `EMS` / `HOSPITAL` / `ADMIN`

## 2. 技術スタック

- Next.js 16.1.6（App Router）
- React 19.2.3
- TypeScript 5
- PostgreSQL（Neon 想定）
- `pg`
- NextAuth.js v5 beta
- Playwright
- Tailwind CSS v4

## 3. ロールとアクセス制御

### 3-1. ログインと遷移

- `/login` で `username + password` 認証
- ログイン後の既定遷移先
  - `EMS` -> `/paramedics`
  - `HOSPITAL` -> `/hospitals`
  - `ADMIN` -> `/admin`
- `/` は未ログイン時 `/login`、ログイン済み時はロール別トップへリダイレクト

### 3-2. 保護ルート

`proxy.ts` で以下を保護:

- `/settings/*` は `EMS` のみ
- `/hp/settings/*` は `HOSPITAL` のみ
- `/paramedics/*` は `EMS` のみ
- `/hospitals/*` は基本 `HOSPITAL`、ただし `EMS` は以下のみ許可
  - `/hospitals/search`
  - `/hospitals/request/confirm`
  - `/hospitals/request/completed`
- `/admin/*` は `ADMIN` のみ

補足:

- `/cases/*` は `proxy.ts` の保護対象外
- ただし `app/cases/new/page.tsx` などのページ内で `getAuthenticatedUser()` を使い、`EMS` 以外は `notFound()` とする実装が入っている

## 4. 主要画面

### 4-1. EMS

- `/paramedics`
  - EMS ホーム
  - サイドバー付きポータルシェル
- `/cases/new`
  - 新規事案作成
  - タブ: `基本情報` / `要請概要・バイタル` / `患者サマリー` / `送信履歴`
- `/cases/[caseId]`
  - 既存事案の編集 / 閲覧
- `/cases/search`
  - 事案一覧
  - 自隊の事案のみ表示
  - 行展開で病院要請ターゲット一覧を表示
  - 相談チャット、搬送決定、搬送辞退に対応
- `/hospitals/search`
  - 病院検索
  - 検索条件、検索結果、送信導線を持つ
- `/hospitals/request/confirm`
  - 受入要請送信前の確認画面
- `/hospitals/request/completed`
  - 送信完了画面
- `/settings`
  - EMS 設定トップ
- `/settings/notifications`
  - 通知設定
- `/settings/display`
  - 表示設定
- `/settings/input`
  - 入力補助設定
- `/settings/sync`
  - 手動同期 / 再送
- `/settings/device`
  - 端末設定 UI
- `/settings/support`
  - サポート画面

### 4-2. HOSPITAL

- `/hospitals`
  - 病院ホーム
- `/hospitals/requests`
  - 受入要請一覧
- `/hospitals/requests/[targetId]`
  - 要請詳細
- `/hospitals/patients`
  - 搬送患者一覧
- `/hospitals/patients/[targetId]`
  - 搬送患者詳細
- `/hospitals/consults`
  - 要相談事案一覧と相談 UI
- `/hospitals/declined`
  - 搬送辞退一覧
- `/hospitals/medical-info`
  - 診療情報入力画面
- `/hp/settings`
  - 病院設定トップ
- `/hp/settings/facility`
  - 施設情報設定
- `/hp/settings/operations`
  - 相談 / 辞退テンプレート設定
- `/hp/settings/notifications`
  - 通知設定
- `/hp/settings/display`
  - 一覧表示設定
- `/hp/settings/support`
  - サポート画面

### 4-3. ADMIN

- `/admin`
  - 管理トップ
- `/admin/settings`
  - 管理設定トップ
- `/admin/hospitals`
  - 病院管理
- `/admin/ambulance-teams`
  - 救急隊管理
- `/admin/users`
  - ユーザー管理
- `/admin/devices`
  - 端末管理
- `/admin/orgs`
  - 組織統合 / 並び順 / 有効無効管理
- `/admin/logs`
  - 監査ログ閲覧
- `/admin/cases`
  - 事案一覧と履歴参照

## 5. コア業務フロー

### 5-1. 事案作成

- EMS が事案を作成 / 更新
- `cases` テーブルに基本列を保存
- 詳細フォーム全体は `case_payload` JSONB に保持
- 作成 / 更新 API は `POST /api/cases`

### 5-2. 病院検索と受入要請

- EMS が病院検索で候補病院と診療科目を選択
- `POST /api/cases/send-history` で送信履歴を `case_payload.sendHistory` に保存
- 同時に `hospital_requests` / `hospital_request_targets` / `hospital_request_events` へ正規化保存
- 病院向け通知 `request_received` を `notifications` に作成

### 5-3. 病院応答

- 病院は要請詳細から `READ` / `NEGOTIATING` / `ACCEPTABLE` / `NOT_ACCEPTABLE` に更新
- 更新時にイベント履歴を記録
- EMS 向け通知を生成
- 状態更新ロジックは `lib/sendHistoryStatusRepository.ts` に集約

### 5-4. 相談チャット

- 病院が `NEGOTIATING` でコメント送信
- EMS が相談返信可能
- 双方のコメントは `hospital_request_events` に保存
- 相談コメント受信時に通知を生成

### 5-5. 搬送判断

- EMS は `ACCEPTABLE` 状態に対して `TRANSPORT_DECIDED` または `TRANSPORT_DECLINED` を送信可能
- `TRANSPORT_DECIDED` 時は `hospital_patients` に患者レコードを作成 / 更新
- 病院向けに搬送決定または辞退通知を作成

## 6. ステータス仕様

利用ステータス:

- `UNREAD`
- `READ`
- `NEGOTIATING`
- `ACCEPTABLE`
- `NOT_ACCEPTABLE`
- `TRANSPORT_DECIDED`
- `TRANSPORT_DECLINED`

遷移ルールの実装:

- 病院側
  - `UNREAD` -> `READ` / `NEGOTIATING` / `ACCEPTABLE` / `NOT_ACCEPTABLE`
  - `READ` -> `NEGOTIATING` / `ACCEPTABLE` / `NOT_ACCEPTABLE`
  - `NEGOTIATING` -> `ACCEPTABLE` / `NOT_ACCEPTABLE`
  - `ACCEPTABLE` -> `NEGOTIATING` / `NOT_ACCEPTABLE`
  - `NOT_ACCEPTABLE` -> `NEGOTIATING` / `ACCEPTABLE`
  - `TRANSPORT_DECIDED` -> `NEGOTIATING` / `ACCEPTABLE` / `NOT_ACCEPTABLE`
- EMS側
  - `NEGOTIATING` -> `TRANSPORT_DECLINED`
  - `ACCEPTABLE` -> `TRANSPORT_DECIDED` / `TRANSPORT_DECLINED`

## 7. API 一覧

### 7-1. 認証 / 共通

- `GET/POST /api/auth/[...nextauth]`
- `GET /api/notifications`
- `PATCH /api/notifications`

### 7-2. EMS / 事案

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

### 7-3. 病院検索 / 受入要請

- `GET /api/hospitals/suggest`
- `POST /api/hospitals/recent-search`
- `GET /api/hospitals/requests`
- `GET /api/hospitals/requests/[targetId]`
- `PATCH /api/hospitals/requests/[targetId]/status`
- `PATCH /api/hospitals/requests/[targetId]/departments`
- `GET /api/hospitals/requests/[targetId]/consult`

### 7-4. EMS 設定

- `GET/PATCH /api/settings/ambulance/notifications`
- `GET/PATCH /api/settings/ambulance/display`
- `GET/PATCH /api/settings/ambulance/input`
- `GET /api/settings/ambulance/sync`
- `POST /api/settings/ambulance/sync/run`
- `POST /api/settings/ambulance/sync/retry`
- `GET /api/ems/operator`

### 7-5. 病院設定

- `GET/PATCH /api/settings/hospital/facility`
- `GET/PATCH /api/settings/hospital/operations`
- `GET/PATCH /api/settings/hospital/notifications`
- `GET/PATCH /api/settings/hospital/display`

### 7-6. 管理者 API

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
- `GET /api/admin/orgs/[type]/[id]`
- `PATCH /api/admin/orgs/[type]/[id]`
- `GET /api/admin/logs`

## 8. 主なDBテーブル

### 8-1. 既存業務データ

- `cases`
  - 事案本体
  - `case_payload JSONB` でフォーム詳細を保持
- `hospitals`
- `emergency_teams`
- `medical_departments`
- `hospital_departments`
- `users`

### 8-2. 受入要請 / 通知

- `hospital_requests`
  - 事案単位の送信ヘッダ
- `hospital_request_targets`
  - 病院別ステータス、診療科目、距離、更新者
- `hospital_request_events`
  - 送信、閲覧、病院応答、EMS相談返信、EMS搬送判断の履歴
- `hospital_patients`
  - 搬送決定済み患者
- `notifications`
  - ロール / 組織 / ユーザー単位の通知と既読状態

### 8-3. 設定 / 監査

- `ems_user_settings`
  - EMS 通知、表示、入力補助設定
- `hospital_settings`
  - 病院施設、運用テンプレート、通知、表示設定
- `ems_sync_state`
  - 手動同期 / 再送の状態
- `audit_logs`
  - ステータス更新や管理操作の監査ログ

## 9. 設定項目の実装状況

### 9-1. EMS

永続化済み:

- 通知設定
  - 新規応答通知
  - 相談通知
  - 受入可通知
  - 受入不可通知
  - 再通知
- 表示設定
  - 文字サイズ
  - 表示密度
- 入力補助
  - テンキー自動表示
  - フォーカス移動
  - バイタル次項目移動
  - 必須入力警告
- 同期状態
  - 最終同期日時
  - 再送日時
  - 成功 / 失敗状態
  - 保留件数

### 9-2. HOSPITAL

永続化済み:

- 施設設定
  - 表示連絡先
  - 施設メモ
- 運用設定
  - 相談テンプレート
  - 辞退テンプレート
- 通知設定
  - 新規要請
  - 返信到着
  - 搬送決定
  - 搬送辞退
  - 再通知
  - 返信遅延通知
  - 遅延しきい値
- 表示設定
  - 表示密度
  - 初期ソート

## 10. スクリプト

### 10-1. 初期構築 / テーブル作成

- `scripts/setup_auth.sql`
- `scripts/setup_departments.sql`
- `scripts/setup_hospital_requests.sql`

### 10-2. シード / データ投入

- `scripts/seed_neon.sql`
- `scripts/seed_hospital_departments_demo.sql`
- `scripts/seed_auth_users.js`
- `scripts/load_neon_seed.py`
- `scripts/ambulance_teams_dataset.js`

### 10-3. 補助 / 修復

- `scripts/execute_sql.js`
- `scripts/backfill_hospital_requests.js`
- `scripts/realign_ems_users.js`
- `scripts/replace_ambulance_teams.js`
- `scripts/renumber_ambulance_team_ids.js`
- `scripts/renumber_ambulance_team_codes.js`

## 11. テスト

E2E テスト実装済み:

- `e2e/tests/hospital-flows.spec.ts`
  - 病院側の相談コメント送信
  - 要請詳細から受入可送信
- `e2e/tests/cases-access.spec.ts`
  - EMS は自隊事案のみ閲覧可能
  - ADMIN は全事案を閲覧可能
  - ADMIN の `POST /api/cases` は `403`
- `e2e/tests/admin-cases.spec.ts`
  - 管理画面の事案展開動作
  - 管理者詳細モーダルの表示確認

## 12. 現時点の注意点

- 一部ファイル / 文言で文字化けが残っている
  - 例: `app/layout.tsx` の `metadata`
  - 例: 一部 UI 文言、エラーメッセージ、既存 docs
- `README.md` の説明は現在の実装より古い箇所がある
- `/cases/*` はミドルウェア保護外だが、ページ / API 側でロール確認している
- DB スキーマの一部は API 実行時に `ensure*Schema()` / `ensure*Tables()` で補完される運用
- 通知はポーリングベースで取得しており、リアルタイム push ではない

## 13. 関連ドキュメント

- `README.md`
- `docs/IMPLEMENTATION_GUIDE.md`
- `docs/system-spec-2026-03-06.md`
- `docs/UI_RULES.md`
- `docs/plans/`
