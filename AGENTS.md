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
- Use UTF-8 for docs and UI text files, and preserve the existing encoding and line endings of edited files.

## Encoding / Text Safety

- This repository contains important Japanese text in UI labels, validation messages, notifications, comments, and docs.
- Treat all text-based files as UTF-8 unless inspection proves otherwise.
- Never change a file's encoding unintentionally.
- Preserve the existing encoding of each file when editing.
- Preserve existing line endings for each file. Do not normalize CRLF/LF unless the task explicitly requires a repository-wide conversion.
- Never replace Japanese characters with `?`, `�`, or corrupted mojibake text.
- If a file appears to use a legacy encoding or its encoding is unclear, inspect first and edit carefully instead of rewriting the file.
- Prefer minimal in-place edits over full-file regeneration for files containing Japanese text.
- Avoid shell or PowerShell bulk-replace operations on Japanese text files when a targeted edit is sufficient.
- After editing Japanese UI copy, docs, or messages, verify that the text still renders correctly.
- If encoding corruption is detected, stop further edits, restore the affected file to the last correct state, and report the file and triggering operation clearly.

## UI Principles

- Follow `docs/UI_RULES.md` before changing layout or styling.
- Default to 8px-based spacing unless the task explicitly calls for a different layout rule.
- Prioritize clear information hierarchy over generic, evenly balanced layouts.
- Design screens around `first look -> compare -> act`, so the main target is obvious at a glance.
- Use colors by role, not decoration: keep brand, action, status, and warning meanings separate.
- Preserve the existing desktop/iPad-first layout direction unless the task explicitly changes it.
- Reuse existing shells, cards, tables, dialogs, badges, and loading components before adding new abstractions.
- Keep Japanese UI copy consistent with current terminology.
- Fix text corruption before visual polish if an edited file has encoding issues.
- Keep long text, missing data, zero results, duplicates, and abnormal values from breaking the layout.

## Change Rules

- Start by checking relevant files, docs, and recent plans.
- If the work changes behavior or introduces a new workflow, capture design/implementation notes in `docs/plans/`.
- Do not rewrite unrelated files to satisfy style preferences.
- Do not add dependencies unless the benefit is clear and local alternatives are insufficient.
- Prefer `rg` for search and direct file inspection before coding.
- Prefer existing scripts and CI checks instead of inventing one-off commands.

## Skill Routing

This repository uses a repo-local-first skill policy.
The authoritative routing sources are `AGENTS.md`, repo-local `skills/`, and then repository code/docs/scripts.
Global or imported skills may exist in the environment, but they are not the default authority for project work.

Use the matching repo-local skill proactively when the request clearly fits one of these roles.

- `skills/system-design`: requirements, scope, architecture, migration strategy
- `skills/frontend-ui`: React/Next UI work, layout tuning, interaction changes
- `skills/api-implementation`: route handlers, repositories, auth-aware server behavior
- `skills/test-check`: local verification, regression checks, test strategy
- `skills/code-review`: review-only tasks focused on defects and regressions
- `skills/security-audit`: auth, permissions, secrets, input handling, audit concerns
- `skills/db-design`: schema changes, data modeling, migration safety, query impact
- `skills/docs-writer`: specs, migration notes, operating docs, implementation writeups

### Support Skills

The following global skills may be used only as narrow support references to a repo-local primary skill.
They must not become the primary routing layer for this repository.

- `next-best-practices`: only for Next.js runtime, App Router, rendering, or app-structure concerns
- `react-best-practices`: only for React component structure, rendering, or state-pattern concerns
- `tailwind-design-system`: only for Tailwind utility structure, token consistency, or class organization
- `web-design-guidelines`: only for narrow UI review or documented UI standards

### Non-standard Skills

The following skills must not be used as primary skills for normal repository work.

- `brainstorming`
- `find-skills`
- `frontend-design`
- `ui-ux-pro-max`

System skills such as `.system/skill-creator` and `.system/skill-installer` are operational tools only, and should be used only when the task is explicitly about creating or managing skills.
For the current inventory and origin summary, refer to `docs/skill-inventory-2026-03-16.md`.

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
