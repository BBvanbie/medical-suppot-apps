# Case Edit and Search Table UI Refinement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify the aware date/time inputs on the EMS case edit page and restructure the EMS case search table for better status visibility and clearer expand interactions.

**Architecture:** Make a local form sizing adjustment in `CaseFormPage.tsx`, then simplify `CaseSearchTable.tsx` by removing low-priority columns, widening the status area, and adding a dedicated chevron expand control while preserving row-click expansion and the existing detail navigation button.

**Tech Stack:** Next.js App Router, React client components, Tailwind CSS, Heroicons, existing EMS table and layout patterns.

---

### Task 1: Normalize aware date/time sizing on case edit page

**Files:**
- Modify: `components/cases/CaseFormPage.tsx`

**Step 1: Inspect current aware-info row**

Run: `Get-Content components/cases/CaseFormPage.tsx | Select-Object -Index (1516..1546)`
Expected: The aware date/time/address controls are visible.

**Step 2: Adjust field sizing**

- Slightly reduce the effective width of the aware date input
- Keep address wide
- Ensure date and time controls share the same height, padding, and font size

**Step 3: Keep visual system intact**

Do not change card styles, border radius conventions, or section structure.

**Step 4: Run type check**

Run: `npx.cmd tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add components/cases/CaseFormPage.tsx
git commit -m "fix: unify aware date and time field sizing"
```

### Task 2: Rebalance case search table columns and add chevron expand control

**Files:**
- Modify: `components/cases/CaseSearchTable.tsx`

**Step 1: Inspect current table structure**

Run: `Get-Content components/cases/CaseSearchTable.tsx`
Expected: Current columns and row expansion behavior are visible.

**Step 2: Remove low-priority columns**

Delete `住所` and `性別` from the header and body.

**Step 3: Widen status visibility**

Reassign freed width to the `ステータス` column and, if needed, slightly tighten `氏名`.

**Step 4: Add dedicated chevron column**

Add a rightmost chevron button that toggles expansion. It should:
- call `onToggleExpand(row.caseId)`
- stop propagation so it doesn’t double-trigger
- rotate when expanded

**Step 5: Preserve detail navigation**

Keep the existing `詳細` button and ensure it still navigates without toggling expansion.

**Step 6: Update colSpan and row wiring**

Adjust the expanded content row `colSpan` to match the new column count.

**Step 7: Run type check**

Run: `npx.cmd tsc --noEmit`
Expected: PASS

**Step 8: Commit**

```bash
git add components/cases/CaseSearchTable.tsx
git commit -m "fix: refine case search table expansion controls"
```

### Task 3: Verify and finalize

**Files:**
- Modify: touched files only if issues appear during verification

**Step 1: Run lint**

Run: `npm.cmd run lint`
Expected: PASS

**Step 2: Run build**

Run: `npm.cmd run build`
Expected: PASS or sandbox-only `EPERM`; rerun outside sandbox if needed.

**Step 3: Spot-check behavior**

Confirm:
- aware date/time controls look consistent
- case list no longer shows address/gender
- status area is easier to read
- row click expands
- chevron click expands
- detail button navigates only

**Step 4: Commit**

```bash
git add components/cases
git commit -m "chore: verify case edit and search table ui refinement"
```
