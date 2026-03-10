# CaseFormPage and Repository Hygiene Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clean up remaining case form UI text and organize docs/scripts without changing application behavior.

**Architecture:** Keep case form state and mutations in place while extracting only display-heavy JSX blocks. Improve repository hygiene through documentation and categorization rather than aggressive deletion of historical assets.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, ESLint

---

### Task 1: Clean up CaseFormPage visible text

**Files:**
- Modify: `components/cases/CaseFormPage.tsx`
- Modify: `app/cases/[caseId]/page.tsx`

**Step 1: Write the failing test**

Identify visible strings that are malformed, inconsistent, or misleading.

**Step 2: Run test to verify it fails**

Run: `rg -n "譛|縺|/p>|繧" components/cases/CaseFormPage.tsx app/cases/[caseId]/page.tsx`
Expected: find malformed display strings

**Step 3: Write minimal implementation**

Replace malformed text with clear Japanese labels while preserving behavior.

**Step 4: Run test to verify it passes**

Run: `npm.cmd run lint`
Expected: PASS

**Step 5: Commit**

```bash
git add components/cases/CaseFormPage.tsx app/cases/[caseId]/page.tsx
git commit -m "fix: normalize case form UI text"
```

### Task 2: Extract display-only case form sections

**Files:**
- Create: `components/cases/*`
- Modify: `components/cases/CaseFormPage.tsx`

**Step 1: Write the failing test**

Locate repeated or oversized display-only blocks inside `CaseFormPage`.

**Step 2: Run test to verify it fails**

Run: `rg -n "患者基本情報|送信履歴|変更所見" components/cases/CaseFormPage.tsx`
Expected: large inline JSX blocks are still present

**Step 3: Write minimal implementation**

Extract stateless presentation helpers/components only.

**Step 4: Run test to verify it passes**

Run: `npm.cmd run lint`
Expected: PASS

**Step 5: Commit**

```bash
git add components/cases
git commit -m "refactor: extract case form presentation sections"
```

### Task 3: Organize docs and scripts

**Files:**
- Modify: `docs/*`
- Modify: `scripts/*`
- Create: `docs/README.md` or `scripts/README.md` if useful

**Step 1: Write the failing test**

List top-level docs and scripts that lack clear categorization.

**Step 2: Run test to verify it fails**

Run: `Get-ChildItem docs,scripts`
Expected: mixed responsibilities are not clearly documented

**Step 3: Write minimal implementation**

Add categorization guidance and rename or regroup only where low risk.

**Step 4: Run test to verify it passes**

Run: `npm.cmd run lint`
Expected: PASS

**Step 5: Commit**

```bash
git add docs scripts
git commit -m "docs: organize repository reference materials"
```

### Task 4: Final verification

**Files:**
- Modify: none unless verification fails

**Step 1: Write the failing test**

Define final verification commands.

**Step 2: Run test to verify it fails**

Run: `npm.cmd run lint`
Expected: PASS

**Step 3: Write minimal implementation**

If build or lint fails, make the smallest corrective change.

**Step 4: Run test to verify it passes**

Run: `npm.cmd run build`
Expected: PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: finalize case form and repository cleanup"
```
