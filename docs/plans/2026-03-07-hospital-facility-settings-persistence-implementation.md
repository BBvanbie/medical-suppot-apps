# Hospital Facility Settings Persistence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** HOSPITAL 側の施設設定で `displayContact` と `facilityNote` を確認付きで保存できるようにする。

**Architecture:** `hospital_settings` を病院単位の専用設定テーブルとして追加し、`facility` の readOnly 情報と editable 情報をまとめて返す repository を実装する。UI は `/hp/settings/facility` の server page に readOnly 情報を残しつつ、編集フォームだけを client component に分離して確認ダイアログ付き保存を行う。

**Tech Stack:** Next.js App Router, React, TypeScript, PostgreSQL, next-auth, Tailwind CSS

---

### Task 1: Add Hospital Settings Schema and Repository

**Files:**
- Create: `C:\practice\medical-support-apps\lib\hospitalSettingsSchema.ts`
- Create: `C:\practice\medical-support-apps\lib\hospitalSettingsRepository.ts`
- Create: `C:\practice\medical-support-apps\lib\hospitalSettingsValidation.ts`

1. Add `hospital_settings` schema ensure function.
2. Add default value factory.
3. Add repository methods:
- `getHospitalFacilitySettings(hospitalId)`
- `updateHospitalFacilitySettings(hospitalId, patch)`
4. Run `npm.cmd run lint`.
5. Commit.

### Task 2: Implement Hospital Facility API

**Files:**
- Create: `C:\practice\medical-support-apps\app\api\settings\hospital\facility\route.ts`

1. Require authenticated `HOSPITAL`.
2. Resolve `hospital_id` from logged-in user.
3. `GET` returns readOnly values plus editable values.
4. `PATCH` validates payload and upserts.
5. Run `npm.cmd run lint`.
6. Commit.

### Task 3: Wire Hospital Facility UI

**Files:**
- Modify: `C:\practice\medical-support-apps\app\hp\settings\facility\page.tsx`
- Create: `C:\practice\medical-support-apps\components\settings\HospitalFacilitySettingsForm.tsx`
- Reuse: `C:\practice\medical-support-apps\components\shared\ConfirmDialog.tsx`

1. Keep readOnly facility fields on the server-rendered page.
2. Replace static editable placeholders with a client form.
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
