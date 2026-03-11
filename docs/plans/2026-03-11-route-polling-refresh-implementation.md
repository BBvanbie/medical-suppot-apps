# Route Polling Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 10-second polling refresh to EMS and Hospital list screens so status changes appear without page navigation.

**Architecture:** Reuse existing EMS fetch functions in the case search page, add a shared client-side interval refresher for Hospital server pages, and synchronize medical info local state from refreshed props.

**Tech Stack:** Next.js App Router, React client components, `router.refresh()`, browser intervals.

---

### Task 1: Add a shared hospital auto-refresh primitive

**Files:**
- Create: `components/shared/AutoRefreshOnInterval.tsx`

**Step 1: Build a small client component**
- Use `useRouter()` and `startTransition`
- Refresh every 10 seconds
- Prevent overlapping refresh calls
- Clean up interval on unmount

### Task 2: Wire hospital list pages to auto-refresh

**Files:**
- Modify: `app/hospitals/requests/page.tsx`
- Modify: `app/hospitals/patients/page.tsx`
- Modify: `app/hospitals/consults/page.tsx`
- Modify: `app/hospitals/declined/page.tsx`
- Modify: `app/hospitals/medical-info/page.tsx`

**Step 1: Render the shared refresher in each page**
- Keep page layout unchanged
- Do not refresh more often than every 10 seconds

### Task 3: Keep medical info local state in sync with refreshed props

**Files:**
- Modify: `components/hospitals/HospitalMedicalInfoPage.tsx`

**Step 1: Sync incoming items into local state**
- Update local items when refreshed props arrive
- Avoid clobbering cards currently saving

### Task 4: Add EMS case list polling

**Files:**
- Modify: `app/cases/search/page.tsx`

**Step 1: Add a 10-second interval for case rows**
- Reuse `fetchCases()`
- Only run while mounted

**Step 2: Refresh expanded target lists**
- Re-fetch targets for currently expanded case IDs
- Avoid duplicate in-flight target requests

### Task 5: Verify

**Step 1: Run type check**
Run: `npx.cmd tsc --noEmit`
Expected: PASS

**Step 2: Run lint**
Run: `npm.cmd run lint`
Expected: PASS

**Step 3: Run production build**
Run: `npm.cmd run build`
Expected: PASS
