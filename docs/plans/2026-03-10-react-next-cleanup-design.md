# React/Next Cleanup Design

**Date:** 2026-03-10

## Scope

This cleanup targets the full repository except `.env.local`.

- Runtime code: `app/`, `components/`, `lib/`, `auth.ts`, `auth.config.ts`, `next.config.ts`, `proxy.ts`
- Support assets and records: `public/`, `tmp/`, `docs/`, `scripts/`
- Explicit exclusion: `.env.local`

## Goals

- Remove unused code, assets, temporary backups, and stale planning artifacts.
- Reduce duplication where the refactor is behavior-preserving and low risk.
- Improve repository structure so implemented work, pending plans, and disposable artifacts are easier to distinguish.
- Keep user-visible behavior stable during the first pass, then apply stronger structural cleanup in a second pass.

## Constraints

- Prioritize safe deletions and low-risk refactors before route or architecture changes.
- Do not revert unrelated user changes.
- Use current Next.js App Router conventions and React/Next serialization guidance.

## Approach Options

### Option 1: Safe cleanup first, structural cleanup second

- First remove obviously unused files, assets, wrappers, and stale records.
- Then consolidate thin route wrappers and duplicate layout shells.
- Lowest risk and easiest to verify incrementally.

### Option 2: Audit-only pass

- Produce an inventory without deleting much.
- Safest but leaves most clutter in place.

### Option 3: Full structural rewrite now

- Reorganize settings/routes/components immediately.
- Highest payoff, but too risky for a first pass.

## Decision

Use Option 1 now, then continue into selected structural cleanup after the safe pass is complete.

## Planned Phases

### Phase A: Safe removal

- Delete disposable backup material in `tmp/`
- Delete unused starter assets in `public/`
- Remove unreferenced runtime files and imports when verified
- Prune stale or superseded planning/checkpoint documents where safe

### Phase B: Low-risk deduplication

- Collapse trivial wrapper routes/components
- Consolidate duplicated EMS shell/page structure where behavior does not change
- Prefer direct imports and minimal client prop payloads

### Phase C: Stronger structural cleanup

- Revisit route/layout organization after the safe pass
- Normalize duplicated page patterns between EMS and hospital settings where it can be done without mixing responsibilities

### Phase D: Verification

- Run lint
- Run targeted checks on changed routes/components
- Summarize residual risk instead of guessing

## Implementation Notes

- For read-heavy App Router pages, keep data fetching in Server Components where possible.
- Avoid introducing new API layers for internal reads.
- Keep RSC-to-client props minimal during cleanup if any boundary changes are needed.
