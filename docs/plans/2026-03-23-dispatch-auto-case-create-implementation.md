# Dispatch Auto Case Create Implementation Plan

**Goal:** `DISPATCH` ロールから最低限入力で事案起票し、EMS 一覧へ自動反映されるようにする。

**Architecture:** `cases` 単一テーブルを維持しつつ DISPATCH 用 API / repository / UI を分離する。

**Tech Stack:** Next.js App Router, React 19, TypeScript, PostgreSQL, ESLint

---

### Task 1: Extend role handling and route protection

**Files:**
- Modify: `lib/auth.ts`
- Modify: `lib/authContext.ts`
- Modify: `proxy.ts`
- Modify: `auth.config.ts`
- Modify: `lib/admin/adminManagementValidation.ts`
- Modify: `lib/admin/adminManagementRepository.ts`
- Modify: `components/admin/AdminUsersPage.tsx`
- Modify: `scripts/setup_auth.sql`

**Step 1: Add `DISPATCH` to shared role definitions**

確認事項:

- ログイン後の既定遷移先
- Auth.js role validation
- `AuthenticatedUser` 型

**Step 2: Extend route protection**

確認事項:

- `/dispatch` 配下は `DISPATCH` / `ADMIN` のみ
- 既存 `EMS` / `HOSPITAL` / `ADMIN` のアクセス制御を壊さない

**Step 3: Extend admin role editing**

確認事項:

- 管理画面で `DISPATCH` を選択できる
- `DISPATCH` は team / hospital 所属不要

### Task 2: Add dispatch schema and repository

**Files:**
- Create: `lib/dispatch/dispatchSchema.ts`
- Create: `lib/dispatch/dispatchValidation.ts`
- Create: `lib/dispatch/dispatchRepository.ts`

**Step 1: Ensure runtime schema compatibility**

確認事項:

- `users.role` 制約へ `DISPATCH` を追加できること
- `cases` に DISPATCH 用列を追加できること
- `patient_name` / `age` の未入力運用を妨げないこと

**Step 2: Implement create/list/team option repository**

確認事項:

- `emergency_teams` から候補取得
- advisory lock での日次採番
- `created_from = 'DISPATCH'` の履歴取得

### Task 3: Add dispatch API

**Files:**
- Create: `app/api/dispatch/cases/route.ts`

**Step 1: Implement GET for dispatch history**

期待結果:

- `DISPATCH` / `ADMIN` のみ一覧取得可能

**Step 2: Implement POST for new dispatch case**

期待結果:

- 必須入力検証
- 隊存在確認
- 事案 ID 採番
- `cases` 保存
- 成功時に `caseId` を返す

### Task 4: Add dispatch portal UI

**Files:**
- Create: `lib/dispatchNavItems.ts`
- Create: `components/dispatch/DispatchSidebar.tsx`
- Create: `components/dispatch/DispatchPortalShell.tsx`
- Create: `components/dispatch/DispatchCaseCreateForm.tsx`
- Create: `app/dispatch/layout.tsx`
- Create: `app/dispatch/page.tsx`
- Create: `app/dispatch/new/page.tsx`
- Create: `app/dispatch/cases/page.tsx`

**Step 1: Build shell and navigation**

確認事項:

- 既存 portal shell と同系統の見た目
- 起票画面 / 一覧画面へ移動できる

**Step 2: Build create form**

確認事項:

- 隊名はセレクトのみ
- 覚知日付 / 覚知時間 / 指令先住所の必須制御
- 成功 / 失敗メッセージ
- 送信後リセット

**Step 3: Build history table**

確認事項:

- 新しいものが上
- 隊名・覚知・住所・作成日時を一覧で確認できる

### Task 5: Keep EMS list behavior natural

**Files:**
- Modify: `components/cases/CaseSearchTable.tsx`

**Step 1: Treat placeholder age as empty**

期待結果:

- `age = 0` は `-` 表示になる

**Step 2: Confirm dispatch-created rows still appear in EMS list**

確認事項:

- `cases.team_id` フィルタに従って表示されること

### Task 6: Run verification

**Files:**
- Touched files above

**Step 1: Run repo checks**

Run: `npm run check`

**Step 2: Consider workflow verification depth**

確認事項:

- 追加 E2E が必要か
- 未実施なら理由を明記する
