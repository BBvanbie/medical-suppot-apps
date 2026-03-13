# AGENTS.md

## Project Overview

- This repository is a Next.js-based emergency transport support system for EMS teams, hospitals, and admins.
- The main product areas are case intake, patient summary, hospital search, consultation flow, and role-based admin/settings pages.
- Prefer durable, project-specific guidance over generic advice.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript 5
- ESLint 9
- Playwright E2E
- PostgreSQL via `pg`
- npm as the package manager

## Directory Map

- `app/`: routes, layouts, route-level loading UI, server actions/handlers nearby when applicable
- `components/`: feature UI grouped by domain (`cases`, `hospitals`, `settings`, `admin`, `shared`)
- `lib/`: schemas, repositories, auth helpers, formatting, domain logic
- `scripts/`: DB/setup/verification helpers and Codex workflow scripts
- `docs/`: implementation guides, specs, UI rules, design/implementation plans
- `.github/workflows/`: CI quality gates
- `skills/`: Codex role-specific skills for this repository

## Naming Rules

- Use TypeScript-first, explicit names that match existing patterns.
- React components: `PascalCase.tsx`
- Utility, repository, schema files: `camelCase.ts`
- Plan documents: `docs/plans/YYYY-MM-DD-<topic>-design.md` and `docs/plans/YYYY-MM-DD-<topic>-implementation.md`
- Keep route segment names and domain terms aligned with current product language: `cases`, `hospitals`, `settings`, `admin`, `paramedics`

## Implementation Principles

- Check existing patterns before editing. Match the nearest existing file instead of inventing a new pattern.
- Keep changes small and local. Do not combine feature work with broad refactors.
- Prefer type-safe changes and explicit schema/repository boundaries.
- Preserve role separation across `EMS`, `HOSPITAL`, and `ADMIN` flows.
- When changing API behavior, review auth, validation, audit logging, and UI callers together.
- When changing UI behavior, check loading, empty, error, and read-only states.
- Use UTF-8 for docs and UI text files.

## UI Principles

- Follow `docs/UI_RULES.md` before changing layout or styling.
- Preserve the existing desktop/iPad-first layout direction unless the task explicitly changes it.
- Reuse existing shells, cards, tables, dialogs, badges, and loading components before adding new abstractions.
- Keep Japanese UI copy consistent with current terminology.
- Fix text corruption before visual polish if an edited file has encoding issues.

## Change Rules

- Start by checking relevant files, docs, and recent plans.
- If the work changes behavior or introduces a new workflow, capture design/implementation notes in `docs/plans/`.
- Do not rewrite unrelated files to satisfy style preferences.
- Do not add dependencies unless the benefit is clear and local alternatives are insufficient.
- Prefer `rg` for search and direct file inspection before coding.
- Prefer existing scripts and CI checks instead of inventing one-off commands.

## Skill Routing

Use the matching skill proactively when the request clearly fits one of these roles.

- `skills/system-design`: requirements, scope, architecture, migration strategy
- `skills/frontend-ui`: React/Next UI work, layout tuning, interaction changes
- `skills/api-implementation`: route handlers, repositories, auth-aware server behavior
- `skills/test-check`: local verification, regression checks, test strategy
- `skills/code-review`: review-only tasks focused on defects and regressions
- `skills/security-audit`: auth, permissions, secrets, input handling, audit concerns
- `skills/db-design`: schema changes, data modeling, migration safety, query impact
- `skills/docs-writer`: specs, migration notes, operating docs, implementation writeups

## Command Conventions

- Prompt templates for common Codex instructions are documented in README.md under Codex Workflow and `PROMPT_TEMPLATES.md`. 


Use these repository commands as the default Codex execution path.

- `npm run lint`: ESLint
- `npm run typecheck`: TypeScript without emit
- `npm run check`: local default gate (`lint` + `typecheck`)
- `npm run check:full`: extended local gate with `build`
- `npm run review:changed`: summarize changed files and suggested skills/checks
- `npm run test:e2e`: Playwright E2E when the task touches user workflows

## Done Criteria

A change is complete only when all applicable items are true.

- The requested behavior or documentation exists in the repository.
- The change follows existing patterns and does not widen scope unnecessarily.
- Relevant docs or plans are updated when workflow, rules, or architecture changed.
- Applicable verification commands were run, or the reason they were not run is stated clearly.
- The final report is ordered as: conclusion, changes, cautions/remaining items.

## Verification Guide

Run the smallest sufficient set, then expand when risk is higher.

- Docs/config-only changes: `npm run lint`, `npm run typecheck` when applicable
- UI or TS code changes: `npm run check`
- Routing/build-impacting changes: `npm run check:full`
- Workflow changes: `npm run test:e2e` if the affected path is covered or should be covered

## Forbidden Actions

- Do not make broad refactors without an explicit request.
- Do not weaken auth or role checks for convenience.
- Do not edit secrets or environment-specific values unless the task requires it.
- Do not claim verification you did not run.
- Do not ignore failing checks without documenting the risk.
- Do not copy Claude Code structures verbatim if Codex-native guidance is clearer.


