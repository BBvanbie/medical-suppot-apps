# Home Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a desktop/iPad-focused home dashboard with a collapsible sidebar and past-case table for the emergency transport support system.

**Architecture:** Use `app/page.tsx` as a thin entry point and split UI into `components/home` modules. Keep mock data local for now, and define navigation and detail links that align with future route expansion.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS v4

---

### Task 1: Dashboard Shell and Sidebar

**Files:**
- Create: `components/home/HomeDashboard.tsx`
- Create: `components/home/Sidebar.tsx`

**Step 1: Build a client-side dashboard shell**
- Add sidebar open/close state and base two-column layout.

**Step 2: Build sidebar menu and footer**
- Add menu links for Home, Case Search, Hospital Search, Settings.
- Add unit metadata footer: unit name and small ID label.

**Step 3: Add smooth sidebar interaction**
- Use width transition and label fade/slide transitions.

### Task 2: Cases Table

**Files:**
- Create: `components/home/CasesTable.tsx`
- Modify: `components/home/HomeDashboard.tsx`

**Step 1: Define mock case data (10 rows)**
- Include all required fields and undecided destination handling.

**Step 2: Implement table card**
- Add required columns and action column.
- Add row hover styles and details link per row.

### Task 3: Route Entry and Styling

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

**Step 1: Route entry**
- Replace template page with dashboard component.

**Step 2: Global style tokens**
- Define white-base dashboard palette and reusable colors.
- Keep layout tuned for desktop and iPad landscape.

**Step 3: Metadata**
- Update title/description to project domain.

### Task 4: Verification

**Files:**
- Modify: none

**Step 1: Run lint**
- Command: `npm run lint`
- Expected: no lint errors.

**Step 2: Build confidence checks**
- Confirm sidebar transition, table structure, and link wiring.
