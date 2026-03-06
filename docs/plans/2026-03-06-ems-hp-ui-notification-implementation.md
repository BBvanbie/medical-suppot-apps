# EMS/HP Unified UI and Notifications Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** EMS側/病院側のUIを仕様に合わせて整理統合し、通知バッジ・ポップアップ通知をDB/API/UIまで一貫実装する。

**Architecture:** 既存の業務APIを維持しつつ、共通レイアウト/共通モーダルに寄せて重複を削減する。通知は新規テーブル+ユーティリティでイベント生成し、専用APIをポーリングして表示する。

**Tech Stack:** Next.js App Router, React, TypeScript, PostgreSQL, next-auth

---

### Task 1: Notification Infrastructure

**Files:**
- Modify: `lib/hospitalRequestSchema.ts`
- Create: `lib/notifications.ts`
- Create: `app/api/notifications/route.ts`

1. Add `notifications` table and indexes in schema ensure function.
2. Add helper functions:
- `createNotification(...)`
- `listNotificationsForCurrentUser(...)`
- `markNotificationsRead(...)`
3. Implement API:
- `GET` summary + latest list
- `PATCH` mark read (single/all/menu/tab)

### Task 2: Workflow Emit Integration

**Files:**
- Modify: `app/api/cases/send-history/route.ts`
- Modify: `app/api/hospitals/requests/[targetId]/status/route.ts`
- Modify: `app/api/cases/consults/[targetId]/route.ts`
- Modify: `app/api/hospitals/requests/[targetId]/consult/route.ts`

1. Add notification emits at each business transition.
2. Keep existing transition constraints unchanged.
3. Ensure title/body/menu_key/tab_key are consistent with UI routing.

### Task 3: Shared Layout Consolidation

**Files:**
- Create: `components/shared/PortalShell.tsx`
- Create: `components/shared/Topbar.tsx`
- Create: `components/shared/AppSidebar.tsx`
- Modify: `components/home/Sidebar.tsx`
- Modify: `components/hospitals/HospitalSidebar.tsx`
- Modify: `components/hospitals/HospitalPortalShell.tsx`
- Modify: `components/cases/CaseFormPage.tsx`
- Modify: `app/cases/search/page.tsx`

1. Build shared topbar/sidebar with role theme support.
2. Keep menu sets role-specific and spec-compliant.
3. Add notification bell + badge in topbar.

### Task 4: Shared Consult Modal

**Files:**
- Create: `components/shared/ConsultChatModal.tsx`
- Modify: `app/cases/search/page.tsx`
- Modify: `components/cases/CaseFormPage.tsx`
- Modify: `components/hospitals/HospitalRequestsTable.tsx`
- Modify: `components/hospitals/HospitalPatientsTable.tsx`

1. Move chat UI/actions into shared modal component.
2. Rewire existing pages to use callbacks + shared render.
3. Ensure button active rules follow status constraints.

### Task 5: EMS/HP List and Tabs Spec Alignment

**Files:**
- Modify: `app/cases/search/page.tsx`
- Modify: `components/cases/CaseFormPage.tsx`
- Modify: `app/hospitals/requests/page.tsx`
- Modify: `app/hospitals/patients/page.tsx`
- Create: `app/hospitals/consults/page.tsx`
- Create: `app/hospitals/declined/page.tsx`
- Modify: `components/hospitals/HospitalRequestsTable.tsx`
- Modify: `components/hospitals/HospitalPatientsTable.tsx`

1. EMS事案一覧を親子テーブル仕様に揃える。
2. EMS事案詳細タブに `選定履歴/相談一覧` を仕様表示。
3. HP側メニュー4一覧を揃える。

### Task 6: Notification UI Wiring

**Files:**
- Create: `components/shared/NotificationBell.tsx`
- Create: `components/shared/NotificationToastHost.tsx`
- Modify: shared shell/topbar/sidebar users

1. Implement polling hook (15 sec).
2. Show unread count, red dots, and toast popups.
3. Implement read updates on route/tab open.

### Task 7: Cleanup and Verification

**Files:**
- Delete/Consolidate obsolete pages found during integration
- Update: `docs/IMPLEMENTATION_GUIDE.md` (if route map changed)

1. Remove redundant pages/routes no longer used.
2. Run `npm run lint` and targeted smoke checks.
3. Fix TypeScript/lint errors and summarize remaining risk.
