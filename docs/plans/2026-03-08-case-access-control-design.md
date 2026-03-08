# Case Access Control Design

**Date:** 2026-03-08

## Goal

EMSユーザーがA側で閲覧・操作できる事案を所属隊に紐づくものへ限定しつつ、ADMINユーザーには全件の閲覧だけを許可する。

## Access Rules

- `EMS`
  - 事案一覧: `cases.team_id = user.teamId` の事案のみ表示
  - 事案詳細: 自隊事案のみ閲覧可能
  - 相談一覧、相談履歴、送信履歴: 自隊事案のみ閲覧可能
  - 事案保存、相談返信、搬送判断、送信履歴保存: 自隊事案のみ実行可能
- `ADMIN`
  - 事案一覧、事案詳細、相談一覧、相談履歴、送信履歴: 全件閲覧可能
  - 事案保存、相談返信、搬送判断、送信履歴保存: 実行不可
- `HOSPITAL`
  - 今回の変更対象外

## Response Policy

- 閲覧対象外の事案や関連リソースは `404` を返す
- ロール上書き込みが禁止される操作は `403` を返す

## Scope

- `app/api/cases/search/route.ts`
- `app/cases/[caseId]/page.tsx`
- `app/api/cases/route.ts`
- `app/api/cases/consults/route.ts`
- `app/api/cases/consults/[targetId]/route.ts`
- `app/api/cases/send-history/route.ts`
- `components/cases/CaseFormPage.tsx`
- 共通認可ヘルパーを `lib` に追加

## Approach

- `getAuthenticatedUser()` を起点に `role` と `teamId` を取得する
- 事案閲覧判定と事案編集判定を共通ヘルパー化する
- `case_id` や `targetId` を受け取るAPIは、最終的に `cases.team_id` をJOINして閲覧・編集権限を判定する
- 管理者の詳細画面は表示だけ可能にし、保存操作をUIとAPIの両方で禁止する

## Verification

- EMSでログインしたとき、自隊以外の事案が一覧に出ない
- EMSで他隊事案の詳細や関連APIを直接叩くと `404`
- ADMINで一覧・詳細・履歴は見える
- ADMINで保存・相談返信・搬送判断は `403`
