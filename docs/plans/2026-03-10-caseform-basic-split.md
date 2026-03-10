# CaseForm Basic Split Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `CaseFormPage` の `基本情報` タブ UI を dedicated component に分離し、既存挙動を維持したまま page を薄くする。

**Architecture:** `CaseFormPage` は state と derived values を保持し、`CaseFormBasicTab` は入力 UI を受け持つ。既存 helper と sub-row は再利用し、ロジックの再配置は最小限にとどめる。

**Tech Stack:** Next.js App Router, React client components, TypeScript, Tailwind CSS

---

### Task 1: Add basic tab component

**Files:**
- Create: `components/cases/CaseFormBasicTab.tsx`

**Step 1: Move basic tab layout**

- `基本情報`, `関係者`, `既往歴・かかりつけ` の UI を新 component に移す。

**Step 2: Keep updates in parent**

- `onChange` は props 経由で親 state を更新する形を維持する。

### Task 2: Wire `CaseFormPage`

**Files:**
- Modify: `components/cases/CaseFormPage.tsx`

**Step 1: Import `CaseFormBasicTab`**

- 既存の `basic` JSX を置換する。

**Step 2: Pass state and handlers**

- `name`, `gender`, `birth`, `relatedPeople`, `pastHistories`, `specialNote` などを渡す。

### Task 3: Verify

**Files:**
- Modify: `components/cases/CaseFormPage.tsx`
- Test: local commands only

**Step 1: Run lint**

Run: `npm.cmd run lint`

**Step 2: Run build**

Run: `npm.cmd run build`
