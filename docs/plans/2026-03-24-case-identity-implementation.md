# Case Identity Implementation Plan

**Goal:** 内部用 `case_uid` と表示用 `case_id` を分離し、`DISPATCH` 採番を隊コードベースへ移行する。

**Architecture:** 既存の `case_id` ベース API / UI は維持しつつ、スキーマに不変 ID と隊採番コードを追加する段階導入。

---

### Task 1: Add schema support

**Files:**
- Modify: `lib/dispatch/dispatchSchema.ts`
- Modify: `lib/admin/adminManagementSchema.ts`
- Modify: `scripts/load_neon_seed.py`
- Modify: `scripts/seed_neon.sql`
- Modify: `e2e/global-setup.ts`

### Task 2: Add case identity helpers and new numbering logic

**Files:**
- Create: `lib/caseIdentity.ts`
- Modify: `lib/dispatch/dispatchRepository.ts`
- Modify: `app/api/cases/route.ts`
- Modify: `lib/admin/adminManagementRepository.ts`

### Task 3: Adjust tests and seeds

**Files:**
- Modify: `e2e/tests/dispatch-flows.spec.ts`
- Modify: `e2e/support/test-data.ts` when needed

### Task 4: Verify

**Run:**
- `npm run check`
- `npm run check:full`
- `npx.cmd playwright test e2e/tests/dispatch-flows.spec.ts`

### 2026-03-29 Phase 2 follow-up

- EMS case search keeps public `case_id` for display while using `case_uid` for detail navigation and selection-history fetches when available.
- `app/cases/[caseId]` and `GET /api/cases/search/[caseId]` now resolve either `case_id` or `case_uid` so old links remain valid during rollout.
- Local/dev warnings are reduced by normalizing `DATABASE_URL` SSL mode to `verify-full` in E2E setup and allowing `127.0.0.1` / `localhost` as Next.js `allowedDevOrigins`.
- Dispatch regression should cover create -> EMS search -> detail open to guard the mixed public/internal identifier path.

### 2026-03-29 Phase 3 full migration

- hospital_requests / hospital_patients / 
otifications now persist case_uid alongside display case_id.
- Internal joins for EMS search, consults, hospital request repositories, hospital patient/consult/declined views, send-history status updates, and admin case summaries now use case_uid.
- Notifications and decision/consult flows now carry case_uid internally while keeping case_id for rendered labels.
- Admin case detail and EMS legacy send-history endpoints still accept either case_id or case_uid at the route boundary for rollout safety.