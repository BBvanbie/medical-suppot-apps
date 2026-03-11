# EMS iPad Aware Input and Municipality Label Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix iPad-specific aware date/time input overlap and show municipality labels in a dedicated EMS case list column.

**Architecture:** Add a focused EMS-aware input CSS class for date/time fields, return municipality labels from the case search API, and render the municipality in a narrow dedicated column without changing search or expansion behavior.

**Tech Stack:** Next.js App Router, React client components, Tailwind CSS, existing EMS case search API.

---

### Task 1: Add iPad-safe aware input styling

**Files:**
- Modify: `app/globals.css`
- Modify: `components/cases/CaseFormPage.tsx`

**Step 1: Add a dedicated aware input class**

- Create `ems-aware-input` for date/time controls
- Normalize padding, line-height, min-width, and box sizing
- Add WebKit-specific rules for date/time value and picker indicator

**Step 2: Apply the class to aware date/time inputs**

- Update the date input in `CaseFormPage.tsx`
- Update the time input in `CaseFormPage.tsx`
- Leave dispatch address input unchanged

### Task 2: Return municipality from the case search API

**Files:**
- Modify: `app/api/cases/search/route.ts`

**Step 1: Add a municipality extraction helper**

- Read the stored `address`
- Extract the first city / ward / town / village token when possible
- Return an empty string if no stable municipality token is found

**Step 2: Extend the response mapping**

- Include `municipality` in each response row
- Keep the existing row shape otherwise unchanged

### Task 3: Render municipality in the EMS case list

**Files:**
- Modify: `components/cases/CaseSearchTable.tsx`

**Step 1: Extend the row type**

- Add `municipality?: string`

**Step 2: Add the narrow municipality column**

- Insert a `市区名` column before `氏名`
- Keep it compact enough to avoid horizontal scroll
- Rebalance widths across the row

**Step 3: Preserve existing actions**

- Keep row-tap expansion
- Keep `詳細` as navigation only

### Task 4: Verify and stabilize

**Step 1: Run type check**

Run: `npx.cmd tsc --noEmit`
Expected: PASS

**Step 2: Run lint**

Run: `npm.cmd run lint`
Expected: PASS

**Step 3: Run production build**

Run: `npm.cmd run build`
Expected: PASS
