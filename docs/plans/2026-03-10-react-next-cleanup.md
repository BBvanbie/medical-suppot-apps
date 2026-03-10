# React/Next Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove unused and duplicated repository content safely, then apply a second-pass structural cleanup to obvious React/Next.js duplication without changing intended behavior.

**Architecture:** Start with reference-driven cleanup of runtime code, assets, temp files, and planning records. After the safe pass, fold trivial wrappers and duplicate shells into clearer shared structures while keeping App Router conventions and server/client boundaries intact.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, ESLint, Playwright

---

### Task 1: Audit safe deletions

**Files:**
- Modify: `docs/plans/2026-03-10-react-next-cleanup-design.md`
- Inspect: `app/`, `components/`, `lib/`, `public/`, `tmp/`, `docs/plans/`

**Step 1: Write the failing test**

Document the candidate deletions with exact references before deleting anything.

**Step 2: Run test to verify it fails**

Run: `rg -n "target-name" app components lib public docs`
Expected: either no references or a small verified reference set

**Step 3: Write minimal implementation**

Delete only files and imports whose references are fully understood.

**Step 4: Run test to verify it passes**

Run: `rg -n "target-name" app components lib public docs`
Expected: no dangling imports or references

**Step 5: Commit**

```bash
git add docs/plans/2026-03-10-react-next-cleanup-design.md
git commit -m "docs: add cleanup design"
```

### Task 2: Remove disposable assets and records

**Files:**
- Delete: `public/file.svg`
- Delete: `public/globe.svg`
- Delete: `public/next.svg`
- Delete: `public/vercel.svg`
- Delete: `public/window.svg`
- Delete: `tmp/*`
- Modify: `docs/plans/*` as needed

**Step 1: Write the failing test**

Verify the assets and temp files are unreferenced.

**Step 2: Run test to verify it fails**

Run: `rg -n "file.svg|globe.svg|next.svg|vercel.svg|window.svg|tmp/" app components lib docs public`
Expected: no runtime references for starter assets

**Step 3: Write minimal implementation**

Delete the unused files and stale records confirmed to be disposable.

**Step 4: Run test to verify it passes**

Run: `git status --short`
Expected: only intended deletions/modifications appear

**Step 5: Commit**

```bash
git add public tmp docs/plans
git commit -m "chore: remove stale assets and temp artifacts"
```

### Task 3: Remove or merge unneeded runtime wrappers

**Files:**
- Modify: `app/paramedics/page.tsx`
- Modify: `app/page.tsx`
- Modify: `components/home/HomeDashboard.tsx`
- Modify: `components/ems/EmsPortalShell.tsx`

**Step 1: Write the failing test**

Identify wrapper files that only forward to another module or duplicate shell concerns.

**Step 2: Run test to verify it fails**

Run: `rg -n "import Home from \"@/app/page\"|dashboard-shell h-screen overflow-hidden" app components`
Expected: duplicated shell/wrapper hits

**Step 3: Write minimal implementation**

Inline, merge, or simplify the duplicated structure while preserving routes.

**Step 4: Run test to verify it passes**

Run: `npm run lint`
Expected: no lint errors from changed runtime code

**Step 5: Commit**

```bash
git add app components
git commit -m "refactor: simplify duplicated portal structure"
```

### Task 4: Remove dead imports and low-risk duplication

**Files:**
- Modify: exact runtime files found during audit

**Step 1: Write the failing test**

Use search and lint output to find unused imports or dead helpers.

**Step 2: Run test to verify it fails**

Run: `npm run lint`
Expected: reports unused or invalid code paths if present

**Step 3: Write minimal implementation**

Delete dead imports, dead files, and collapse duplicated code paths where behavior stays unchanged.

**Step 4: Run test to verify it passes**

Run: `npm run lint`
Expected: clean lint run

**Step 5: Commit**

```bash
git add app components lib
git commit -m "refactor: remove dead code and duplicate paths"
```

### Task 5: Verify and summarize residual risk

**Files:**
- Modify: none unless verification reveals issues

**Step 1: Write the failing test**

Define verification commands for the changed surface.

**Step 2: Run test to verify it fails**

Run: `npm run lint`
Expected: pass

**Step 3: Write minimal implementation**

If verification fails, make the smallest corrective change and rerun.

**Step 4: Run test to verify it passes**

Run: `npm run lint`
Expected: pass

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: finalize repository cleanup"
```
