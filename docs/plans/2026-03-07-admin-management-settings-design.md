# Admin Management and Settings Foundation Design

**Date:** 2026-03-07

## Scope
- `admin` 向けの管理責務と設定責務をルーティング段階から分離する。
- 初回は `/admin/settings` の入口ページと、`/admin/hospitals`、`/admin/ambulance-teams` の一覧・追加を実装対象にする。
- `ambulance` と `hospital` の設定ページ本体は後続実装とし、今回作る共通UIを土台として再利用できる構造にする。
- API は責務別に分離し、`ADMIN` のみが一覧取得・追加を実行できるようにする。
- 作成系操作は最小監査ログを残せるようにする。

## Background
- 現状の `/settings` は EMS/HOSPITAL 共通の仮ページで、仕様で求めるロール別ページ構成になっていない。
- `/admin` はトップページのみで、病院管理・救急隊管理の専用導線が存在しない。
- 認可は `proxy.ts` で大枠保護されているが、設定/管理の責務分離とエンティティ別APIは未整備である。

## Goals
- `admin` 向け導線を `settings` と `management` に明確分離する。
- 病院管理と救急隊管理を独立ルートで実装し、後続の編集・利用停止・履歴追加に拡張しやすくする。
- UI の共通化は primitive と管理画面部品に限定し、過剰な抽象化を避ける。
- 画面表示制御だけでなく API 側で `ADMIN` 認可を強制する。

## Non-Goals
- `ambulance` 側 `/settings/*` の本実装
- `hospital` 側 `/hp/settings/*` の本実装
- `admin/users`、`admin/devices`、`admin/orgs`、`admin/logs` の本実装
- 病院・救急隊の編集、無効化、履歴表示

## Routing Design
### Admin Settings
- `/admin/settings`
  - 管理者向け設定トップ
  - `system`、`security`、`notifications`、`masters` の入口カードのみ先行実装

### Admin Management
- `/admin/hospitals`
  - 病院一覧
  - 病院追加フォーム
- `/admin/ambulance-teams`
  - 救急隊一覧
  - 救急隊追加フォーム

### Future Role Separation
- EMS は `/settings/*`
- HOSPITAL は `/hp/settings/*`
- ADMIN は `/admin/settings/*` と `/admin/*`

今回の初回実装では、`admin` を `/settings` に入れず、管理者導線を `/admin/*` に閉じる。

## UI Architecture
### Primitive Components
- `SettingPageLayout`
- `SettingCard`
- `SettingSection`
- `SettingActionButton`
- `SettingSaveStatus`
- `ConfirmDialog`

今回は、実際に `/admin/settings`、`/admin/hospitals`、`/admin/ambulance-teams` で使うものだけ作成する。

### Admin Domain Components
- `AdminEntityPage`
  - ページヘッダ、サマリー、一覧セクション、追加セクションを束ねる
- `AdminEntityTable`
  - 病院/救急隊で共通のテーブル骨格
- `AdminEntityCreateForm`
  - 確認付き保存、保存状態表示、エラー表示を持つ共通フォーム骨格

### UX Rules
- 追加操作は確認ダイアログ付き保存
- 保存中は二重送信防止
- 成功時は一覧再取得と成功表示
- 失敗時はインラインエラー表示
- `readOnly` / `hidden` の本格適用は後続ロール画面で行うが、共通UI側で表現可能な設計にしておく

## Data Model
### Existing Tables
- `hospitals`
  - 初回で扱う列: `source_no`, `name`, `municipality`, `address`, `phone`
- `emergency_teams`
  - 初回で扱う列: `team_code`, `team_name`, `division`

### New Table
- `audit_logs`
  - `id BIGSERIAL PRIMARY KEY`
  - `actor_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL`
  - `actor_role TEXT NOT NULL`
  - `action TEXT NOT NULL`
  - `target_type TEXT NOT NULL`
  - `target_id TEXT NOT NULL`
  - `before_json JSONB NULL`
  - `after_json JSONB NULL`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

初回は作成操作のみ監査対象とし、変更前データは `NULL`、変更後データを `after_json` に格納する。

## API Design
### Hospitals
- `GET /api/admin/hospitals`
  - 病院一覧を返す
- `POST /api/admin/hospitals`
  - 病院追加
  - 必須: `sourceNo`, `name`

### Ambulance Teams
- `GET /api/admin/ambulance-teams`
  - 救急隊一覧を返す
- `POST /api/admin/ambulance-teams`
  - 救急隊追加
  - 必須: `teamCode`, `teamName`

### Authorization
- すべて `ADMIN` のみ許可
- `EMS` / `HOSPITAL` は `403`
- `proxy.ts` の `/admin/*` 保護に加え、各 API で `getAuthenticatedUser()` を使って再検証する

### Validation
- 病院:
  - `sourceNo` 必須、数値
  - `name` 必須
  - `sourceNo` 重複禁止
- 救急隊:
  - `teamCode` 必須
  - `teamName` 必須
  - `teamCode` 重複禁止

## Server Structure
- `lib/admin/adminManagementRepository.ts`
  - 一覧取得、重複確認、追加、監査ログ記録を集約
- `lib/admin/adminManagementSchema.ts`
  - `audit_logs` の存在保証
- `lib/admin/adminManagementValidation.ts`
  - 入力正規化とバリデーション

責務を API ルートから分離し、後続の編集APIや他エンティティ追加でも流用しやすくする。

## Navigation Changes
- `admin` 用ナビに以下を追加する
  - `/admin/settings`
  - `/admin/hospitals`
  - `/admin/ambulance-teams`

EMS/HOSPITAL 側ナビの `/settings` は現状維持とし、後続でロール別ページへ差し替える。

## Error Handling
- バリデーションエラーは `400`
- 認可エラーは `403`
- 重複エラーは `409`
- 想定外エラーは `500`
- 画面側では汎用エラー文ではなく、項目または操作単位で理解できる文言を返す

## Testing and Validation
- `ADMIN` で `/admin/hospitals` と `/admin/ambulance-teams` の一覧表示ができる
- `ADMIN` で確認ダイアログ経由の追加が成功する
- 重複登録が拒否される
- `EMS` / `HOSPITAL` は `/admin/*` に遷移できず、API も `403`
- `audit_logs` に作成履歴が記録される

## Rollout Sequence
1. `admin` ルートとナビを追加
2. primitive UI と admin 管理部品を作成
3. 一覧/追加 API を実装
4. `audit_logs` を導入し、作成操作を記録
5. 画面と API を接続し、保存状態を整える
6. 手動確認と型チェックを実施
