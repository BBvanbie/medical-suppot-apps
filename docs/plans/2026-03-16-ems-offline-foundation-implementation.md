# EMS Offline Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** EMS 側に限定した安全なオフライン基盤を追加し、事案下書き、病院簡易検索、未送信キュー、手動再送、競合停止を実現する。

**Architecture:** オフライン責務は `lib/offline/` に集約し、IndexedDB を主保存先として扱う。既存の EMS UI は `lib/casesClient.ts`、設定フォーム、病院検索、相談チャットの送信直前でこのレイヤーを経由し、送信系は手動再送対象と自動同期対象を分離する。

**Tech Stack:** Next.js App Router, React 19, TypeScript, IndexedDB, existing REST APIs, Playwright, ESLint

---

### Task 1: Add offline domain types and IndexedDB wrapper

**Files:**
- Create: `lib/offline/offlineTypes.ts`
- Create: `lib/offline/offlineDb.ts`
- Create: `lib/offline/offlineStore.ts`

**Step 1:** Define shared types for offline status, drafts, queue items, cache rows, conflict metadata.

**Step 2:** Implement IndexedDB schema creation with stores:
- `caseDrafts`
- `offlineQueue`
- `hospitalCache`
- `searchState`
- `emsSettings`
- `syncMeta`

**Step 3:** Add store helpers for CRUD and small query operations:
- get draft by `localCaseId`
- list pending queue items
- count unsent queue items
- upsert hospital cache
- upsert EMS settings

**Step 4:** Add minimal unit-safe helpers around JSON serialization and timestamps.

### Task 2: Add offline status manager and sync coordinator

**Files:**
- Create: `lib/offline/offlineStatus.ts`
- Create: `lib/offline/offlineSync.ts`
- Create: `lib/offline/offlineConflict.ts`
- Create: `components/offline/OfflineProvider.tsx`
- Create: `components/offline/useOfflineState.ts`

**Step 1:** Implement online/offline detection using `navigator.onLine` plus request failure tracking.

**Step 2:** Add offline state shape:
- `mode`
- `pendingQueueCount`
- `hasReconnectNotice`
- `lastSyncAt`

**Step 3:** Implement sync coordinator rules:
- auto-sync allowed: `case_update`, `settings_sync`
- manual only: `hospital_request_send`, `consult_reply`
- no auto-send on reconnect for manual items

**Step 4:** Add conflict comparison helper based on `updated_at` or stored base timestamp.

### Task 3: Add EMS common offline banner and reconnect notice

**Files:**
- Create: `components/offline/OfflineStatusBanner.tsx`
- Modify: EMS shared shell files used by `/cases/*`, `/hospitals/search`, `/settings/*`
- Modify: `components/home/Sidebar.tsx`

**Step 1:** Find the nearest EMS shell insertion point and render a common banner there.

**Step 2:** Show:
- offline/degraded/reconnected message
- unsent queue count
- link to `/settings/offline-queue`

**Step 3:** Add reconnect notice only when manual queue items remain.

**Step 4:** Keep the layout compact enough for iPad/desktop use.

### Task 4: Move EMS case context and draft persistence to IndexedDB

**Files:**
- Modify: `components/cases/CaseFormPage.tsx`
- Create: `lib/offline/offlineCaseDrafts.ts`
- Modify: any nearby case payload helpers already used by case save

**Step 1:** Replace or narrow `sessionStorage` use for case context with IndexedDB-backed draft persistence.

**Step 2:** For `/cases/new`, generate `offline-*` `localCaseId` until server save succeeds.

**Step 3:** For `/cases/[caseId]`, persist changes as local draft plus `case_update` metadata with `lastKnownServerUpdatedAt`.

**Step 4:** Surface local save state in the page without pretending server save succeeded.

### Task 5: Wire case save behavior for online/offline split

**Files:**
- Modify: `lib/casesClient.ts`
- Modify: `components/cases/CaseFormPage.tsx`
- Modify: related case API callers if needed

**Step 1:** Add wrapper methods that choose behavior by connectivity.

**Step 2:** Online:
- preserve current API behavior

**Step 3:** Offline:
- save draft locally
- enqueue `case_update` when editing existing case
- keep new local draft unsynced until explicit or reconnect-driven sync path

**Step 4:** Return result objects that let UI distinguish:
- server saved
- locally saved
- queued
- failed

