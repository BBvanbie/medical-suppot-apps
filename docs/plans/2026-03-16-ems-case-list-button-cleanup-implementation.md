# EMS Case List Button Cleanup Implementation Plan

**Goal:** EMS 事案一覧の重複導線と過剰な行高を解消し、一覧操作をより明快にする。

**Architecture:** ページ単位の UI 調整に留め、API やデータ構造は変更しない。

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, ESLint

---

### Task 1: Remove duplicate refresh action

**Files:**
- Modify: `app/cases/search/page.tsx`

**Step 1: Inspect the rendered header and trailing action block**

確認事項:

- `header` 内の主要操作
- `header` 外にある重複アクションブロック

**Step 2: Remove the trailing duplicate block**

期待結果:

- 更新導線が 1 箇所に整理される

**Step 3: Verify the page still renders the primary refresh action**

確認事項:

- ヘッダー主導線が残っていること
- レイアウトが崩れていないこと

### Task 2: Reduce row height caused by the detail button

**Files:**
- Modify: `components/cases/CaseSearchTable.tsx`

**Step 1: Inspect the current detail button classes**

確認事項:

- `flex-col`
- `h-14`
- `w-10`
- 2 行構成の `span`

**Step 2: Replace the stacked layout with a compact horizontal button**

期待結果:

- `inline-flex h-9 items-center justify-center rounded-lg ... px-3 text-xs` 系に寄せる
- 縦積みではなく 1 行の読みやすいボタンになる

**Step 3: Verify interaction behavior is unchanged**

確認事項:

- `stopPropagation()` が維持されること
- 既存の詳細導線が変わらないこと

### Task 3: Run lightweight verification

**Files:**
- Modify: `app/cases/search/page.tsx`
- Modify: `components/cases/CaseSearchTable.tsx`

**Step 1: Run lint**

Run: `npm run lint`

Expected: PASS for touched files

**Step 2: Summarize any remaining manual checks**

確認事項:

- EMS 一覧の更新導線が 1 つに見えること
- 詳細ボタン変更後も操作感が悪化していないこと
