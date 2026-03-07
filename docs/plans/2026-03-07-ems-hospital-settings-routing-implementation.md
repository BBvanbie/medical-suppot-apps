# EMS and Hospital Settings Routing Separation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** EMS の `/settings/*` と HOSPITAL の `/hp/settings/*` を分離し、ロール別設定導線と `readOnly / editable` の土台UIを仕様に沿って整える。

**Architecture:** 設定ページはロール別に完全分離し、再利用は `components/settings/` の primitive に限定する。認可は `proxy.ts` のルート保護で先に固定し、画面では既存DBから取得できる情報を使って EMS/HOSPITAL それぞれの設定トップと詳細ページ群を構成する。

**Tech Stack:** Next.js App Router, React, TypeScript, PostgreSQL, next-auth, Tailwind CSS

---

### Task 1: Update Routing and Sidebar Entry Points

**Files:**
- Modify: `C:\practice\medical-support-apps\proxy.ts`
- Modify: `C:\practice\medical-support-apps\components\home\Sidebar.tsx`
- Modify: `C:\practice\medical-support-apps\components\hospitals\HospitalSidebar.tsx`

1. Extend route protection so `/settings/*` is EMS-only and `/hp/settings/*` is HOSPITAL-only.
2. Keep EMS sidebar `設定` pointing to `/settings`.
3. Change HOSPITAL sidebar `設定` to `/hp/settings`.
4. Run `npm.cmd run lint`.
5. Commit.

### Task 2: Add Shared Settings UI Helpers for Role Pages

**Files:**
- Create or Modify: `C:\practice\medical-support-apps\components\settings\...`

1. Add only the missing shared helpers needed by EMS/HOSPITAL pages.
2. Support:
- link cards for section navigation
- readOnly badge or shell
- simple field shell for editable-looking placeholders
3. Run `npm.cmd run lint`.
4. Commit.

### Task 3: Implement EMS Settings Top and Detail Routes

**Files:**
- Modify: `C:\practice\medical-support-apps\app\settings\page.tsx`
- Create: `C:\practice\medical-support-apps\app\settings\device\page.tsx`
- Create: `C:\practice\medical-support-apps\app\settings\sync\page.tsx`
- Create: `C:\practice\medical-support-apps\app\settings\notifications\page.tsx`
- Create: `C:\practice\medical-support-apps\app\settings\display\page.tsx`
- Create: `C:\practice\medical-support-apps\app\settings\input\page.tsx`
- Create: `C:\practice\medical-support-apps\app\settings\support\page.tsx`
- Create or Modify: `C:\practice\medical-support-apps\lib\emsOperator.ts`

1. Replace the placeholder `/settings` with an EMS settings top page.
2. Load EMS operator/team information from existing DB tables.
3. Build detail pages with the right section purpose:
- `device`: readOnly
- `sync`: mixed but placeholder-safe
- `notifications`: editable-looking controls
- `display`: editable-looking controls
- `input`: editable-looking controls
- `support`: readOnly
4. Run `npm.cmd run lint`.
5. Commit.

### Task 4: Implement Hospital Settings Top and Detail Routes

**Files:**
- Create: `C:\practice\medical-support-apps\app\hp\settings\page.tsx`
- Create: `C:\practice\medical-support-apps\app\hp\settings\facility\page.tsx`
- Create: `C:\practice\medical-support-apps\app\hp\settings\operations\page.tsx`
- Create: `C:\practice\medical-support-apps\app\hp\settings\notifications\page.tsx`
- Create: `C:\practice\medical-support-apps\app\hp\settings\display\page.tsx`
- Create: `C:\practice\medical-support-apps\app\hp\settings\support\page.tsx`
- Create or Modify: `C:\practice\medical-support-apps\lib\hospitalOperator.ts`

1. Add the HOSPITAL settings route group under `/hp/settings`.
2. Load hospital identity/facility info from existing DB tables.
3. Build pages with mixed permissions:
- `facility`: readOnly + editable-looking fields
- `operations`: editable-looking template areas
- `notifications`: editable-looking controls
- `display`: editable-looking controls
- `support`: readOnly
4. Run `npm.cmd run lint`.
5. Commit.

### Task 5: Role Access Validation and Build Verification

**Files:**
- Review: `C:\practice\medical-support-apps\docs\IMPLEMENTATION_GUIDE.md`
- Modify if needed: `C:\practice\medical-support-apps\docs\IMPLEMENTATION_GUIDE.md`

1. Run `npm.cmd run lint`.
2. Run `npm.cmd run build`.
3. Verify route expectations:
- EMS can open `/settings/*`
- HOSPITAL can open `/hp/settings/*`
- ADMIN cannot open either branch
4. Update implementation guide if route map changed materially.
5. Commit.
