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
