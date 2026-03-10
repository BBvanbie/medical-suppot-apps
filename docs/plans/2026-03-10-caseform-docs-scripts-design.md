# CaseFormPage and Repository Hygiene Design

**Date:** 2026-03-10

## Scope

- `components/cases/CaseFormPage.tsx`
- related case UI text around `app/cases/*`
- `docs/`
- `scripts/`

## Goals

- Remove remaining mojibake and unclear UI text from the case form surface.
- Split obviously oversized display-only blocks out of `CaseFormPage` without changing behavior.
- Reorganize documentation and scripts so active, historical, and one-off assets are easier to distinguish.

## Constraints

- Preserve current case form behavior, API calls, and data flow.
- Do not redesign the form workflow.
- Prefer extraction of display-only sections over broad state refactors.

## Options

### Option 1: Safe text cleanup plus light extraction

- Fix visible strings first.
- Extract the largest display-only sections from `CaseFormPage`.
- Add lightweight docs/scripts categorization.

### Option 2: Text-only cleanup

- Lowest risk.
- Leaves structural problems in place.

### Option 3: Heavy component split and folder reorg

- Bigger long-term payoff.
- Higher regression risk and slower verification.

## Decision

Use Option 1.

## Planned Design

### Case Form

- Normalize broken labels, headings, placeholders, dialog copy, and empty states.
- Extract patient summary and send-history presentation blocks where the extracted component can stay stateless.
- Keep state ownership inside `CaseFormPage`.

### Docs

- Keep `design` and `implementation` plans in `docs/plans/`.
- Introduce lightweight categorization guidance rather than deleting historical plan pairs.
- Clarify which top-level docs are current references vs historical support material.

### Scripts

- Group by purpose through documentation, naming guidance, and folder-level explanation.
- Distinguish setup/seed scripts from one-off repair or migration scripts.
- Avoid deleting repair scripts unless clearly obsolete and unreferenced.

### Verification

- `npm.cmd run lint`
- `npm.cmd run build`

