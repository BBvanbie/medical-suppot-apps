# 2026-03-08 UI Maintenance Implementation

## Summary

Implemented the in-progress UI maintenance work for shared case-selection-history rendering and shared hospital request client API calls, then stabilized the related E2E coverage.

## Changes

### Case Selection History UI

- Added shared selection-history table component:
  - `components/shared/CaseSelectionHistoryTable.tsx`
- Added shared presentation helpers:
  - `lib/casePresentation.ts`
- Added extracted EMS case list table:
  - `components/cases/CaseSearchTable.tsx`
- Updated EMS case search page to use the shared table component and extracted EMS table:
  - `app/cases/search/page.tsx`
- Updated admin case list/detail UI to use shared selection-history rendering:
  - `components/admin/AdminCasesPage.tsx`

### Hospital Request Flow

- Added shared client hook for hospital request detail, consult messages, and status updates:
  - `components/hospitals/useHospitalRequestApi.ts`
- Updated hospital request list to use the shared hook:
  - `components/hospitals/HospitalRequestsTable.tsx`
- Updated hospital consult split view to use the shared hook:
  - `components/hospitals/HospitalConsultCasesTable.tsx`
- Added testing hooks for key hospital actions and modals:
  - `components/hospitals/HospitalRequestDetail.tsx`
  - `components/shared/ConsultChatModal.tsx`

### E2E Stabilization

- Added hospital login seed support and improved login diagnostics:
  - `e2e/global-setup.ts`
  - `e2e/support/auth.ts`
  - `e2e/support/test-data.ts`
- Added hospital flow regression spec:
  - `e2e/tests/hospital-flows.spec.ts`
- Stabilized the hospital flow spec by:
  - selecting the intended request row explicitly
  - ordering the tests so the consult case is not mutated before it runs

## Verification

- `npm.cmd run lint`
- `npx.cmd playwright test e2e/tests/hospital-flows.spec.ts`
- `npx.cmd playwright test e2e/tests/admin-cases.spec.ts`
- `npx.cmd playwright test e2e/tests/cases-access.spec.ts`
- `npx.cmd playwright test`

## Result

- Lint passed.
- Targeted Playwright coverage for the touched case/admin/hospital flows passed.
- Full Playwright suite passed.
