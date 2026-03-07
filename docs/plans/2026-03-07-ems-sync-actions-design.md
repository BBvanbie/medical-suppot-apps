# EMS Sync Actions Design

**Date:** 2026-03-07

## Scope
- EMS 側 `/settings/sync` の `手動同期` と `未送信データ再送` を実行可能にする。
- 同期状態を保持する `ems_sync_state` を新設する。
- `GET /api/settings/ambulance/sync`
- `POST /api/settings/ambulance/sync/run`
- `POST /api/settings/ambulance/sync/retry`
  を実装する。

## Background
- EMS 側の通知・表示・入力補助は永続化済みだが、`sync` はまだ UI だけで実処理がない。
- 仕様上、同期は確認不要の即時実行系である。
- まずは実行要求と状態更新の土台を作り、後続で本物の未送信件数計算や業務連携を足せる構造にする必要がある。

## Goals
- EMS ユーザーが `/settings/sync` から同期実行と再送実行を行えるようにする。
- 最新実行状態を画面に表示できるようにする。
- API は `EMS` のみ許可し、対象ユーザーはログインユーザーから決定する。

## Non-Goals
- 実際の送信履歴テーブルや事案送信との本格連携
- 同期ジョブキュー化
- Push 通知やバックグラウンド実行

## Data Model
### New Table: `ems_sync_state`
- `user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE`
- `last_sync_at TIMESTAMPTZ NULL`
- `last_retry_at TIMESTAMPTZ NULL`
- `last_sync_status TEXT NOT NULL DEFAULT 'idle'`
- `last_retry_status TEXT NOT NULL DEFAULT 'idle'`
- `pending_count INTEGER NOT NULL DEFAULT 0`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Validation:
- `last_sync_status IN ('idle', 'success', 'error')`
- `last_retry_status IN ('idle', 'success', 'error')`

## API Design
### Sync State
- `GET /api/settings/ambulance/sync`

Response:
- `connectionStatus`
- `lastSyncAt`
- `lastRetryAt`
- `lastSyncStatus`
- `lastRetryStatus`
- `pendingCount`

### Run Sync
- `POST /api/settings/ambulance/sync/run`

Behavior:
- 現時点では最小実装として成功レスポンスを返し、`last_sync_at` と `last_sync_status` を更新する

### Retry Pending
- `POST /api/settings/ambulance/sync/retry`

Behavior:
- 現時点では最小実装として成功レスポンスを返し、`last_retry_at` と `last_retry_status` を更新する
- `pending_count` は当面 0 に戻す

## Authorization
- `EMS` のみ許可
- `HOSPITAL` / `ADMIN` は `403`
- `user_id` はログインユーザーから決定

## UI Behavior
- `/settings/sync` は server page を維持
- 実行部分だけ client form に切り出す
- ボタン押下で API 実行
- 実行中はボタン disable
- 実行後は状態表示を更新
- `saving / saved / error` に相当する実行状態を表示

## React / Next.js Considerations
- 初期状態は server page で取得
- client form に serializable な状態だけ渡す
- route handler は薄く、状態更新ロジックは `lib` に寄せる

## Testing and Validation
- EMS ユーザーで同期状態取得ができる
- `run` 実行で `last_sync_at` / `last_sync_status` が更新される
- `retry` 実行で `last_retry_at` / `last_retry_status` が更新される
- `HOSPITAL` / `ADMIN` は `403`
- `npm.cmd run lint`
- `npm.cmd run build`

## Rollout Sequence
1. `ems_sync_state` 追加
2. repository / schema 実装
3. sync API 実装
4. `/settings/sync` API 接続
5. lint/build と DB 状態更新確認