### Task 6: Add hospital master cache and offline search path

**Files:**
- Create: `lib/offline/offlineHospitalSearch.ts`
- Modify: `components/hospitals/HospitalSearchPage.tsx`
- Modify: nearby search tabs/components if they depend on result shape

**Step 1:** Store online search inputs/results and hospital master slices into `hospitalCache` and `searchState`.

**Step 2:** Add offline search function using cached hospital data and simplified matching rules.

**Step 3:** Keep result shape compatible with existing `SearchResultsTab`.

**Step 4:** Show the warning:
- `オフライン中のため、病院情報は最新ではない可能性があります。`

### Task 7: Queue hospital request sends instead of sending offline

**Files:**
- Modify: `components/hospitals/HospitalSearchPage.tsx`
- Modify: request confirm/complete EMS-side flow files
- Create: `lib/offline/offlineRequestQueue.ts`

**Step 1:** When offline, allow request confirmation flow but do not call server send API.

**Step 2:** Enqueue `hospital_request_send` with:
- selected hospitals
- departments
- case snapshot
- `localCaseId` / `serverCaseId`
- base timestamps

**Step 3:** Update UI copy so the user sees that it was queued, not sent.

**Step 4:** Keep online behavior unchanged.

### Task 8: Queue consult replies and show unsent chat messages

**Files:**
- Modify: `components/shared/ConsultChatModal.tsx`
- Modify: `components/cases/CaseFormPage.tsx`
- Modify: `app/cases/search/page.tsx`
- Create: `lib/offline/offlineConsultQueue.ts`

**Step 1:** Add local unsent consult message model and merge it with fetched chat history for display.

**Step 2:** Offline send action:
- do not call server
- enqueue `consult_reply`
- render message with unsent badge/state

**Step 3:** Add visual states for:
- `未送信`
- `送信待ち`
- `競合`
- `送信失敗`

**Step 4:** Preserve current online send path.

### Task 9: Disable transport decision/decline when offline

**Files:**
- Modify: `components/cases/CaseFormPage.tsx`
- Modify: `app/cases/search/page.tsx`
- Modify: `components/cases/CaseSendHistoryTable.tsx`

**Step 1:** Use offline state to disable:
- `搬送決定`
- `搬送辞退`

**Step 2:** Add explanatory copy:
- `この操作はオンライン時のみ実行できます`

**Step 3:** Ensure no queue item is created for these actions.

### Task 10: Add EMS settings local persistence and reconnect sync

**Files:**
- Create: `lib/offline/offlineEmsSettings.ts`
- Modify: `components/settings/EmsNotificationsSettingsForm.tsx`
- Modify: `components/settings/EmsDisplaySettingsForm.tsx`
- Modify: `components/settings/EmsInputSettingsForm.tsx`
- Modify: `app/settings/sync/page.tsx`
- Modify: `components/settings/EmsSyncSettingsForm.tsx`

**Step 1:** Save EMS settings locally in IndexedDB on change.

**Step 2:** Online:
- keep existing API persistence

**Step 3:** Offline:
- save locally
- enqueue `settings_sync`
- show local save feedback

**Step 4:** On reconnect, auto-sync settings only if conflict-free.

### Task 11: Add offline queue page and settings/sync integration

**Files:**
- Create: `app/settings/offline-queue/page.tsx`
- Create: `app/settings/offline-queue/loading.tsx`
- Create: `components/settings/OfflineQueuePage.tsx`
- Modify: `app/settings/page.tsx`
- Modify: `app/settings/sync/page.tsx`
- Modify: `lib/settingsProfiles.ts`

**Step 1:** Build queue page using existing settings page layout patterns.

**Step 2:** List:
- type
- target case
- createdAt
- status
- error
- conflict
- actions

**Step 3:** Add actions:
- send
- retry
- discard
- inspect detail

**Step 4:** Add cards/links from sync overview and settings top.

### Task 12: Implement manual resend flow for queued send items

**Files:**
- Modify: `lib/offline/offlineSync.ts`
- Modify: `lib/casesClient.ts`
- Modify: `components/settings/OfflineQueuePage.tsx`

**Step 1:** Add manual send handlers for:
- `hospital_request_send`
- `consult_reply`

**Step 2:** Resolve `offline-*` local case IDs to server case IDs before send when necessary.

