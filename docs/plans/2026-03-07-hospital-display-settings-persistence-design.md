# Hospital Display Settings Persistence Design

**Date:** 2026-03-07

## Scope
- HOSPITAL 側表示設定を永続化する。
- 一覧表示密度と初期ソートを保存対象とする。
- `hospital_settings` を拡張し、`GET/PATCH /api/settings/hospital/display` を実装する。
- `/hp/settings/display` を API 接続し、即時保存を導入する。

## Background
- HOSPITAL 側では `facility`、`operations`、`notifications` の一部永続化まで完了している。
- `display` は軽量設定であり、仕様上は即時保存に向いている。
- 病院ごとの設定は既存 `hospital_settings` に集約しており、表示設定も同じ流れで扱うのが自然である。

## Goals
- 病院側が表示密度と初期ソートを保存し、再読込後も保持されるようにする。
- API は `HOSPITAL` のみ許可し、病院スコープはログインユーザーから決定する。

## Non-Goals
- EMS 側表示設定の追加変更
- HOSPITAL 側の初期フィルタ保存
- 一覧側実画面への表示設定反映

## Data Model
### `hospital_settings` add columns
- `display_density TEXT NOT NULL DEFAULT 'standard'`
- `default_sort TEXT NOT NULL DEFAULT 'updated'`

Validation:
- `display_density IN ('standard', 'comfortable', 'compact')`
- `default_sort IN ('updated', 'received', 'priority')`

## API Design
### Display
- `GET /api/settings/hospital/display`
- `PATCH /api/settings/hospital/display`

Response / Payload:
- `displayDensity`
- `defaultSort`

## Authorization
- `HOSPITAL` のみ許可
- `EMS` / `ADMIN` は `403`
- `hospital_id` はログインユーザーから決定

## Validation
- `displayDensity` は `standard | comfortable | compact`
- `defaultSort` は `updated | received | priority`

## UI Behavior
- `/hp/settings/display` は server page を維持
- 編集部だけ client form に切り出す
- select 変更時に即時保存
- `saving / saved / error`

## React / Next.js Considerations
- 初期値は server page で取得
- client form に必要最小限の初期値だけ渡す
- route handler は薄く保ち、validation/update は `lib` に寄せる

## Testing and Validation
- HOSPITAL ユーザーで `GET` 時に保存済み値または初期値が返る
- `PATCH` 後に `GET` すると値が反映される
- `EMS` / `ADMIN` は `403`
- `npm.cmd run lint`
- `npm.cmd run build`

## Rollout Sequence
1. `hospital_settings` 表示列追加
2. repository / validation 拡張
3. 表示 API 実装
4. `/hp/settings/display` API 接続
5. lint/build と DB 保存確認
