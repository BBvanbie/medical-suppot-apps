# Global Spacing System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `app/` ???????????????????????????????????

**Architecture:** shell token + reusable layout primitive ???????????shared component ??????????????????????? primitive ???????

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, ESLint

---

### Task 1: Add spacing primitives

**Files:**
- Create: `components/layout/PageFrame.tsx`
- Create: `components/layout/PageSection.tsx`
- Create: `components/layout/ContentCard.tsx`
- Create: `components/layout/ActionRow.tsx`
- Create: `components/layout/FormStack.tsx`
- Create: `components/layout/TableSection.tsx`

### Task 2: Add global tokens

**Files:**
- Modify: `app/globals.css`

### Task 3: Apply to shared shells and settings/admin shared components

**Files:**
- Modify: `components/shared/PortalShellFrame.tsx`
- Modify: `components/admin/AdminPortalShell.tsx`
- Modify: `components/settings/SettingPageLayout.tsx`
- Modify: `components/settings/SettingSection.tsx`
- Modify: `components/settings/SettingCard.tsx`
- Modify: `components/settings/SettingLinkCard.tsx`
- Modify: `components/settings/SettingsOverviewPage.tsx`

### Task 4: Apply to direct pages that bypass shells

**Files:**
- Modify: `app/login/page.tsx`
- Modify: `app/cases/[caseId]/page.tsx`
- Modify: `components/cases/CaseFormPage.tsx`
- Modify: `components/hospitals/HospitalSearchPage.tsx`
- Modify: `components/hospitals/TransferRequestConfirmPage.tsx`
- Modify: `components/hospitals/TransferRequestCompletedPage.tsx`

### Task 5: Verify

**Step 1:** `npm.cmd run lint`

**Step 2:** summarize major coverage and exceptions
