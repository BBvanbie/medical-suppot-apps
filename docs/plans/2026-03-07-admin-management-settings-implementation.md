# Admin Management and Settings Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `admin` 向けの設定トップと病院管理・救急隊管理の一覧/追加機能を、責務分離されたルーティングと `ADMIN` 専用API認可で実装する。

**Architecture:** `/admin/settings` は設定トップの入口ページに限定し、実データを持つ管理画面は `/admin/hospitals` と `/admin/ambulance-teams` に分離する。画面は最小の共通 primitive と管理画面用部品で構成し、一覧/追加処理は repository と validation に切り出して後続の編集機能へ拡張しやすくする。

**Tech Stack:** Next.js App Router, React, TypeScript, PostgreSQL, next-auth, Tailwind CSS

---

### Task 1: Document Current Admin Routing and Touch Points

**Files:**
- Review: `C:\practice\medical-support-apps\app\admin\page.tsx`
- Review: `C:\practice\medical-support-apps\proxy.ts`
- Review: `C:\practice\medical-support-apps\lib\authContext.ts`
- Review: `C:\practice\medical-support-apps\components\home\Sidebar.tsx`
- Review: `C:\practice\medical-support-apps\components\hospitals\HospitalSidebar.tsx`

**Step 1: Confirm existing admin route protection**

Run: `rg -n "/admin|hasAccess|getAuthenticatedUser|settings" app components lib proxy.ts`
Expected: `/admin/*` is already guarded in `proxy.ts`, and there is no dedicated admin management navigation yet.

**Step 2: Write down route additions to implement**

Create route target list:
- `/admin/settings`
- `/admin/hospitals`
- `/admin/ambulance-teams`

**Step 3: Commit**

```bash
git add docs/plans/2026-03-07-admin-management-settings-design.md docs/plans/2026-03-07-admin-management-settings-implementation.md
git commit -m "docs: add admin management settings design and plan"
```

### Task 2: Add Admin Navigation and Top-Level Pages

**Files:**
- Modify: `C:\practice\medical-support-apps\app\admin\page.tsx`
- Create: `C:\practice\medical-support-apps\app\admin\settings\page.tsx`
- Create: `C:\practice\medical-support-apps\app\admin\hospitals\page.tsx`
- Create: `C:\practice\medical-support-apps\app\admin\ambulance-teams\page.tsx`
- Create or Modify: `C:\practice\medical-support-apps\components\admin\...`

**Step 1: Create minimal admin route pages**

Implement static pages with:
- page header
- summary cards or entry cards
- placeholder loading-safe structure for server rendering

**Step 2: Add admin navigation entries**

Update the admin-facing navigation component so the new routes are reachable without using `/settings`.

**Step 3: Run route smoke check**

Run: `npm run lint`
Expected: No new route or import errors.

**Step 4: Commit**

```bash
git add app/admin components
git commit -m "feat: add admin settings and management routes"
```

### Task 3: Build Shared Settings Primitives and Admin Management UI

**Files:**
- Create: `C:\practice\medical-support-apps\components\settings\SettingPageLayout.tsx`
- Create: `C:\practice\medical-support-apps\components\settings\SettingCard.tsx`
- Create: `C:\practice\medical-support-apps\components\settings\SettingSection.tsx`
- Create: `C:\practice\medical-support-apps\components\settings\SettingActionButton.tsx`
- Create: `C:\practice\medical-support-apps\components\settings\SettingSaveStatus.tsx`
- Create: `C:\practice\medical-support-apps\components\shared\ConfirmDialog.tsx`
- Create: `C:\practice\medical-support-apps\components\admin\AdminEntityPage.tsx`
- Create: `C:\practice\medical-support-apps\components\admin\AdminEntityTable.tsx`
- Create: `C:\practice\medical-support-apps\components\admin\AdminEntityCreateForm.tsx`

**Step 1: Create the minimum primitive UI used by this scope**

Implement only the primitives consumed by:
- `/admin/settings`
- `/admin/hospitals`
- `/admin/ambulance-teams`

**Step 2: Create generic admin page/table/form wrappers**

Support:
- title/description
- summary metrics
- table columns
- create form fields
- save state
- confirm before submit

**Step 3: Verify TypeScript integrity**

Run: `npm run lint`
Expected: New shared UI compiles without unused or typing errors.

**Step 4: Commit**

```bash
git add components
git commit -m "feat: add admin management UI primitives"
```

### Task 4: Add Audit Log Schema and Admin Repository Layer

**Files:**
- Create: `C:\practice\medical-support-apps\lib\admin\adminManagementSchema.ts`
- Create: `C:\practice\medical-support-apps\lib\admin\adminManagementRepository.ts`
- Create: `C:\practice\medical-support-apps\lib\admin\adminManagementValidation.ts`
- Modify: `C:\practice\medical-support-apps\lib\db.ts` if helper export is needed

**Step 1: Add `audit_logs` ensure function**

Implement schema creation for:
- `audit_logs`
- useful indexes on `target_type`, `target_id`, `created_at`

**Step 2: Add typed repository functions**

Implement:
- `listAdminHospitals()`
- `createAdminHospital()`
- `listAdminAmbulanceTeams()`
- `createAdminAmbulanceTeam()`
- `createAuditLog()`

**Step 3: Add validation helpers**

