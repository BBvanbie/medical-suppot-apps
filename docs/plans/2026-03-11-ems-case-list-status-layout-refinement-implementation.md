# EMS Case List Status and Layout Refinement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refine EMS aware-date sizing, remap EMS case list parent statuses to workflow-friendly labels, and restore a no-horizontal-scroll case list with row-tap expansion only.

**Architecture:** Use CSS grid tuning for the aware info row, derive display-only parent status labels in the case search page, and simplify `CaseSearchTable.tsx` by removing the chevron column and rebalancing fixed-width columns.

**Tech Stack:** Next.js App Router, React client components, Tailwind CSS, existing EMS search page state and table rendering.

---

### Task 1: Tighten aware date/time sizing

**Files:**
- Modify: `app/globals.css`

**Step 1: Inspect current aware grid values**

Run: `Get-Content app/globals.css | Select-Object -Index (92..110)`
Expected: `ems-grid-aware` width values are visible.

**Step 2: Adjust grid column sizes**

- Reduce aware-date width slightly
- Keep aware-date and aware-time at the same width range
- Preserve wide address field

**Step 3: Keep responsive fallback intact**

Retain the existing 2-column mobile collapse behavior.

**Step 4: Run type check**

Run: `npx.cmd tsc --noEmit`
Expected: PASS

### Task 2: Remap parent-row status in case search page

**Files:**
- Modify: `app/cases/search/page.tsx`

**Step 1: Inspect row construction**

Run: `rg -n "incidentStatus|requestTargetCount|rows" app/cases/search/page.tsx`
Expected: The row-building path is visible.

**Step 2: Add display-status mapping helper**

Implement a small helper that returns:
- `搬送先決定` if any target is `TRANSPORT_DECIDED`
- `選定中` if request target count is greater than zero
- `選定前` otherwise

**Step 3: Apply mapped status to table rows**

Use this display status in the rows passed to `CaseSearchTable`.

**Step 4: Keep cache/update behavior coherent**

If expanded target cache changes the effective status, ensure the mapped status can still be recomputed consistently.

**Step 5: Run type check**

Run: `npx.cmd tsc --noEmit`
Expected: PASS

### Task 3: Simplify case search table layout and restore row-tap expand only

**Files:**
- Modify: `components/cases/CaseSearchTable.tsx`

**Step 1: Remove chevron affordance**

Delete the chevron import, column, and button.

**Step 2: Restore row-tap-only expansion**

Keep the row `onClick` expand behavior and keep the `詳細` button `stopPropagation()` behavior.

**Step 3: Rebalance columns to avoid horizontal scroll**

Use fixed width ratios so the table fits its parent without horizontal scroll.

**Step 4: Keep status prominent**

Give `ステータス` more width than before and leave `詳細` compact.

**Step 5: Update colSpan and empty state**

Reduce `colSpan` to the new column count.

**Step 6: Run type check**

Run: `npx.cmd tsc --noEmit`
Expected: PASS

### Task 4: Add dispatch address guidance if needed

**Files:**
- Modify: `components/cases/CaseFormPage.tsx` only if a helper line or placeholder is necessary

**Step 1: Inspect current dispatch address input**

Run: `Get-Content components/cases/CaseFormPage.tsx | Select-Object -Index (1538..1544)`
Expected: Dispatch address input is visible.

**Step 2: Add minimal guidance**

If no helper exists, add a short hint or placeholder indicating city/ward inclusion such as `三鷹市 / 世田谷区` level.

**Step 3: Keep layout unchanged**

Do not introduce extra structural complexity.

### Task 5: Verify and finalize

**Files:**
- Modify: touched files only if verification issues appear

**Step 1: Run lint**

Run: `npm.cmd run lint`
Expected: PASS

**Step 2: Run build**

Run: `npm.cmd run build`
Expected: PASS or sandbox-only `EPERM`; rerun outside sandbox if needed.

**Step 3: Spot-check outcomes**

Confirm:
- aware date is slightly narrower
- date/time look aligned
- parent row status shows only `選定前 / 選定中 / 搬送先決定`
- table no longer relies on horizontal scrolling
- row tap expands
- detail button still navigates only

**Step 4: Commit**

```bash
git add app/globals.css app/cases/search/page.tsx components/cases/CaseSearchTable.tsx components/cases/CaseFormPage.tsx
git commit -m "fix: refine ems case list status and layout"
```
