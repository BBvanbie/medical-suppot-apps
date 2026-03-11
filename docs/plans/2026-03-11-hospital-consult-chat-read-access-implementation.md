# Hospital Consult Chat READ Access Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `ConsultChatModal` を使う HP 側画面で `READ` と `NEGOTIATING` の両方から相談チャットを開け、テンプレート選択をチャット内で共通利用できるようにする。

**Architecture:** 相談チャットの起動可否は `lib` の共通関数へ切り出し、各テーブルはその関数を参照してボタン表示をそろえる。テンプレート本文は各ページで病院設定から取得し、`ConsultChatModal` へ props で渡す。

**Tech Stack:** Next.js App Router, React client components, TypeScript, Tailwind CSS

---

### Task 1: Add shared consult-chat eligibility helper

**Files:**
- Create: `lib/hospitalConsultChat.ts`

**Step 1: Write the helper**

```ts
const CONSULTABLE_STATUSES = new Set(["READ", "NEGOTIATING"]);
export function canOpenHospitalConsultChat(status: string): boolean {
  return CONSULTABLE_STATUSES.has(String(status ?? "").trim().toUpperCase());
}
```

**Step 2: Verify usages compile after import**

Run: `npx.cmd tsc --noEmit`
Expected: imports resolve and no new type errors from helper

### Task 2: Update hospital requests table

**Files:**
- Modify: `components/hospitals/HospitalRequestsTable.tsx`

**Step 1: Replace inline `NEGOTIATING` check**

Use `canOpenHospitalConsultChat(row.status)` for the consult button visibility.

**Step 2: Keep modal behavior unchanged**

Opening from `READ` should still send `NEGOTIATING` with the entered note.

**Step 3: Verify manually by code path**

Check that `openConsult(row)` still loads messages and that template selection remains inside `ConsultChatModal`.

### Task 3: Update hospital patients page and table

**Files:**
- Modify: `app/hospitals/patients/page.tsx`
- Modify: `components/hospitals/HospitalPatientsTable.tsx`

**Step 1: Fetch consult template on page load**

Load `getHospitalOperationsSettings(user.hospitalId).consultTemplate` and pass it into the table.

**Step 2: Enable consult chat from `READ`**

Use `canOpenHospitalConsultChat(row.status)` instead of `row.status === "NEGOTIATING"`.

**Step 3: Add template selection to `ConsultChatModal` props**

Mirror the request table pattern so selecting the template fills `consultNote` while allowing free-text edits.

### Task 4: Validate

**Files:**
- Test: existing typecheck/lint only

**Step 1: Run typecheck**

Run: `npx.cmd tsc --noEmit`
Expected: PASS

**Step 2: Run lint**

Run: `npm.cmd run lint`
Expected: PASS
