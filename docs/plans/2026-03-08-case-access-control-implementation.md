# Case Access Control Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restrict EMS case access to the logged-in team while allowing admins to view all cases without editing.

**Architecture:** Add shared authorization helpers keyed by authenticated user role and team, then enforce them consistently in EMS case pages and APIs. Use server-side authorization as the source of truth and mirror admin read-only constraints in the UI.

**Tech Stack:** Next.js App Router, NextAuth, TypeScript, PostgreSQL

---

### Task 1: Shared case authorization helpers

**Files:**
- Create: `lib/caseAccess.ts`

**Step 1: Add helper types and guards**

Create functions that answer whether a user can read all cases, whether a user can read a case for a given `team_id`, and whether a user can edit a case for a given `team_id`.

**Step 2: Cover role behavior**

Encode these rules:
- `ADMIN` can read any case and cannot edit
- `EMS` can read/edit only when `teamId` matches the case `team_id`
- all other cases are denied

### Task 2: Enforce reads on case list/detail and consult APIs

**Files:**
- Modify: `app/api/cases/search/route.ts`
- Modify: `app/cases/[caseId]/page.tsx`
- Modify: `app/api/cases/consults/route.ts`
- Modify: `app/api/cases/consults/[targetId]/route.ts`

**Step 1: Load authenticated user and validate role**

Allow only `EMS` and `ADMIN` to access A-side case reads.

**Step 2: Filter query results**

Apply `cases.team_id` filtering for `EMS`, no filter for `ADMIN`.

**Step 3: Hide unauthorized records**

When a single case or consult target is outside the caller's readable scope, return `404`.

### Task 3: Enforce reads/writes on send-history and save APIs

**Files:**
- Modify: `app/api/cases/send-history/route.ts`
- Modify: `app/api/cases/route.ts`

**Step 1: Guard write endpoints by role**

Return `403` for `ADMIN` writes and for any non-EMS caller on EMS write endpoints.

**Step 2: Verify case ownership on EMS writes**

Before writing send-history, consult reply, or case updates, confirm the target case belongs to the caller's team.

**Step 3: Keep admin read-only**

Permit `ADMIN` on read endpoints and deny mutation endpoints.

### Task 4: Make admin case detail read-only

**Files:**
- Modify: `components/cases/CaseFormPage.tsx`
- Modify: `app/cases/[caseId]/page.tsx`

**Step 1: Add a read-only prop**

Introduce a prop that disables persistence actions and mutation affordances when true.

**Step 2: Pass the prop for admins**

Set the detail page to read-only for admins while preserving current EMS editing behavior.

### Task 5: Verify behavior

**Files:**
- Test by command only

**Step 1: Run targeted checks**

Run lint or targeted tests covering the touched files.

**Step 2: Manually validate role matrix**

Confirm EMS team scoping and admin read-only behavior through the implemented guards.
