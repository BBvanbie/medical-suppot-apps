# Hospital Facility Settings Persistence Design

**Date:** 2026-03-07

## Scope
- HOSPITAL 側 `facility` 設定のうち、`displayContact` と `facilityNote` を永続化する。
- `hospital_settings` を新設し、病院ごとの運用設定を 1:1 で保持する。
- `GET/PATCH /api/settings/hospital/facility` を実装する。
- `/hp/settings/facility` を API 接続し、確認付き保存を導入する。

## Background
- HOSPITAL 設定ルーティングは分離済みだが、`facility` はまだ UI のみで永続化されていない。
- 仕様上、病院名・施設コード・所在地などの正式情報は readOnly に保ち、病院側には一部の運用情報だけ編集を許可する必要がある。
- EMS 側は即時保存だが、HOSPITAL 側の施設情報は確認付き保存が求められる。

## Goals
- 病院側が `displayContact` と `facilityNote` を安全に保存できるようにする。
- `mixed` セクションとして、readOnly 部分と editable 部分を明確に分ける。
- API は `HOSPITAL` のみ許可し、対象病院はログインユーザーから決定する。

## Non-Goals
- `operations`、`notifications`、`display` の永続化
- ADMIN 側管理画面からの病院設定編集
- 監査ログの記録
- 正式施設情報の編集

## Data Model
### New Table: `hospital_settings`
- `hospital_id INTEGER PRIMARY KEY REFERENCES hospitals(id) ON DELETE CASCADE`
- `display_contact TEXT NOT NULL DEFAULT ''`
- `facility_note TEXT NOT NULL DEFAULT ''`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

初回は `facility` で必要な列だけを追加し、後続で `operations` や `notifications` を拡張する。

## API Design
### Facility
- `GET /api/settings/hospital/facility`
- `PATCH /api/settings/hospital/facility`

Response:
- readOnly values
  - `hospitalName`
  - `facilityCode`
  - `address`
  - `primaryPhone`
- editable values
  - `displayContact`
  - `facilityNote`

PATCH payload:
- `displayContact`
- `facilityNote`

## Authorization
- `HOSPITAL` のみ許可
- `EMS` / `ADMIN` は `403`
- 更新対象はログインユーザーの `hospital_id` に固定
- request body で `hospitalId` を受け取らない

## Server Structure
- `lib/hospitalSettingsSchema.ts`
- `lib/hospitalSettingsRepository.ts`
- `lib/hospitalSettingsValidation.ts`

repository は readOnly 情報と editable 情報をまとめて返し、page 側で余計な結合をしない構造にする。

## UI Behavior
- `/hp/settings/facility` は server page のまま維持
- editable 部分だけ client form に切り出す
- 変更後、確認ダイアログを出す
- 保存中は二重送信防止
- 成功時は `saved`
- 失敗時は `error`

## React / Next.js Considerations
- 初期値は server page で取得し、client form に serializable な初期データだけ渡す
- route handler は薄く保ち、validation と upsert は `lib` に寄せる
- readOnly 情報は client state に持たず、server render で十分

## Error Handling
- 未認証: `401`
- 権限不足: `403`
- バリデーションエラー: `400`
- 想定外エラー: `500`

## Testing and Validation
- HOSPITAL ユーザーで `GET` 時に readOnly 情報と editable 情報が返る
- `PATCH` 後に `GET` すると反映される
- 確認ダイアログを経由して保存できる
- `EMS` / `ADMIN` は `403`
- `npm.cmd run lint`
- `npm.cmd run build`

## Rollout Sequence
1. `hospital_settings` と repository/validation を追加
2. `facility` API を実装
3. `/hp/settings/facility` を API 接続し、確認付き保存を実装
4. lint/build と DB 保存確認
