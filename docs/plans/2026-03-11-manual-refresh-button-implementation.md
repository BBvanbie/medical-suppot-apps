# Manual Refresh Button Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace auto polling with manual refresh buttons across EMS and Hospital list screens and remove the EMS unread reply badge.

**Architecture:** Remove interval-based refresh, add explicit client-side refresh buttons, and keep existing fetch/refresh paths intact.

**Tech Stack:** Next.js App Router, React client components, `router.refresh()`, existing EMS fetch helpers.

---

### Task 1: Remove reply badge from EMS selection history
- Modify: `components/cases/CaseSearchTable.tsx`
- Keep `CaseSelectionHistoryTable` generic, but stop passing `showReplyBadge`

### Task 2: Replace EMS auto refresh with manual refresh
- Modify: `app/cases/search/page.tsx`
- Remove polling refs/effects
- Add `更新` button and `refreshing` state
- Re-fetch rows and expanded targets on click

### Task 3: Replace Hospital auto refresh with manual refresh
- Delete: `components/shared/AutoRefreshOnInterval.tsx`
- Create: `components/shared/ManualRefreshButton.tsx`
- Modify: `app/hospitals/requests/page.tsx`
- Modify: `app/hospitals/patients/page.tsx`
- Modify: `app/hospitals/consults/page.tsx`
- Modify: `app/hospitals/declined/page.tsx`
- Modify: `app/hospitals/medical-info/page.tsx`

### Task 4: Verify
- Run: `npx.cmd tsc --noEmit`
- Run: `npm.cmd run lint`
- Run: `npm.cmd run build`
