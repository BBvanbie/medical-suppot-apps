# Route Loading Coverage Implementation Plan

**Goal:** Missing App Router segments should render a loading state during navigation without adding unnecessary duplicate files.

**Architecture:** Add route-level `loading.tsx` files at the highest useful segment and reuse existing shared skeleton components.

**Tech Stack:** Next.js App Router, React, existing shared loading components.

---

### Task 1: Add root and cases segment loading routes
- Create: `app/loading.tsx`
- Create: `app/cases/loading.tsx`
- Reuse dashboard/list skeletons to match existing route patterns

### Task 2: Add page-specific loading routes where shared coverage is not sufficient
- Create: `app/cases/new/loading.tsx`
- Create: `app/login/loading.tsx`
- Keep login skeleton local to the route because it is single-use

### Task 3: Verify
- Run: `npm run check`
