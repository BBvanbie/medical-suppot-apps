# Route Loading UX Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add route-level loading UI, page-type skeletons, and consistent pending states for critical actions across EMS, HOSPITAL, and ADMIN flows without breaking existing layouts.

**Architecture:** Build a shared loading component set under `components/shared/loading`, keep `loading.tsx` files thin and route-specific, and reuse existing client pending state by wrapping primary actions with shared loading components. Shell layouts remain untouched so App Router can preserve sidebar and header while page content loads.

**Tech Stack:** Next.js App Router, React client/server components, Tailwind CSS, existing fetch/toast/pending state patterns.

---

### Task 1: Create loading primitives

**Files:**
- Create: `components/shared/loading/SkeletonBlock.tsx`
- Create: `components/shared/loading/SkeletonLine.tsx`
- Create: `components/shared/loading/SkeletonCircle.tsx`
- Create: `components/shared/loading/InlineSpinner.tsx`
- Create: `components/shared/loading/LoadingLabel.tsx`
- Create: `components/shared/loading/LoadingButton.tsx`
- Create: `components/shared/loading/PendingOverlay.tsx`
- Create: `components/shared/loading/PageLoadingOverlay.tsx`
- Create: `components/shared/loading/index.ts`

**Step 1: Inspect button and dialog patterns to match existing styling**

Run: `rg -n "className=.*button|送信中|保存中|更新中|isPending|sending" components/shared components/cases components/hospitals components/settings components/admin`
Expected: Existing pending labels and button styles are identified.

**Step 2: Implement skeleton primitives**

Create `SkeletonBlock`, `SkeletonLine`, and `SkeletonCircle` using Tailwind utility classes only. Keep colors neutral and animation light.

**Step 3: Implement action/loading primitives**

Create `InlineSpinner`, `LoadingLabel`, `LoadingButton`, `PendingOverlay`, and `PageLoadingOverlay`.

Requirements:
- `LoadingButton` accepts `loading`, `loadingLabel`, `disabled`, `variant`, `className`
- `LoadingButton` prevents click while loading
- overlays are optional and visually light

**Step 4: Export from index file**

Add barrel exports for all shared loading components.

**Step 5: Run targeted verification**

Run: `npx.cmd tsc --noEmit`
Expected: PASS

**Step 6: Commit**

```bash
git add components/shared/loading
git commit -m "feat: add shared loading primitives"
```

### Task 2: Create page-type skeleton components

**Files:**
- Create: `components/shared/loading/DashboardPageSkeleton.tsx`
- Create: `components/shared/loading/ListPageSkeleton.tsx`
- Create: `components/shared/loading/DetailPageSkeleton.tsx`
- Create: `components/shared/loading/SettingsPageSkeleton.tsx`
- Create: `components/shared/loading/MedicalInfoGridSkeleton.tsx`
- Modify: `components/shared/loading/index.ts`

**Step 1: Inspect current page structures**

Run: `rg -n "export default async function|function .*Page|return \(" app/paramedics app/hospitals app/admin app/settings app/hp/settings app/cases components/hospitals components/admin components/settings`
Expected: Representative page structures are visible.

**Step 2: Implement dashboard/list/detail/settings/medical-info skeletons**

Requirements:
- `DashboardPageSkeleton`: title, summary cards, main cards
- `ListPageSkeleton`: title, toolbar/filter bar, 5-10 rows/cards
- `DetailPageSkeleton`: title, meta row, 2-4 cards, optional chat/timeline block
- `SettingsPageSkeleton`: section cards, rows, toggles/inputs placeholders
- `MedicalInfoGridSkeleton`: 6-12 fixed-height cards with title + updatedAt lines

**Step 3: Expose simple props for variation**

Allow limited props like row count, card count, showFilters, showChat so route `loading.tsx` can stay thin.

**Step 4: Run targeted verification**

Run: `npx.cmd tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add components/shared/loading
git commit -m "feat: add page skeleton components"
```

### Task 3: Add EMS route loading.tsx files

