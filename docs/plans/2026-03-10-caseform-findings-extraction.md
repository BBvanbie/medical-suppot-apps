# CaseForm Findings Extraction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `CaseFormPage` に残る所見レンダラ群を dedicated module に移して、page の可読性を改善する。

**Architecture:** 所見レンダラは `CaseFindingBodies.tsx` に集約し、`CaseFormPage` からは grouped props を渡して呼び出す。状態の source of truth は親に維持する。

**Tech Stack:** Next.js App Router, React client components, TypeScript, Tailwind CSS

---

### Task 1: Add findings module

**Files:**
- Create: `components/cases/CaseFindingBodies.tsx`

**Step 1: Move shared toggle UI**

- `plusMinus` を新 module に移す。

**Step 2: Move finding renderers**

- neuro/cardio/digestive/trauma の renderer を移す。

**Step 3: Group props**

- `findingState`, `findingActions`, `findingOptions` を type 化する。

### Task 2: Wire `CaseFormPage`

**Files:**
- Modify: `components/cases/CaseFormPage.tsx`

**Step 1: Import module**

- 新 module から renderer を利用する。

**Step 2: Build grouped objects**

- setter/value を grouped object にまとめる。

**Step 3: Replace inline renderers**

- page 内の長い renderer 定義を削除する。

### Task 3: Verify

**Files:**
- Modify: `components/cases/CaseFormPage.tsx`
- Test: local commands only

**Step 1: Run lint**

Run: `npm.cmd run lint`

**Step 2: Run build**

Run: `npm.cmd run build`
