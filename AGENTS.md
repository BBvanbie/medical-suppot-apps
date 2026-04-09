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
- `docs/`: implementation guides, specs, UI rules, workstreams, legacy/reference docs, design/implementation plans
- `.github/workflows/`: CI quality gates
- `skills/`: Codex role-specific skills for this repository

## Naming Rules

- Use TypeScript-first, explicit names that match existing patterns.
- React components: `PascalCase.tsx`
- Utility, repository, schema files: `camelCase.ts`
- Plan documents: `docs/plans/YYYY-MM-DD-<topic>-design.md` and `docs/plans/YYYY-MM-DD-<topic>-implementation.md`
- Current execution hub: `docs/current-work.md`
- Theme summaries: `docs/workstreams/*.md`
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

## Encoding / Text Safety Addendum

- If Japanese UI text is at risk of corruption during editing, prefer one of these approaches in order: safe in-place edit with preserved encoding, then Unicode escape literals in TS/TSX strings as a temporary transport-safe fallback.
- Do not leave user-facing text in a half-restored state. Literal mojibake, replacement characters, or visibly broken escape fragments must be fixed before continuing feature work.
- If Unicode escape literals are used in source, verify the rendered UI shows normal Japanese characters before considering the task complete. Source-level `\uXXXX` is acceptable only when runtime rendering is correct.
- Never assume `Get-Content`, terminal output, or diff output reflects actual browser rendering for escaped Japanese strings. Verify in app behavior or with a rendering-aware path.
- Do not treat PowerShell default output as the source of truth for Japanese text. When text integrity matters, prefer UTF-8 aware reads such as explicit UTF-8 decoding or browser/runtime verification before deciding a file is corrupted.
- Keep the repository encoding policy narrow: prefer UTF-8 consistently instead of allowing multiple encodings for convenience. Broader encoding tolerance increases silent corruption risk.
- Avoid rewriting whole Japanese-heavy UI files via PowerShell text concatenation unless there is no safer option. Prefer targeted edits and immediately re-open the edited file to inspect for corruption.
- After any edit to Japanese-heavy TSX/MD files, search for common corruption patterns such as mojibake, `?`, `?`, or unintended visible escape fragments, then run the applicable checks.
- Do not leave temporary placeholders such as `?`, `??`, `???`, or visually broken fallback markers in any user-facing UI text. Before finishing, search the touched files for placeholder remnants and replace them with final wording.
- When corruption was caused by an editing method, document that method in `AGENTS.md` or the relevant plan and avoid reusing it for the same file category.

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
- If implementation or docs work is performed based on an existing plan, spec, or `current-work` document, update that source document to reflect the latest status, scope, checks, and next steps before finishing.
- Treat `docs/current-work.md` as the single restart point for in-flight work. Do not create a new dated `current-work` file for routine continuation.
- Use `docs/workstreams/*.md` to track remaining work by theme. Keep `docs/plans/` as dated history and detailed rationale, not as the primary restart surface.
- Keep `docs/legacy/` for superseded docs, `docs/reference/` for lookup-only material, and `docs/domain/` for domain-specific supporting documents so `docs/` root stays limited to active entry points.
- Do not rewrite unrelated files to satisfy style preferences.
- Do not add dependencies unless the benefit is clear and local alternatives are insufficient.
- Prefer `rg` for search and direct file inspection before coding.
- Prefer existing scripts and CI checks instead of inventing one-off commands.

## Skill Routing

This repository uses a repo-local-first skill policy.
The authoritative routing sources are `AGENTS.md`, repo-local `skills/`, and then repository code/docs/scripts.
Global or imported skills may exist in the environment, but they are not the default authority for project work.

### Skill Policy Summary

- Treat repo-local skills in `skills/` as the authoritative working copy for this repository.
- Treat global or imported skills as source material, not as the default execution authority.
- If a repo-local skill is thinner than an available global skill, prefer strengthening the repo-local skill instead of switching the repository's routing policy.
- Preserve the current routing order even when repo-local skills are revised using global skills as reference material.
- When skill guidance conflicts, prefer `AGENTS.md`, then repo-local `skills/`, then repository code/docs/scripts.

Use the matching repo-local skill proactively when the request clearly fits one of these roles.

- `skills/system-design`: requirements, scope, architecture, migration strategy
- `skills/frontend-ui`: React/Next UI work, layout tuning, interaction changes
- `skills/api-implementation`: route handlers, repositories, auth-aware server behavior
- `skills/test-check`: local verification, regression checks, test strategy
- `skills/e2e-testing`: Playwright E2E authoring, focused workflow regression, selector/assertion strategy
- `skills/code-review`: review-only tasks focused on defects and regressions
- `skills/security-audit`: auth, permissions, secrets, input handling, audit concerns
- `skills/db-design`: schema changes, data modeling, migration safety, query impact
- `skills/docs-writer`: specs, migration notes, operating docs, implementation writeups

### Current Priority

- Frontend UI quality is the highest-priority skill investment area.
- When deciding which repo-local skill to strengthen first, prioritize `skills/frontend-ui`.
- After `frontend-ui`, prioritize testing workflow guidance, especially Playwright/E2E operating guidance that fits this repository's existing `e2e/` structure.

### Repo-local Skill Maintenance