**Files:**
- Create: `app/paramedics/loading.tsx`
- Create: `app/cases/search/loading.tsx`
- Create: `app/cases/[caseId]/loading.tsx`
- Create: `app/settings/loading.tsx`
- Create: `app/settings/notifications/loading.tsx`
- Create: `app/settings/display/loading.tsx`
- Create: `app/settings/input/loading.tsx`
- Create: `app/settings/sync/loading.tsx`
- Create: `app/settings/device/loading.tsx`
- Create: `app/settings/support/loading.tsx`

**Step 1: Map each route to a skeleton type**

- `/paramedics` -> dashboard
- `/cases/search` -> list
- `/cases/[caseId]` -> detail
- `/settings*` -> settings

**Step 2: Create thin loading components**

Each `loading.tsx` should just import the right skeleton and render it with route-appropriate props.

**Step 3: Verify layout preservation**

Run: `npx.cmd tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add app/paramedics/loading.tsx app/cases/search/loading.tsx app/cases/[caseId]/loading.tsx app/settings
git commit -m "feat: add ems route loading skeletons"
```

### Task 4: Add HOSPITAL route loading.tsx files

**Files:**
- Create: `app/hospitals/loading.tsx`
- Create: `app/hospitals/requests/loading.tsx`
- Create: `app/hospitals/requests/[targetId]/loading.tsx`
- Create: `app/hospitals/patients/loading.tsx`
- Create: `app/hospitals/patients/[targetId]/loading.tsx`
- Create: `app/hospitals/consults/loading.tsx`
- Create: `app/hospitals/declined/loading.tsx`
- Create: `app/hospitals/medical-info/loading.tsx`
- Create: `app/hp/settings/loading.tsx`
- Create: `app/hp/settings/facility/loading.tsx`
- Create: `app/hp/settings/operations/loading.tsx`
- Create: `app/hp/settings/notifications/loading.tsx`
- Create: `app/hp/settings/display/loading.tsx`
- Create: `app/hp/settings/support/loading.tsx`

**Step 1: Map each route to skeleton types**

- hospital home -> dashboard
- requests/patients/consults/declined -> list
- request/patient detail -> detail
- medical-info -> medical info grid
- hp/settings* -> settings

**Step 2: Create thin loading components**

Keep shell intact by rendering only content skeletons.

**Step 3: Verify route files compile**

Run: `npx.cmd tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add app/hospitals app/hp/settings
git commit -m "feat: add hospital route loading skeletons"
```

### Task 5: Add ADMIN route loading.tsx files

**Files:**
- Create: `app/admin/loading.tsx`
- Create: `app/admin/settings/loading.tsx`
- Create: `app/admin/hospitals/loading.tsx`
- Create: `app/admin/ambulance-teams/loading.tsx`
- Create: `app/admin/users/loading.tsx`
- Create: `app/admin/devices/loading.tsx`
- Create: `app/admin/orgs/loading.tsx`
- Create: `app/admin/logs/loading.tsx`
- Create: `app/admin/cases/loading.tsx`

**Step 1: Map each admin route to dashboard/list/settings skeletons**

**Step 2: Create thin loading components**

Prefer `ListPageSkeleton` for entity pages and `SettingsPageSkeleton` for admin settings.

**Step 3: Verify compile**

Run: `npx.cmd tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add app/admin
git commit -m "feat: add admin route loading skeletons"
```

### Task 6: Convert shared consult/status dialogs to LoadingButton

**Files:**
- Modify: `components/shared/ConsultChatModal.tsx`
- Modify: `components/shared/DecisionReasonDialog.tsx`
- Modify: `components/shared/ConfirmDialog.tsx`
- Modify: `components/shared/LoadingButton.tsx` (if prop gaps are found)

**Step 1: Identify current pending props and labels**

Run: `rg -n "sending|pending|送信中|保存中|更新中" components/shared/ConsultChatModal.tsx components/shared/DecisionReasonDialog.tsx components/shared/ConfirmDialog.tsx`
Expected: Current pending states and labels are visible.

**Step 2: Replace primary action buttons with LoadingButton**

Keep existing pending booleans and submit handlers. Only replace visual/button behavior.

**Step 3: Verify no behavior regression**

Run: `npx.cmd tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add components/shared/ConsultChatModal.tsx components/shared/DecisionReasonDialog.tsx components/shared/ConfirmDialog.tsx components/shared/loading/LoadingButton.tsx
git commit -m "refactor: unify dialog pending buttons"
```