**Step 3:** Call existing APIs only after user action from queue page.

**Step 4:** Update queue item status:
- `sending`
- `ready_to_send`
- `failed`
- `conflict`

### Task 13: Implement conflict detection surfaces

**Files:**
- Modify: `lib/offline/offlineConflict.ts`
- Modify: queue page and case/settings UI surfaces as needed
- Modify: existing data fetchers if extra server timestamps are required

**Step 1:** Compare stored `baseServerUpdatedAt` with latest server state before sync/send.

**Step 2:** Mark items as `conflict` instead of overwriting.

**Step 3:** Show `競合あり` on queue page and in any relevant local draft status surface.

**Step 4:** Stop auto-sync and manual send when unresolved conflict exists.

### Task 14: Add tests for offline queueing and disabled actions

**Files:**
- Create or Modify: targeted unit/integration test files for `lib/offline/*`
- Modify: `e2e/tests/cases-access.spec.ts`
- Create: `e2e/tests/ems-offline-queue.spec.ts`

**Step 1:** Add focused tests for:
- IndexedDB queue CRUD
- local draft persistence
- conflict state transitions

**Step 2:** Add E2E coverage for:
- offline case editing keeps data
- offline request send goes to queue
- offline consult reply shows unsent
- transport decision/decline disabled offline
- reconnect shows queue notice

**Step 3:** Keep selectors aligned with existing app patterns.

### Task 15: Update docs

**Files:**
- Modify: `docs/IMPLEMENTATION_GUIDE.md`
- Modify: `README.md`
- Reference: `docs/plans/2026-03-16-ems-offline-foundation-design.md`

**Step 1:** Document the EMS-only offline scope.

**Step 2:** Add operator guidance for:
- local drafts
- queue review
- reconnect behavior
- conflict handling

**Step 3:** Note that transport decision/decline remain online-only.

### Task 16: Verify

**Step 1:** Run `npm run check`

**Step 2:** Run `npm run check:full`

**Step 3:** Run `npm run test:e2e`

**Step 4:** Summarize any remaining risk around:
- IndexedDB availability
- browser offline simulation
- server timestamp coverage

## Progress


### Completed

- Task 1: offline types / IndexedDB wrapper
- Task 2: offline status manager / provider
- Task 3: EMS common offline banner
- Task 4: case draft auto-save / restore (initial)
- Task 5: case_update queueing and auto-sync (initial)
- Task 6: hospital cache and offline search (minimum)
- Task 7: hospital request queueing (minimum)
- Task 8: consult reply queueing and unsent display
- Task 9: transport decision / decline disabled offline
- Task 10: EMS settings local save and reconnect sync
- Task 11: offline queue page and settings/sync links
- Task 12: manual resend for consult/request (minimum)
- Task 15: README / IMPLEMENTATION_GUIDE / plan updates
- Task 16: npm run check

### Remaining implementation plan

1. Strengthen `case_update` conflict comparison with server `updated_at`
2. Add conflict stop/detail flow for manual resend
3. Add conflict resolution UI
4. Extend offline automated coverage for `case draft` restore, `case_update` auto-sync, and settings sync

### Automated test status as of 2026-03-16

- Added Playwright coverage in `e2e/tests/ems-offline.spec.ts`
- Covered: offline banner, offline queue list, queued consult reply visibility, transport action disable while offline, queue discard, manual resend success, manual resend failure
- Verified command: `npx playwright test e2e/tests/ems-offline.spec.ts`
- Result: 6 passed

### Next session first steps

1. Add automated coverage for `case draft` save / restore
2. Add automated coverage for `case_update` reconnect auto-sync and `settings_sync` reconnect auto-sync
3. Add automated coverage for conflict detection and manual resend stop behavior
4. Re-run `npm run check`, `npx playwright test e2e/tests/ems-offline.spec.ts`, and the new targeted tests

### Resolved blocker

- Date: 2026-03-16
- File: `lib/offline/offlineSync.ts`
- Resolution: rewrote the file as clean UTF-8 text
- Result: the Turbopack source parse error is gone and `next build` now compiles successfully

### Remaining verification note

- `npm run check:full` still fails after compile with `spawn EPERM` during the build step
- This no longer appears to be a source parse problem in `offlineSync.ts`
- Next time, treat this as an environment/runtime build issue unless a reproducible app-level stack trace appears
