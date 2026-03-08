# 2026-03-08 Hospital Request Flow Maintenance Design

## Goal

Keep the current hospital-side request and consult behavior unchanged while reducing duplicated client-side request logic.

## Scope

- Preserve the current UI structure for:
  - `HospitalRequestsTable`
  - `HospitalConsultCasesTable`
- Preserve current API response shapes and route behavior.
- Extract shared client-side fetch and status-update logic for hospital request detail and consult messages.

## Current Duplication

- `components/hospitals/HospitalRequestsTable.tsx`
  - Fetches request detail
  - Fetches consult messages
  - Sends status updates
- `components/hospitals/HospitalConsultCasesTable.tsx`
  - Repeats the same request detail fetch
  - Repeats the same consult message fetch
  - Repeats the same status update call

The two screens differ in layout and post-action UI, but not in the underlying request mechanics.

## Proposed Structure

### `components/hospitals/useHospitalRequestApi.ts`

Add a client hook that owns the shared API calls and their loading/error state:

- `fetchDetail(targetId)`
- `resetDetail()`
- `fetchMessages(targetId)`
- `resetMessages()`
- `updateStatus(targetId, status, note?)`

The hook also exports the shared client-side response types:

- `HospitalRequestDetailResponse`
- `HospitalConsultMessage`

### Components

- `HospitalRequestsTable`
  - Keeps detail modal, consult modal, completion modal, and phone modal behavior
  - Uses the shared hook for network operations
- `HospitalConsultCasesTable`
  - Keeps split view behavior
  - Uses the shared hook for network operations

## Non-Goals

- No API changes
- No route changes
- No status-label changes
- No redesign of hospital-side UI
- No change to completion / phone-modal behavior

## Verification

- `npm.cmd run lint`
- `npx.cmd playwright test e2e/tests/hospital-flows.spec.ts`
- `npx.cmd playwright test`
