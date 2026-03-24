# Dispatch Auto Case Create Design

**Date:** 2026-03-23

## Goal

`DISPATCH` ロールから最低限の入力で新規事案を起票し、同時に EMS 側の既存事案一覧へ自然に反映できる状態にする。

## Scope

- `DISPATCH` ロール追加
- `DISPATCH` 用の新規事案起票画面追加
- `DISPATCH` 用の指令一覧画面追加
- サーバー側での事案 ID 採番
- `emergency_teams` を使った A 隊選択
- EMS 既存一覧への自動反映

## Non-Goals

- 外部指令システムとの実連携
- 患者情報、主訴、所見、バイタル、相談履歴の入力
- HP 側 UI の変更
- `cases` 周辺の大規模リファクタ

## Current State

- ロールは `EMS` / `HOSPITAL` / `ADMIN` の 3 種のみ
- 事案保存は `POST /api/cases` で EMS 手入力前提
- EMS 一覧は `cases` テーブルを直接参照している
- A 隊マスタは `emergency_teams` テーブルを既に利用している

## Approach Options

### Option 1: `cases` 単一テーブルを拡張する

- 利点: EMS 一覧への反映が最短で済む
- 利点: 既存 JOIN や権限判定を流用しやすい
- 利点: 今回必要な最低限データを 1 回の保存で完結できる
- 欠点: 指令履歴と EMS 事案本体が同居する

### Option 2: `dispatch_requests` と `cases` の 2 段保存にする

- 利点: 将来の本物の指令連携にはより明確
- 欠点: 今回スコープでは保存・一覧・同期責務が増えすぎる
- 欠点: 既存 EMS 一覧へ反映するための重複処理が増える

## Recommendation

今回は Option 1 を採用する。`cases` を単一の事案本体として維持しつつ、将来拡張に必要な `created_from`、`created_by_user_id`、`dispatch_at`、`case_status` を追加して責務の境界を確保する。

## Design

### 1. Role and routing

- `DISPATCH` を `AppRole` に追加する
- 既定遷移先は `/dispatch`
- `proxy.ts` に `/dispatch` 保護を追加し、`DISPATCH` と `ADMIN` のみ許可する
- ページ/API 側でも `DISPATCH` / `ADMIN` 判定を行う

### 2. Data model

`cases` テーブルに以下の概念を追加する。

- `dispatch_at TIMESTAMPTZ`
- `created_from TEXT`
- `created_by_user_id BIGINT NULL`
- `case_status TEXT`

既存必須列との整合のため、今回不要な患者情報は以下で扱う。

- `patient_name` は空文字を許容する
- `age` は `0` を未入力扱いとして表示側で `-` にする

### 3. Server responsibilities

- `POST /api/dispatch/cases`
  - 入力検証
  - `emergency_teams` 存在確認
  - 覚知日付 + 覚知時間から `dispatch_at` を生成
  - 日付単位のサーバー採番で `YYYYMMDD-001` 形式の `case_id` を払い出す
  - `cases` へ保存
- `GET /api/dispatch/cases`
  - `created_from = 'DISPATCH'` の事案を新しい順で返す

採番は同日単位の PostgreSQL advisory lock を使い、同時起票でも重複しないようにする。

### 4. Repository split

- スキーマ補正: `lib/dispatch/dispatchSchema.ts`
- 検証: `lib/dispatch/dispatchValidation.ts`
- 保存/一覧/隊候補: `lib/dispatch/dispatchRepository.ts`

既存 `app/api/cases` は EMS 手入力の責務を維持し、DISPATCH 起票は新規 API に分離する。

### 5. UI structure

- `/dispatch/new`
  - 隊名、覚知日付、覚知時間、指令先住所のみ
  - 成功時に事案 ID を表示
- `/dispatch/cases`
  - 事案 ID / 隊名 / 覚知日付 / 覚知時間 / 指令先住所 / 作成日時
- `/dispatch` は `/dispatch/new` へ寄せる
- 既存 portal shell パターンに合わせて `DispatchPortalShell` / `DispatchSidebar` を追加する

### 6. EMS compatibility

- EMS 一覧の SQL は既存どおり `cases` を参照するため、保存後に自然反映される
- `patient_name = ''` は `-` 表示、`age = 0` は `-` 表示へ寄せる
- 既存の EMS 手入力フローは変更しない

## Files

- Create: `docs/plans/2026-03-23-dispatch-auto-case-create-implementation.md`
- Create: `lib/dispatch/*`
- Create: `components/dispatch/*`
- Create: `app/dispatch/*`
- Create: `app/api/dispatch/cases/route.ts`
- Modify: `lib/auth.ts`
- Modify: `lib/authContext.ts`
- Modify: `proxy.ts`
- Modify: `auth.config.ts`
- Modify: `lib/admin/adminManagementValidation.ts`
- Modify: `lib/admin/adminManagementRepository.ts`
- Modify: `components/admin/AdminUsersPage.tsx`
- Modify: `scripts/setup_auth.sql`
- Modify: `components/cases/CaseSearchTable.tsx`

## Testing

- `npm run check`
- 可能なら `npm run test:e2e` の要否確認
- 手動確認:
  - `DISPATCH` で起票できる
  - EMS 一覧に反映される
  - 権限外ユーザーが `/dispatch/*` に入れない
  - A 隊一覧が DB から取得される
  - 採番がサーバー側で重複しない
