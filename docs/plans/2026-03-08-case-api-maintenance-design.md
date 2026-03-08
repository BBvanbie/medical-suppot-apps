# 2026-03-08 Case API Maintenance Design

## Goal

Keep current case-related behavior unchanged while reducing duplicated authorization and selection-history logic across APIs.

## Scope

- Preserve existing API response shapes and page behavior.
- Extract shared case target lookup helpers.
- Extract shared selection-history query and mapping.
- Continue using shared patient-summary extraction.

## Current Duplication

- `app/api/cases/search/[caseId]/route.ts`
  - Reads selection history with its own SQL and mapping.
  - Reads `case_team_id` and performs read authorization.
- `app/api/admin/cases/[caseId]/route.ts`
  - Repeats nearly identical selection-history SQL and mapping.
- `app/api/cases/consults/[targetId]/route.ts`
  - Repeats target lookup by `targetId` and case-team authorization context.
- `app/api/cases/send-history/route.ts`
  - Repeats target lookup by `caseId` + `targetId`.

## Proposed Structure

### `lib/caseAccess.ts`

Add query helpers on top of current boolean predicates:

- `getCaseTargetAccessContextByTargetId(targetId)`
  - Returns `targetId`, `status`, `hospitalId`, `requestId`, `caseId`, `caseTeamId`
- `getCaseTargetAccessContext(caseId, targetId)`
  - Same shape, but scoped by both `caseId` and `targetId`

These helpers centralize the common joins:

- `hospital_request_targets`
- `hospital_requests`
- `cases`

### `lib/caseSelectionHistory.ts`

Create a shared selection-history fetcher:

- `listCaseSelectionHistory(caseId)`

This owns the common SQL for:

- latest hospital comment
- latest A-side reply
- last actor
- selected departments
- status normalization

### Existing `lib/casePatientSummary.ts`

Keep as the shared patient-summary extraction source.

## API Refactor Plan

- `app/api/cases/search/[caseId]/route.ts`
  - Use `listCaseSelectionHistory(caseId)`
  - Authorize using `canReadCaseTeam(user, history.caseTeamId)`
- `app/api/admin/cases/[caseId]/route.ts`
  - Use `listCaseSelectionHistory(caseId)`
  - Keep admin-only gate
- `app/api/cases/consults/[targetId]/route.ts`
  - Use `getCaseTargetAccessContextByTargetId(targetId)`
- `app/api/cases/send-history/route.ts`
  - Use `getCaseTargetAccessContext(caseId, targetId)` in `PATCH`

## Non-Goals

- No DTO redesign
- No UI changes
- No behavior changes to status labels or visibility
- No database schema changes

## Verification

- `npm.cmd run lint`
- Spot-check:
  - EMS case child-row fetch
  - Admin case detail modal
  - EMS consult chat fetch/reply
  - EMS send-history decision path
