# EMS Sync Actions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** EMS 側設定画面から手動同期と未送信データ再送を実行できるようにする。

**Architecture:** `ems_sync_state` を EMS ユーザー単位の同期状態テーブルとして追加し、取得・更新は専用 route handler 経由で行う。UI は `/settings/sync` の page を server page のまま維持し、実行フォームだけを client component に分離して状態再取得と実行結果表示を行う。

**Tech Stack:** Next.js App Router, React, TypeScript, PostgreSQL, next-auth, Tailwind CSS

---

### Task 1: Add EMS Sync Schema and Repository

**Files:**
- Create: `C:\practice\medical-support-apps\lib\emsSyncSchema.ts`
- Create: `C:\practice\medical-support-apps\lib\emsSyncRepository.ts`

1. Add `ems_sync_state` schema ensure function.
2. Add repository methods:
- `getEmsSyncState(userId)`
- `runEmsSync(userId)`
- `retryEmsPending(userId)`
3. Run `npm.cmd run lint`.
4. Commit.

### Task 2: Implement EMS Sync APIs

**Files:**
- Create: `C:\practice\medical-support-apps\app\api\settings\ambulance\sync\route.ts`
- Create: `C:\practice\medical-support-apps\app\api\settings\ambulance\sync\run\route.ts`
- Create: `C:\practice\medical-support-apps\app\api\settings\ambulance\sync\retry\route.ts`

1. Require authenticated `EMS`.
2. Resolve `user_id` from logged-in user.
3. `GET` returns current sync state.
4. `POST run` updates sync status.
5. `POST retry` updates retry status.
6. Run `npm.cmd run lint`.
7. Commit.

### Task 3: Wire EMS Sync UI

**Files:**
- Modify: `C:\practice\medical-support-apps\app\settings\sync\page.tsx`
- Create: `C:\practice\medical-support-apps\components\settings\EmsSyncSettingsForm.tsx`

1. Replace static sync buttons with client form.
2. Show current sync state.
3. Execute run/retry actions via API.
4. Disable buttons while running.
5. Show `saving / saved / error`-equivalent status text.
6. Run `npm.cmd run lint`.
7. Commit.

### Task 4: Verify State Updates and Update Docs

**Files:**
- Modify if needed: `C:\practice\medical-support-apps\docs\IMPLEMENTATION_GUIDE.md`

1. Run `npm.cmd run lint`.
2. Run `npm.cmd run build`.
3. Verify DB state updates with a local smoke check.
4. Update implementation guide.
5. Commit.
