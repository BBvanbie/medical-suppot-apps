# EMS Settings Persistence Design

**Date:** 2026-03-07

## Scope
- EMS 側の通知設定、表示設定、入力補助設定を永続化する。
- `ems_user_settings` を新設し、救急隊ユーザーごとの設定を 1:1 で保持する。
- 設定APIは責務別に分け、即時保存前提で `GET/PATCH` を実装する。
- UI は `/settings/notifications`、`/settings/display`、`/settings/input` を API 接続し、保存状態表示を入れる。

## Background
- EMS/HOSPITAL の設定ルーティング分離は済んでいるが、現在の EMS 設定は UI のみで永続化されていない。
- 仕様では EMS 側の通知・表示・入力補助は軽量設定として即時保存が求められる。
- 単一 `/api/settings` ではなく責務別 API に分ける必要がある。

## Goals
- EMS ユーザーが自身の設定を変更し、再読込後も保持されるようにする。
- API は `EMS` のみが自分自身の設定を扱える構造にする。
- デフォルト値、upsert、バリデーションをサーバー側で統一管理する。
- UI 側で `saving / saved / error` を即時に分かる形で表示する。

## Non-Goals
- HOSPITAL 側設定の永続化
- ADMIN 側設定の永続化
- EMS の同期再試行 API
- 監査ログへの設定変更記録
- 複数端末競合の解消や履歴管理

## Data Model
### New Table: `ems_user_settings`
- `user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE`
- `notify_new_response BOOLEAN NOT NULL DEFAULT TRUE`
- `notify_consult BOOLEAN NOT NULL DEFAULT TRUE`
- `notify_accepted BOOLEAN NOT NULL DEFAULT TRUE`
- `notify_declined BOOLEAN NOT NULL DEFAULT FALSE`
- `notify_repeat BOOLEAN NOT NULL DEFAULT TRUE`
- `display_text_size TEXT NOT NULL DEFAULT 'standard'`
- `display_density TEXT NOT NULL DEFAULT 'standard'`
- `input_auto_tenkey BOOLEAN NOT NULL DEFAULT TRUE`
- `input_auto_focus BOOLEAN NOT NULL DEFAULT TRUE`
- `input_vitals_next BOOLEAN NOT NULL DEFAULT TRUE`
- `input_required_alert BOOLEAN NOT NULL DEFAULT TRUE`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

### Validation Rules
- `display_text_size` は `standard | large | xlarge`
- `display_density` は `standard | comfortable | compact`
- それ以外は boolean

## API Design
### Notifications
- `GET /api/settings/ambulance/notifications`
- `PATCH /api/settings/ambulance/notifications`

Payload:
- `notifyNewResponse`
- `notifyConsult`
- `notifyAccepted`
- `notifyDeclined`
- `notifyRepeat`

### Display
- `GET /api/settings/ambulance/display`
- `PATCH /api/settings/ambulance/display`

Payload:
- `textSize`
- `density`

### Input
- `GET /api/settings/ambulance/input`
- `PATCH /api/settings/ambulance/input`

Payload:
- `autoTenkey`
- `autoFocus`
- `vitalsNext`
- `requiredAlert`

## Authorization
- すべて `EMS` のみ許可
- `HOSPITAL` / `ADMIN` は `403`
- `user_id` は常にログインユーザーから決定する
- request body から user scope を受け取らない

## Server Structure
- `lib/emsSettingsSchema.ts`
  - テーブル存在保証
- `lib/emsSettingsRepository.ts`
  - デフォルト値、取得、upsert
- `lib/emsSettingsValidation.ts`
  - payload validation

## UI Behavior
### Notifications
- トグル変更時に即時保存
- 保存状態をセクション上部に表示

### Display
- select 変更時に即時保存
- 再描画で前回値を反映

### Input
- トグル変更時に即時保存
- 保存エラー時は直近のUI状態を維持しつつ、エラーメッセージを表示

## React / Next.js Considerations
- 初期値取得は route handler 経由の client fetch とする
- 設定画面自体は既存 server page のまま維持し、操作部だけ client component に切り出す
- client component には必要最小限の serializable な初期データだけ渡す
- 変更処理は重くないため route handler + fetch で十分

## Error Handling
- 未認証: `401`
- 権限不足: `403`
- バリデーションエラー: `400`
- 想定外エラー: `500`
- UI では保存失敗時にセクション単位で原因を表示する

## Testing and Validation
- EMS ユーザーで `GET` 時にデフォルト値または保存済み値が返る
- `PATCH` 後に `GET` すると反映される
- `HOSPITAL` / `ADMIN` は各 API で `403`
- `npm.cmd run lint`
- `npm.cmd run build`

## Rollout Sequence
1. `ems_user_settings` と repository/validation を追加
2. 設定 API 3 系統を実装
3. EMS 設定画面の通知/表示/入力補助を client component 化して API 接続
4. lint/build と DB 保存確認
