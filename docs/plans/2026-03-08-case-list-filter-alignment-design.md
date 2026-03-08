# 2026-03-08 Case List Filter Alignment Design

## Goal

Align EMS and ADMIN case-list filters with actual usage and current domain meaning of `division`.

## Scope

- EMS case list keeps only keyword search.
- ADMIN case list adds top filters for:
  - team name
  - division
  - status
- ADMIN filtering is executed via API query parameters.
- EMS-side `division` UI labels such as `1隊/2隊/3隊` are removed.

## Decisions

- EMS does not need division filtering because it already sees only its own cases.
- `division` is treated as `方面` in the admin UI.
- Admin filtering uses server-side filtering instead of client-side filtering.

## Affected Files

- `app/cases/search/page.tsx`
- `app/api/cases/search/route.ts`
- `components/admin/AdminCasesPage.tsx`
- `app/api/admin/cases/route.ts`

## Verification

- `npm.cmd run lint`
- `npx.cmd playwright test e2e/tests/cases-access.spec.ts`
- `npx.cmd playwright test e2e/tests/admin-cases.spec.ts`
