# Case Identity Design

**Date:** 2026-03-24

## Goal

事案の内部識別子と外部表示用の事案番号を分離し、将来の外部連携でも安定して参照できるようにする。

## Scope

- `cases` に内部用の不変 ID を追加する
- `emergency_teams` に表示用事案番号の採番コードを追加する
- `DISPATCH` の新規採番を `YYYYMMDD-隊コード-連番` へ切り替える
- 既存の `case_id` 依存コードを壊さず段階導入できる形にする

## Non-Goals

- 既存の全 API / 全 JOIN を今回中に `case_uid` ベースへ全面移行すること
- 病院要請、通知、検索、詳細ルーティングの URL 体系を今回中に変更すること
- 外部連携 API 自体を今回追加すること

## Current State

- `cases.case_id` が表示用番号と内部参照キーを兼ねている
- `DISPATCH` の採番は日付単位 lock + `YYYYMMDD-001` 形式になっている
- `emergency_teams` には表示用採番の専用コードがない
- `case_id` は通知、病院要請、検索、詳細表示などで広く利用されている

## Constraints

- 外部連携先でも扱いやすい表示用事案番号を維持したい
- 口頭伝達は必須ではないが、人間が検索・帳票参照しやすい形式は維持したい
- 救急隊は追加・削除があるため、採番コードは `team_id` と切り離した専用列が望ましい
- 1隊あたり 1 日 20 件程度を想定する

## Recommendation

- 内部用不変 ID として `cases.case_uid` を追加する
- 表示・外部連携用の事案番号は引き続き `cases.case_id` を使う
- `emergency_teams.case_number_code` を追加し、`case_id` を `YYYYMMDD-隊コード-連番2桁` で採番する
- 今回は `DISPATCH` 起票と新規保存経路から `case_uid` を埋め、既存の広範な `case_id` 依存は段階移行にする

## Data Model

### `cases`

- Add: `case_uid TEXT NOT NULL UNIQUE`
- Keep: `case_id TEXT NOT NULL UNIQUE`

役割:

- `case_uid`: 内部識別、将来の API / 外部連携の安定キー
- `case_id`: 表示、検索、帳票、外部向け事案番号

### `emergency_teams`

- Add: `case_number_code TEXT NOT NULL UNIQUE`

役割:

- 表示用事案番号に含める固定採番コード
- `team_id` の再編や将来の内部変更と切り離す

## Public Case ID Format

- Format: `YYYYMMDD-CCC-NN`
- `CCC`: `case_number_code` 3 桁
- `NN`: 隊ごとの日次連番 2 桁
- Example: `20260324-128-01`

採番単位:

- `dispatchDate + case_number_code`

## Rollout Strategy

### Phase 1

- スキーマに `case_uid` と `case_number_code` を追加する
- 既存データを backfill する
- `DISPATCH` 起票の採番を新方式へ切り替える
- `POST /api/cases` の新規保存でも `case_uid` を保持する

### Phase 2

- 内部参照 API を `case_uid` 受け取りへ順次対応する
- 外部連携では `case_uid` を安定参照キー、`case_id` を表示キーとして併用する

## Verification

- `npm run check`
- `npm run check:full`
- `npx.cmd playwright test e2e/tests/dispatch-flows.spec.ts`
