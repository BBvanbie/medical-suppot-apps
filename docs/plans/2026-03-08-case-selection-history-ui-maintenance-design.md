# 2026-03-08 Case Selection History UI Maintenance Design

## Goal

Reduce duplicated case-selection-history UI and presentation helpers across EMS and ADMIN screens without changing behavior.

## Scope

- Preserve current EMS case-list child-row behavior
- Preserve current ADMIN case-list child-row behavior
- Preserve current ADMIN case-detail modal behavior
- Extract shared selection-history table rendering
- Extract shared gender / admin-status presentation helpers

## Current Duplication

- `app/cases/search/page.tsx`
  - Renders EMS child-row selection history table inline
  - Defines its own `formatGenderLabel`
- `components/admin/AdminCasesPage.tsx`
  - Renders admin child-row and detail selection-history tables inline
  - Defines its own `formatGenderLabel`
  - Defines its own admin status tone helper

## Proposed Structure

### `components/shared/CaseSelectionHistoryTable.tsx`

Shared table renderer for `CaseSelectionHistoryItem[]`.

- `variant="compact"`
  - `送信日時 / 病院名 / 科目 / status`
- `variant="detailed"`
  - `送信日時 / 病院名 / 選定診療科 / 最新病院コメント / A側返信 / ステータス`
- Optional `actionHeader` / `renderActions`
- Optional row test ids

### `lib/casePresentation.ts`

Shared presentation helpers:

- `formatCaseGenderLabel(value)`
- `getAdminCaseStatusTone(status)`

## Verification

- `npm.cmd run lint`
- `npx.cmd playwright test`
