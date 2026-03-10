# CaseForm Vitals Split Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `CaseFormPage` の `要請概要・バイタル` タブを child components に分割して可読性を改善し、既存挙動を維持する。

**Architecture:** `CaseFormPage` は state とイベント処理だけを持ち、`vitals` タブの表示は専用 components に委譲する。入力値の source of truth は維持し、props 経由で更新する。

**Tech Stack:** Next.js App Router, React client components, TypeScript, Tailwind CSS

---

### Task 1: Add vitals tab components

**Files:**
- Create: `components/cases/CaseFormVitalsTab.tsx`
- Create: `components/cases/CaseVitalInputs.tsx`
- Create: `components/cases/CaseFindingsAccordion.tsx`

**Step 1: Create `CaseVitalInputs.tsx`**

- Move `要請概要`, `本人の主訴`, `基本バイタル` の表示ブロックを受け取れる props 形にする。

**Step 2: Create `CaseFindingsAccordion.tsx`**

- `所見` セクションのアコーディオン UI を page から抽出する。

**Step 3: Create `CaseFormVitalsTab.tsx`**

- 上記 2 component をまとめ、`vitals` タブの見た目を構成する。

### Task 2: Wire `CaseFormPage`

**Files:**
- Modify: `components/cases/CaseFormPage.tsx`

**Step 1: Import new components**

- `summary/history` と同様に `vitals` も外部 component を使う。

**Step 2: Pass state and handlers**

- state は page に残し、表示 component へ必要な props を渡す。

**Step 3: Keep behavior unchanged**

- save, navigate, findings summary, transport actions には触れない。

### Task 3: Verify

**Files:**
- Modify: `components/cases/CaseFormPage.tsx`
- Test: local commands only

**Step 1: Run lint**

Run: `npm.cmd run lint`

**Step 2: Run build**

Run: `npm.cmd run build`

**Step 3: Review diff**

- `CaseFormPage` が薄くなり、挙動差分がないことを確認する。
