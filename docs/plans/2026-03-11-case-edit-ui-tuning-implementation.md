# Case Edit UI Tuning Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the overlapping basic-info inputs and improve send-history readability on the EMS case edit page while preserving the current visual system.

**Architecture:** Make a local layout adjustment in `CaseFormPage.tsx` for the aware info row, then explicitly rebalance send-history table columns in `CaseSendHistoryTable.tsx` using fixed-width planning. Keep all existing cards, colors, badges, and actions intact.

**Tech Stack:** Next.js App Router, React client components, Tailwind CSS, existing EMS page layout classes.

---

### Task 1: Fix aware info input alignment in basic tab

**Files:**
- Modify: `components/cases/CaseFormPage.tsx`

**Step 1: Inspect the current aware row markup**

Run: `Get-Content components/cases/CaseFormPage.tsx | Select-Object -Index (1516..1548)`
Expected: The `ems-grid-aware` block for aware date/time/address is visible.

**Step 2: Normalize label/input stacking**

Update the three field wrappers to use a consistent vertical layout so label position and input top alignment match.

**Step 3: Fix left-edge overlap for time/address**

Adjust input utility classes so `awareTime` and `dispatchAddress` get explicit left padding, `min-w-0`, and consistent text alignment with the rest of the form controls.

**Step 4: Keep existing visual style**

Do not change colors, border radius system, or card structure. Only fix spacing and alignment.

**Step 5: Run type check**

Run: `npx.cmd tsc --noEmit`
Expected: PASS

**Step 6: Commit**

```bash
git add components/cases/CaseFormPage.tsx
git commit -m "fix: align aware info inputs on case edit page"
```

### Task 2: Rebalance send history table columns

**Files:**
- Modify: `components/cases/CaseSendHistoryTable.tsx`

**Step 1: Inspect current table structure**

Run: `Get-Content components/cases/CaseSendHistoryTable.tsx`
Expected: Current `table-fixed` structure with no `colgroup` is visible.

**Step 2: Add explicit column planning**

Introduce `colgroup` or equivalent width classes so these priorities hold:
- hospital column wider
- status column wider
- comment columns narrower
- action column preserved

**Step 3: Reduce density slightly**

Lower the table text size by one step and trim vertical padding modestly for readability on iPad-sized layouts.

**Step 4: Preserve badge and action readability**

Ensure `RequestStatusBadge` does not collapse and action buttons still fit in the final column.

**Step 5: Run type check**

Run: `npx.cmd tsc --noEmit`
Expected: PASS

**Step 6: Commit**

```bash
git add components/cases/CaseSendHistoryTable.tsx
git commit -m "fix: improve case send history table readability"
```

### Task 3: Verify and finalize

**Files:**
- Modify: any touched files only if verification issues appear

**Step 1: Run lint**

Run: `npm.cmd run lint`
Expected: PASS

**Step 2: Run build if practical**

Run: `npm.cmd run build`
Expected: PASS or sandbox-only `EPERM`, in which case rerun outside sandbox.

**Step 3: Spot-check intended outcomes**

Confirm:
- `覚知時間` / `指令先住所` left edge overlap is gone
- send-history hospital/status columns are visibly wider
- comment columns are narrower but readable
- overall look remains consistent with existing EMS design

**Step 4: Commit**

```bash
git add components/cases
git commit -m "chore: verify case edit ui tuning"
```