### Task 7: Convert EMS critical actions to shared pending UI

**Files:**
- Modify: `components/cases/CaseFormPage.tsx`
- Modify: `app/cases/search/page.tsx` (if primary send actions live here)
- Modify: related EMS action components discovered during inspection

**Step 1: Inspect EMS action flows**

Run: `rg -n "TRANSPORT_DECIDED|TRANSPORT_DECLINED|consultSending|saveState|送信中|更新中" components/cases app/cases`
Expected: EMS critical action entry points are identified.

**Step 2: Apply LoadingButton and optional PendingOverlay**

Target:
- consultation send
- transport decision
- transport decline
- heavy transitions only get overlay

**Step 3: Run verification**

Run: `npx.cmd tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add components/cases app/cases
git commit -m "refactor: add loading states to ems critical actions"
```

### Task 8: Convert HOSPITAL critical actions to shared pending UI

**Files:**
- Modify: `components/hospitals/HospitalRequestsTable.tsx`
- Modify: `components/hospitals/HospitalRequestDetail.tsx`
- Modify: `components/hospitals/HospitalConsultCasesTable.tsx`
- Modify: `components/hospitals/HospitalPatientsTable.tsx`
- Modify: `components/hospitals/HospitalMedicalInfoPage.tsx`

**Step 1: Inspect pending flows**

Run: `rg -n "sending|pending|更新中|送信中|isSaving|NEGOTIATING|NOT_ACCEPTABLE|medical-info" components/hospitals`
Expected: Hospital critical action states are identified.

**Step 2: Replace primary actions with LoadingButton**

Target:
- hospital status updates
- consult send
- request acceptance/rejection paths
- medical info card toggle

**Step 3: Add local overlay only where route-level refresh feels heavy**

Do not add full overlay for simple row actions unless necessary.

**Step 4: Verify compile**

Run: `npx.cmd tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add components/hospitals
git commit -m "refactor: add loading states to hospital critical actions"
```

### Task 9: Convert settings and admin critical saves to shared pending UI

**Files:**
- Modify: `components/settings/EmsNotificationsSettingsForm.tsx`
- Modify: `components/settings/EmsDisplaySettingsForm.tsx`
- Modify: `components/settings/EmsInputSettingsForm.tsx`
- Modify: `components/settings/EmsSyncSettingsForm.tsx`
- Modify: `components/settings/HospitalFacilitySettingsForm.tsx`
- Modify: `components/settings/HospitalOperationsSettingsForm.tsx`
- Modify: `components/settings/HospitalNotificationSettingsForm.tsx`
- Modify: `components/settings/HospitalDisplaySettingsForm.tsx`
- Modify: `components/admin/AdminEntityEditor.tsx`
- Modify: `components/admin/AdminEntityCreateForm.tsx`
- Modify: `components/admin/AdminLogsPage.tsx` (only if it has destructive/important update controls)

**Step 1: Inspect current save buttons and transitions**

Run: `rg -n "useTransition|保存中|更新中|disabled=.*isPending|type=\"submit\"" components/settings components/admin`
Expected: Settings/admin save points are identified.

**Step 2: Replace save buttons with LoadingButton**

Reuse existing `useTransition()` and submit booleans.

**Step 3: Verify compile**

Run: `npx.cmd tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add components/settings components/admin
git commit -m "refactor: unify settings and admin save loading states"
```

### Task 10: Run full verification and polish docs

**Files:**
- Modify: `docs/project-summary-2026-03-11.md` (if loading architecture should be reflected)
- Modify: any touched files from prior tasks if lint/type/build issues arise

**Step 1: Run lint and build verification**

Run: `npm.cmd run lint`
Expected: PASS

Run: `npm.cmd run build`
Expected: PASS

**Step 2: Spot check route loading presence**

Run: `rg --files app | rg "loading\.tsx$"`
Expected: All requested loading files are present.

**Step 3: Optional E2E smoke check**

Run: `npm run test` or relevant Playwright smoke if an existing route navigation suite already exists.
Expected: Key navigation flow still passes.

**Step 4: Update docs if needed**

Document the new loading architecture briefly if the project summary is meant to stay current.

**Step 5: Commit**

```bash
git add docs app components
git commit -m "docs: document route loading ux implementation"
```
