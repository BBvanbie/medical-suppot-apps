# Hospital Operations Settings Persistence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** HOSPITAL 側の要相談テンプレートと受入不可テンプレートを確認付きで保存できるようにする。

**Architecture:** 既存 `hospital_settings` を拡張して運用テンプレートを追加し、取得・更新は専用 route handler 経由で行う。UI は `/hp/settings/operations` の page を server page のまま維持し、編集フォームだけを client component に分離して差分チェックと確認付き保存を実装する。

**Tech Stack:** Next.js App Router, React, TypeScript, PostgreSQL, next-auth, Tailwind CSS

---

### Task 1: Extend Hospital Settings Schema and Repository

**Files:**
- Modify: `C:\practice\medical-support-apps\lib\hospitalSettingsSchema.ts`
- Modify: `C:\practice\medical-support-apps\lib\hospitalSettingsRepository.ts`
- Modify: `C:\practice\medical-support-apps\lib\hospitalSettingsValidation.ts`

1. Add `consult_template` and `decline_template`.
2. Add repository methods:
- `getHospitalOperationsSettings(hospitalId)`
- `updateHospitalOperationsSettings(hospitalId, patch)`
3. Add validation for operations payload.
4. Run `npm.cmd run lint`.
5. Commit.

### Task 2: Implement Hospital Operations API

**Files:**
- Create: `C:\practice\medical-support-apps\app\api\settings\hospital\operations\route.ts`

1. Require authenticated `HOSPITAL`.
2. Resolve `hospital_id` from logged-in user.
3. `GET` returns current values.
4. `PATCH` validates and updates.
5. Run `npm.cmd run lint`.
6. Commit.

### Task 3: Wire Hospital Operations UI

**Files:**
- Modify: `C:\practice\medical-support-apps\app\hp\settings\operations\page.tsx`
- Create: `C:\practice\medical-support-apps\components\settings\HospitalOperationsSettingsForm.tsx`

1. Replace static textareas with client form.
2. Add diff check before save.
3. Show confirm dialog before save.
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