Implement normalization and validation for:
- hospital create input
- ambulance team create input

**Step 4: Verify with lint**

Run: `npm run lint`
Expected: repository and validation modules compile cleanly.

**Step 5: Commit**

```bash
git add lib/admin lib/db.ts
git commit -m "feat: add admin management repository and audit log schema"
```

### Task 5: Implement Admin Hospitals API

**Files:**
- Create: `C:\practice\medical-support-apps\app\api\admin\hospitals\route.ts`
- Modify: `C:\practice\medical-support-apps\lib\authContext.ts` only if response typing helper is needed
- Modify: `C:\practice\medical-support-apps\lib\admin\adminManagementRepository.ts`

**Step 1: Implement `GET /api/admin/hospitals`**

Requirements:
- require authenticated `ADMIN`
- ensure audit schema exists
- return hospital rows in stable sort order

**Step 2: Implement `POST /api/admin/hospitals`**

Requirements:
- require authenticated `ADMIN`
- validate payload
- reject duplicate `sourceNo` with `409`
- insert hospital row
- write audit log
- return created row

**Step 3: Verify API behavior**

Run: `npm run lint`
Expected: Route compiles and type imports resolve.

**Step 4: Commit**

```bash
git add app/api/admin/hospitals lib/admin
git commit -m "feat: add admin hospitals api"
```

### Task 6: Implement Admin Ambulance Teams API

**Files:**
- Create: `C:\practice\medical-support-apps\app\api\admin\ambulance-teams\route.ts`
- Modify: `C:\practice\medical-support-apps\lib\admin\adminManagementRepository.ts`
- Modify: `C:\practice\medical-support-apps\lib\admin\adminManagementValidation.ts`

**Step 1: Implement `GET /api/admin/ambulance-teams`**

Requirements:
- require authenticated `ADMIN`
- return team rows in stable sort order

**Step 2: Implement `POST /api/admin/ambulance-teams`**

Requirements:
- require authenticated `ADMIN`
- validate payload
- reject duplicate `teamCode` with `409`
- insert row
- write audit log
- return created row

**Step 3: Verify API behavior**

Run: `npm run lint`
Expected: Route compiles and no duplicate symbol/type issues remain.

**Step 4: Commit**

```bash
git add app/api/admin/ambulance-teams lib/admin
git commit -m "feat: add admin ambulance teams api"
```

### Task 7: Connect Admin Hospitals Page to API

**Files:**
- Modify: `C:\practice\medical-support-apps\app\admin\hospitals\page.tsx`
- Create or Modify: `C:\practice\medical-support-apps\components\admin\AdminHospitalsClient.tsx`
- Modify: `C:\practice\medical-support-apps\components\admin\AdminEntityTable.tsx`
- Modify: `C:\practice\medical-support-apps\components\admin\AdminEntityCreateForm.tsx`

**Step 1: Render initial hospital list**

Use server-side load or client fetch bootstrapping to display:
- total count
- recent rows
- required columns

**Step 2: Add create form with confirm dialog**

Support:
- required field validation
- submit disabled during save
- success refresh
- inline duplicate error

**Step 3: Verify hospital create flow manually**

Run: `npm run lint`
Expected: UI compiles and page wiring is valid.

**Step 4: Commit**

```bash
git add app/admin/hospitals components/admin
git commit -m "feat: wire admin hospitals management page"
```

### Task 8: Connect Admin Ambulance Teams Page to API

**Files:**
- Modify: `C:\practice\medical-support-apps\app\admin\ambulance-teams\page.tsx`
- Create or Modify: `C:\practice\medical-support-apps\components\admin\AdminAmbulanceTeamsClient.tsx`
- Modify: `C:\practice\medical-support-apps\components\admin\AdminEntityTable.tsx`
- Modify: `C:\practice\medical-support-apps\components\admin\AdminEntityCreateForm.tsx`

**Step 1: Render initial ambulance team list**

Display:
- total count
- team code
- team name
- division

**Step 2: Add create form with confirm dialog**

Support:
- required field validation
- duplicate `teamCode` handling
- optimistic disabled state
- success refresh

**Step 3: Verify ambulance team create flow manually**

Run: `npm run lint`
Expected: Page compiles and uses shared admin UI without special-case branching.

**Step 4: Commit**

```bash
git add app/admin/ambulance-teams components/admin
git commit -m "feat: wire admin ambulance teams management page"
```

### Task 9: Final Verification and Follow-Up Notes

**Files:**
- Review: `C:\practice\medical-support-apps\docs\IMPLEMENTATION_GUIDE.md`
- Modify: `C:\practice\medical-support-apps\docs\IMPLEMENTATION_GUIDE.md` if route map needs update

**Step 1: Run project verification**

Run: `npm run lint`
Expected: PASS

**Step 2: Perform manual role checks**

Verify:
- `ADMIN` can open `/admin/settings`, `/admin/hospitals`, `/admin/ambulance-teams`
- `EMS` and `HOSPITAL` are redirected away from `/admin/*`
- direct API calls from non-admin return `403`

**Step 3: Summarize residual risks**

Document:
- no edit/delete yet
- audit log viewer not yet implemented
- EMS/HOSPITAL settings routes still pending

**Step 4: Commit**

```bash
git add docs/IMPLEMENTATION_GUIDE.md
git commit -m "docs: update implementation guide for admin management foundation"
```
