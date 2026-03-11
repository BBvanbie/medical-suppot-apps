# Hospital Medical Info Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 病院診療情報ページを実装し、病院ごとの診療科可否を専用テーブルで管理しつつ A側検索へ反映する。

**Architecture:** `hospital_departments` は所属関係のまま維持し、現在可否は `hospital_department_availability` に切り出す。病院ポータル側は専用 API を通じて即時更新し、A側検索 API は同テーブルを参照して availability を返す。

**Tech Stack:** Next.js App Router, React client components, PostgreSQL, existing authContext/hospital operator helpers, Tailwind CSS

---

### Task 1: Add Availability Schema Support

**Files:**
- Modify: `lib/db` usage call sites as needed
- Modify: `lib/hospitalRequestSchema.ts`
- Create: `lib/hospitalDepartmentAvailabilityRepository.ts`
- Test: manual API verification first

**Step 1: Add table creation logic**

Add `hospital_department_availability` creation inside schema ensure path.

Columns:
- `hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE`
- `department_id INTEGER NOT NULL REFERENCES medical_departments(id) ON DELETE CASCADE`
- `is_available BOOLEAN NOT NULL DEFAULT TRUE`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `PRIMARY KEY (hospital_id, department_id)`

Also add index for `(hospital_id, is_available)` if useful.

**Step 2: Add repository helpers**

Create helper functions:
- `listHospitalDepartmentAvailability(hospitalId)`
- `updateHospitalDepartmentAvailability({ hospitalId, departmentId, isAvailable })`
- `assertHospitalOwnsDepartment(hospitalId, departmentId)`

Read path should LEFT JOIN `hospital_departments`, `medical_departments`, `hospital_department_availability`.

Fallback behavior:
- no availability row => `isAvailable: true`
- no availability row => `updatedAt: null`

**Step 3: Verify schema compiles**

Run: `npx.cmd tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add lib/hospitalRequestSchema.ts lib/hospitalDepartmentAvailabilityRepository.ts
git commit -m "Add hospital department availability storage"
```

### Task 2: Add Medical Info Read API

**Files:**
- Create: `app/api/hospitals/medical-info/route.ts`
- Modify: `lib/hospitalDepartmentAvailabilityRepository.ts`

**Step 1: Implement GET route**

Requirements:
- authenticate user
- allow only `HOSPITAL`
- require `hospitalId`
- return shape:

```ts
type DepartmentAvailability = {
  departmentId: string;
  departmentName: string;
  isAvailable: boolean;
  updatedAt: string | null;
};
```

Response:

```ts
{
  hospitalId: string,
  items: DepartmentAvailability[]
}
```

**Step 2: Handle auth errors explicitly**

- 401 unauthorized
- 403 forbidden for non-hospital users

**Step 3: Verify route compiles**

Run: `npx.cmd tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add app/api/hospitals/medical-info/route.ts lib/hospitalDepartmentAvailabilityRepository.ts
git commit -m "Add hospital medical info read API"
```

### Task 3: Add Medical Info Update API

**Files:**
- Create: `app/api/hospitals/medical-info/[departmentId]/route.ts`
- Modify: `lib/hospitalDepartmentAvailabilityRepository.ts`

**Step 1: Implement PATCH route**

Request body:

```json
{ "isAvailable": true }
```

Validation:
- boolean required
- departmentId must be finite number
- user must be HOSPITAL
- target department must belong to hospital via `hospital_departments`

**Step 2: Upsert current status**

Use repository helper to upsert `is_available` and `updated_at = NOW()`.

**Step 3: Return updated item**

Return department id, name, isAvailable, updatedAt.

**Step 4: Verify route compiles**

Run: `npx.cmd tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add app/api/hospitals/medical-info/[departmentId]/route.ts lib/hospitalDepartmentAvailabilityRepository.ts
git commit -m "Add hospital medical info update API"
```

### Task 4: Build Medical Info Card Grid UI

**Files:**
- Modify: `app/hospitals/medical-info/page.tsx`
- Create: `components/hospitals/HospitalMedicalInfoPage.tsx`
- Create: `components/hospitals/MedicalInfoFlipCard.tsx`

**Step 1: Replace placeholder page**

Server page should:
- get operator via `getHospitalOperator()`
- render `HospitalPortalShell`
- render client page component

