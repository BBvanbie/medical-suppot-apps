# Hospital Operations Settings Persistence Design

**Date:** 2026-03-07

## Scope
- HOSPITAL 側 `operations` のうち、`consultTemplate` と `declineTemplate` を永続化する。
- 既存 `hospital_settings` を拡張し、病院ごとの運用テンプレートを保存する。
- `GET/PATCH /api/settings/hospital/operations` を実装する。
- `/hp/settings/operations` を API 接続し、確認付き保存と差分チェックを導入する。

## Background
- HOSPITAL 側 `facility` の一部永続化は完了しているが、運用テンプレートはまだ UI のみで保存されない。
- 仕様では要相談テンプレートと受入不可テンプレートは確認付き保存が求められる。
- 既に `hospital_settings` が存在するため、病院ごとの設定は同一責務にまとめるのが自然である。

## Goals
- 病院側が運用テンプレート 2 項目を保存し、再読込後も保持されるようにする。
- `facility` と同じ `hospital_settings` に集約し、後続の `notifications` / `display` へ拡張しやすくする。
- API は `HOSPITAL` のみ許可し、病院スコープはログインユーザーから決定する。

## Non-Goals
- `notifications` / `display` の永続化
- ADMIN 側からの運用テンプレ編集
- 監査ログ記録
- テンプレート履歴比較UI

## Data Model
### `hospital_settings` add columns
- `consult_template TEXT NOT NULL DEFAULT ''`
- `decline_template TEXT NOT NULL DEFAULT ''`

既存列:
- `display_contact`
- `facility_note`

## API Design
### Operations
- `GET /api/settings/hospital/operations`
- `PATCH /api/settings/hospital/operations`

Response:
- `consultTemplate`
- `declineTemplate`

PATCH payload:
- `consultTemplate`
- `declineTemplate`

## Authorization
- `HOSPITAL` のみ許可
- `EMS` / `ADMIN` は `403`
- 対象 `hospital_id` はログインユーザーから決定

## Validation
- 空文字可
- 各 1000 文字以内
- 不正 payload は `400`

## UI Behavior
- `/hp/settings/operations` は server page を維持
- 編集部だけ client form に切り出す
- 差分がない場合は保存しない
- 保存前に確認ダイアログ
- 保存中は二重送信防止
- 成功時 `saved`
- 失敗時 `error`

## React / Next.js Considerations
- 初期値は server page で取得
- client form に必要最小限の初期値だけ渡す
- API は route handler で薄く保ち、validation と update は `lib` に寄せる

## Testing and Validation
- HOSPITAL ユーザーで `GET` 時に保存済み値または初期値が返る
- `PATCH` 後に `GET` すると値が反映される
- 差分なしでは保存を抑止する
- `EMS` / `ADMIN` は `403`
- `npm.cmd run lint`
- `npm.cmd run build`

## Rollout Sequence
1. `hospital_settings` スキーマ拡張
2. repository / validation 拡張
3. `operations` API 実装
4. `/hp/settings/operations` API 接続
5. lint/build と DB 保存確認
