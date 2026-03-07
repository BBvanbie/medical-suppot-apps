# EMS Settings Persistence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** EMS の通知設定、表示設定、入力補助設定を永続化し、設定画面から即時保存できるようにする。

**Architecture:** `ems_user_settings` を EMS ユーザー単位の専用設定テーブルとして追加し、取得と更新は route handler 経由で行う。UI は `/settings/notifications`、`/settings/display`、`/settings/input` の各ページから client component 経由で API に接続し、保存状態をセクション単位で表示する。

**Tech Stack:** Next.js App Router, React, TypeScript, PostgreSQL, next-auth, Tailwind CSS

---

### Task 1: Add EMS Settings Schema and Repository

**Files:**
- Create: `C:\practice\medical-support-apps\lib\emsSettingsSchema.ts`
- Create: `C:\practice\medical-support-apps\lib\emsSettingsRepository.ts`
- Create: `C:\practice\medical-support-apps\lib\emsSettingsValidation.ts`

1. Add `ems_user_settings` schema ensure function.
2. Add default value factory.
3. Add repository methods:
- `getEmsNotificationSettings(userId)`
- `updateEmsNotificationSettings(userId, patch)`
- `getEmsDisplaySettings(userId)`
- `updateEmsDisplaySettings(userId, patch)`
- `getEmsInputSettings(userId)`
- `updateEmsInputSettings(userId, patch)`
4. Run `npm.cmd run lint`.
5. Commit.

### Task 2: Implement EMS Settings APIs

**Files:**
- Create: `C:\practice\medical-support-apps\app\api\settings\ambulance\notifications\route.ts`
- Create: `C:\practice\medical-support-apps\app\api\settings\ambulance\display\route.ts`
- Create: `C:\practice\medical-support-apps\app\api\settings\ambulance\input\route.ts`
- Modify if needed: `C:\practice\medical-support-apps\lib\authContext.ts`

1. Require authenticated `EMS`.
2. Ensure schema exists before access.
3. `GET` returns current or default values.
4. `PATCH` validates payload and upserts.
5. Run `npm.cmd run lint`.
6. Commit.

### Task 3: Wire Notifications Settings UI

**Files:**
- Modify: `C:\practice\medical-support-apps\app\settings\notifications\page.tsx`
- Create: `C:\practice\medical-support-apps\components\settings\EmsNotificationsSettingsForm.tsx`
- Reuse: `C:\practice\medical-support-apps\components\settings\SettingSaveStatus.tsx`

1. Convert static notification page into server page + client form.
2. Fetch initial values from API or repository.
3. Save on toggle change with loading/error state.
4. Run `npm.cmd run lint`.
5. Commit.

### Task 4: Wire Display Settings UI

**Files:**
- Modify: `C:\practice\medical-support-apps\app\settings\display\page.tsx`
- Create: `C:\practice\medical-support-apps\components\settings\EmsDisplaySettingsForm.tsx`

1. Convert static display page into server page + client form.
2. Save on select change with status feedback.
3. Preserve current values on refresh.
4. Run `npm.cmd run lint`.
5. Commit.

### Task 5: Wire Input Settings UI

**Files:**
- Modify: `C:\practice\medical-support-apps\app\settings\input\page.tsx`
- Create: `C:\practice\medical-support-apps\components\settings\EmsInputSettingsForm.tsx`

1. Convert static input page into server page + client form.
2. Save on toggle change with status feedback.
3. Keep UI consistent with notifications page behavior.
4. Run `npm.cmd run lint`.
5. Commit.

### Task 6: Verify Persistence and Update Docs

**Files:**
- Modify if needed: `C:\practice\medical-support-apps\docs\IMPLEMENTATION_GUIDE.md`

1. Run `npm.cmd run lint`.
2. Run `npm.cmd run build`.
3. Verify DB persistence with a local smoke check.
4. Update implementation guide with the new EMS settings persistence state.
5. Commit.
