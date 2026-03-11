# Decision Reason Enforcement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 受入不可と搬送辞退の全送信導線で理由入力を必須化し、理由コードを構造化して保存する。

**Architecture:** 理由定義は `lib` に切り出し、DB 保存は `hospital_request_events.reason_code/reason_text` に統一する。UI は共通ダイアログコンポーネントで選択させ、各送信導線はその結果を既存 API に渡す。

**Tech Stack:** Next.js App Router, React, TypeScript, PostgreSQL, Tailwind CSS

---

### Task 1: Add shared reason definitions

**Files:**
- Create: `lib/decisionReasons.ts`
- Modify: `lib/hospitalRequestSchema.ts`

**Step 1: Define reason code lists and validation helpers**

Add typed option arrays for hospital not-acceptable reasons and EMS transport-declined reasons.

**Step 2: Extend schema**

Add `reason_code TEXT` and `reason_text TEXT` to `hospital_request_events` with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.

### Task 2: Update status repository and APIs

**Files:**
- Modify: `lib/sendHistoryStatusRepository.ts`
- Modify: `app/api/hospitals/requests/[targetId]/status/route.ts`
- Modify: `app/api/cases/send-history/[id]/status/route.ts`
- Modify: `app/api/cases/send-history/route.ts`
- Modify: `app/api/paramedics/requests/[targetId]/decision/route.ts`
- Modify: `lib/casesClient.ts`
- Modify: `components/hospitals/useHospitalRequestApi.ts`

**Step 1: Accept reason fields in payloads**

Add `reasonCode` and `reasonText` to request bodies and client helpers.

**Step 2: Enforce validation**

Reject `NOT_ACCEPTABLE` and `TRANSPORT_DECLINED` without valid reason codes; require text for `OTHER`.

**Step 3: Persist structured reasons**

Write `reason_code` / `reason_text` into `hospital_request_events` for manual and auto decisions.

### Task 3: Add shared reason dialog

**Files:**
- Create: `components/shared/DecisionReasonDialog.tsx`

**Step 1: Build reusable modal**

Support title, reason options, selected code, optional free-text field, confirm button, and loading/error states.

### Task 4: Apply hospital-side reason flow

**Files:**
- Modify: `components/hospitals/HospitalRequestDetail.tsx`
- Modify: `components/hospitals/HospitalRequestsTable.tsx`
- Modify: `components/hospitals/HospitalConsultCasesTable.tsx`

**Step 1: Replace direct NOT_ACCEPTABLE confirm with reason dialog**

Use shared dialog everywhere hospital users can send `NOT_ACCEPTABLE`.

**Step 2: Forward reason payload to API**

Pass selected reason code and text into `updateStatus`.

### Task 5: Apply EMS-side reason flow

**Files:**
- Modify: `components/cases/CaseFormPage.tsx`
- Modify: `app/cases/search/page.tsx`

**Step 1: Replace direct TRANSPORT_DECLINED confirm with reason dialog**

Keep `TRANSPORT_DECIDED` as plain confirm.

**Step 2: Forward decline reasons to API**

Pass selected reason code and text via `updateTransportDecision` or direct fetch calls.

### Task 6: Validate

**Files:**
- Test: existing typecheck/lint only

**Step 1: Run typecheck**

Run: `npx.cmd tsc --noEmit`
Expected: PASS

**Step 2: Run lint**

Run: `npm.cmd run lint`
Expected: PASS