- Repo-local skills may be expanded by copying from or adapting global skills when that improves quality.
- When doing so, keep the repo-local skill as the final authority and rewrite it to match this repository's constraints, naming, file layout, and verification flow.
- Do not leave repo-local skills as thin wrappers that only say "see global skill".
- If a repo-local skill is derived from a global skill, keep the durable repository-specific differences inside the repo-local file.
- Prefer targeted adaptation over blind copy:
  - keep reusable technique from the global skill
  - remove framework-agnostic advice that conflicts with this repository
  - add repo-specific file paths, commands, risks, and done criteria

### Recommended Skill Shape

- `frontend-ui` should become the main working skill for UI implementation in this repository, even if global React/Next/Tailwind skills are used as source material.
- `test-check` should stay focused on verification depth, command choice, and reporting, rather than becoming a full E2E authoring manual.
- If deeper Playwright guidance is needed, prefer adding or expanding a repo-local E2E-focused skill instead of overloading `test-check`.
- `db-design`, `code-review`, and `security-audit` should remain repo-specific first, because their value depends heavily on this repository's auth, persistence, and workflow rules.

### Support Skills

The following global skills may be used only as narrow support references to a repo-local primary skill.
They must not become the primary routing layer for this repository.

- `next-best-practices`: only for Next.js runtime, App Router, rendering, or app-structure concerns
- `react-best-practices`: only for React component structure, rendering, or state-pattern concerns
- `tailwind-design-system`: only for Tailwind utility structure, token consistency, or class organization
- `web-design-guidelines`: only for narrow UI review or documented UI standards

Support skills are reference material for improving or supplementing a repo-local primary skill.
They are not a shortcut for bypassing repo-local rules.

### Non-standard Skills

The following skills must not be used as primary skills for normal repository work.

- `brainstorming`
- `find-skills`
- `frontend-design`
- `ui-ux-pro-max`

System skills such as `.system/skill-creator` and `.system/skill-installer` are operational tools only, and should be used only when the task is explicitly about creating or managing skills.
For the current inventory and origin summary, refer to `docs/reference/skill-inventory-2026-03-16.md`.

### Practical Decision Rule

When a task touches an area covered by both a repo-local skill and a stronger global skill:

1. Route the task through the repo-local skill.
2. Use the global skill only as a narrow supporting reference if it adds useful depth.
3. If the repo-local skill repeatedly feels too thin, improve the repo-local skill and keep future work routed there.
4. Do not normalize project work around global skills just because they are more detailed today.

## Command Conventions

- Prompt templates for common Codex instructions are documented in README.md under Codex Workflow and `PROMPT_TEMPLATES.md`.

Use these repository commands as the default Codex execution path.

- `npm run lint`: ESLint
- `npm run typecheck`: TypeScript without emit
- `npm run check`: local default gate (`lint` + `typecheck`)
- `npm run check:full`: extended local gate with `build`
- `npm run review:changed`: summarize changed files and suggested skills/checks
- `npm run test:e2e`: Playwright E2E when the task touches user workflows
- `npm run browser:install`: install `agent-browser` browser runtime
- `npm run browser:close`: close all `agent-browser` sessions

## Browser Verification

- Use `agent-browser` for exploratory browser confirmation, UI inspection, reproduction, and screenshots against a running local app.
- Do not treat `agent-browser` as the regression test authority. Stable repeatable guarantees stay in Playwright.
- `localhost` startup is user-owned. If the local app is not running, ask the user to start it instead of launching it yourself.
- Before any browser interaction, take `snapshot -i --json` and confirm current refs.
- Do not run `click` or `fill` when the needed `ref` cannot be confirmed from the latest snapshot.
- After navigation, modal open, form submit, or any visible page state change, refresh the snapshot before the next action.
- Prefer `ref` first, then labels and roles, before guessing CSS selectors.
- When browser verification is performed, record what page was opened, what was clicked or filled, and what changed on screen.

## Approval Policy

Use the following execution policy as the default rule for this repository session unless the user explicitly overrides it.

- Treat all non-destructive operations as pre-approved.
- Do not stop to ask for approval for routine reads, workspace edits, repo-local docs updates, local verification commands, dependency installs, network-required commands, sandbox-escape reruns, or normal `git push origin main`.
- Use approval/escalation flags directly when the environment requires them instead of asking again.
- Stop and confirm only when the operation is difficult to undo.

### Pre-approved Operations

- Read-only inspection such as `rg`, `Get-Content`, `git diff`, and similar commands
- Editing files inside the workspace
- Updating repository docs and plans
- Non-destructive local commands including `npm run check`, `npm run check:full`, `playwright test`, lint, typecheck, build, and test commands
- Dependency installation, external/network access, and rerunning important commands with escalation when sandbox restrictions require it
- Normal pushes including `git push origin main`

### Must Confirm First

- Destructive operations such as large deletions, `rm`, `git reset --hard`, forced overwrite, or other difficult-to-recover file changes
- Existing data deletion, rollback, or broad one-shot cleanup/update operations against real data
- Production secrets edits
- Environment-specific value changes
- Applying large migrations
- High-risk actions that change real operational state

### Decision Rule

- Default to continuing without interruption.
- Ask only when the change is destructive, high-risk, or difficult to restore.
- If uncertain, use reversibility as the deciding factor.
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
- UI behavior checks on an already running local app: add focused `agent-browser` confirmation when it improves confidence

## Forbidden Actions

- Do not make broad refactors without an explicit request.
- Do not weaken auth or role checks for convenience.
- Do not edit secrets or environment-specific values unless the task requires it.
- Do not claim verification you did not run.
- Do not ignore failing checks without documenting the risk.
- Do not copy Claude Code structures verbatim if Codex-native guidance is clearer.
