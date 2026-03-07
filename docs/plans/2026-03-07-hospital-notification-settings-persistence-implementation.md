# Hospital Notification Settings Persistence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** HOSPITAL 側の通知設定と返信遅延通知しきい値を即時保存できるようにする。

**Architecture:** 既存 `hospital_settings` を拡張して通知設定を追加し、取得・更新は専用 route handler 経由で行う。UI は `/hp/settings/notifications` の page を server page のまま維持し、通知フォームだけを client component に分離して即時保存を行う。

**Tech Stack:** Next.js App Router, React, TypeScript, PostgreSQL, next-auth, Tailwind CSS

---

### Task 1: Extend Hospital Settings Schema and Repository for Notifications

**Files:**
- Modify: `C:\practice\medical-support-apps\lib\hospitalSettingsSchema.ts`
- Modify: `C:\practice\medical-support-apps\lib\hospitalSettingsRepository.ts`
- Modify: `C:\practice\medical-support-apps\lib\hospitalSettingsValidation.ts`

1. Add notification columns and reply delay minutes.
2. Add repository methods:
- `getHospitalNotificationSettings(hospitalId)`
- `updateHospitalNotificationSettings(hospitalId, patch)`
3. Add validation for notification payload.
4. Run `npm.cmd run lint`.
5. Commit.

### Task 2: Implement Hospital Notifications API

**Files:**
- Create: `C:\practice\medical-support-apps\app\api\settings\hospital\notifications\route.ts`

1. Require authenticated `HOSPITAL`.
2. Resolve `hospital_id` from logged-in user.
3. `GET` returns current values.
4. `PATCH` validates and updates.
5. Run `npm.cmd run lint`.
6. Commit.

### Task 3: Wire Hospital Notifications UI

**Files:**
- Modify: `C:\practice\medical-support-apps\app\hp\settings\notifications\page.tsx`
- Create: `C:\practice\medical-support-apps\components\settings\HospitalNotificationSettingsForm.tsx`

1. Replace static notification toggles with client form.
2. Add reply delay ON/OFF and minutes select.
3. Save immediately on change.
4. Show `saving / saved / error`.
5. Run `npm.cmd run lint`.
6. Commit.

### Task 4: Verify Persistence and Update Docs

**Files:**
- Modify if needed: `C:\practice\medical-support-apps\docs\IMPLEMENTATION_GUIDE.md`

1. Run `npm.cmd run lint`.
2. Run `npm.cmd run build`.
3. Verify DB persistence with a local smoke check.
4. Update implementation guide.
5. Commit.