**Step 2: Build client page state**

State should track:
- items list
- per-card saving state map
- per-card error state map
- top summary counts
- initial loading / fetch error

**Step 3: Build flip card component**

Implement with:
- perspective wrapper
- inner element using `transform-style: preserve-3d`
- front/back absolute layers
- `backface-visibility: hidden`
- `rotateY(180deg)` state switch

Content on both faces:
- department name
- updatedAt label

**Step 4: Add optimistic toggle behavior**

Click flow:
- ignore if saving
- update local state immediately
- call PATCH
- success => sync updatedAt
- failure => rollback and show error

**Step 5: Add saving overlay**

Per-card saving overlay or spinner.

**Step 6: Verify manually in dev**

Check:
- card flips
- counts update
- failed save rolls back

**Step 7: Commit**

```bash
git add app/hospitals/medical-info/page.tsx components/hospitals/HospitalMedicalInfoPage.tsx components/hospitals/MedicalInfoFlipCard.tsx
git commit -m "Build hospital medical info flip-card UI"
```

### Task 5: Reflect Availability in Individual Hospital Search

**Files:**
- Modify: `app/api/hospitals/recent-search/route.ts`
- Modify: `components/hospitals/SearchResultsTab.tsx` only if response shape requires no-op wiring

**Step 1: Update hospital-card query path**

Current individual search builds `available_departments` from `hospital_departments` only.

Change it to:
- keep hospital department membership source
- LEFT JOIN availability table
- set `available` per department from current availability, defaulting to true when no row exists

**Step 2: Preserve existing response shape**

Keep:
- `viewType: "hospital-cards"`
- same `profiles` structure
- same button selection behavior

Only the boolean `available` source changes.

**Step 3: Verify behavior**

Manual check:
- unavailable department button becomes disabled in existing UI
- hospital still appears in results

**Step 4: Commit**

```bash
git add app/api/hospitals/recent-search/route.ts components/hospitals/SearchResultsTab.tsx
git commit -m "Reflect department availability in hospital card search"
```

### Task 6: Reflect Availability in Address and Municipality Search

**Files:**
- Modify: `app/api/hospitals/recent-search/route.ts`

**Step 1: Audit current table search SQL**

Preserve existing search-mode behavior (`or` / `and`) and existing response shape.

**Step 2: Replace department availability source carefully**

Adjust matching and returned department sets so they use current availability source from `hospital_department_availability` with default true fallback.

Do not redesign table search UX.

**Step 3: Verify regression-sensitive cases**

Manual checks:
- address search still returns rows
- municipality search still returns rows
- no SQL error if no availability records exist yet

**Step 4: Commit**

```bash
git add app/api/hospitals/recent-search/route.ts
git commit -m "Reflect department availability in address and municipality search"
```

### Task 7: Add Tests or Regression Checks

**Files:**
- Create or modify: relevant API/E2E tests depending current harness

**Step 1: Add focused regression coverage**

Minimum coverage:
- GET medical info as HOSPITAL succeeds
- PATCH medical info as HOSPITAL updates state
- non-HOSPITAL PATCH rejected
- individual hospital search reflects updated availability

**Step 2: Run targeted tests**

Use existing relevant test command for touched scope.

Examples:
- `npx.cmd tsc --noEmit`
- `npm.cmd run lint`
- if adding E2E: `npx.cmd playwright test <target>`

**Step 3: Commit**

```bash
git add <tests>
git commit -m "Add coverage for hospital medical info availability"
```

### Task 8: Remove Obsolete Placeholder Logic

**Files:**
- Modify: `app/hospitals/medical-info/page.tsx`
- Modify: any temporary fallback or dead code discovered during migration

**Step 1: Remove no-longer-used placeholder content**

Ensure only final page remains.

**Step 2: Remove obsolete availability assumptions if safely unused**

Do not delete code that is still referenced.

**Step 3: Final verification**

Run:
- `npx.cmd tsc --noEmit`
- `npm.cmd run lint`
- optionally `npm.cmd run build`

Expected: PASS

**Step 4: Commit**

```bash
git add app/hospitals/medical-info/page.tsx app/api/hospitals/recent-search/route.ts components/hospitals/
git commit -m "Finalize hospital medical info rollout"
```
