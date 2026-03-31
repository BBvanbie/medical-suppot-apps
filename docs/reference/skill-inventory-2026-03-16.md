# Skill Inventory 2026-03-16

## Purpose

This document summarizes the skill configuration as of 2026-03-16 in a format that AI can analyze directly.
This repository does not use a single skill source. Skills are split across three layers, but normal project work follows a repo-local-first policy.

## Authoritative Order

For this repository, the authoritative sources are ordered as follows.

1. `AGENTS.md`
2. repo-local `skills/`
3. repository code, scripts, docs, and conventions

Global or imported skills may exist in the environment, but they are not the default source of authority.

## Overall Structure

| Layer | Path | Role | Priority |
| --- | --- | --- | --- |
| Repo local | `skills/` | Project-specific operating skills | Highest |
| Codex global | `C:\Users\zeros\.codex\skills\` | Shared Codex environment skills | Secondary, narrow support only |
| Legacy/external | `C:\Users\zeros\.agents\skills\` | Older stock or imported skills | Reference only, not standard |

## Core Routing Policy

This repository uses a repo-local-first skill policy.
For normal work, AI must:

1. start from the repo-local skills in `skills/`
2. treat repo-local skills as the primary execution path
3. use only explicitly allowed support skills when narrow supplemental knowledge is useful
4. never let global or imported skills override repo naming, scope, validation, security, DB, or review standards

In short:

- repo-local skills are the primary execution authority
- allowed support skills are reference-only supplements
- all other global or imported skills are not for normal project work

## Primary Skills

These 8 repo-local skills are the main routing layer for everyday work.

| Skill | Path | Ownership |
| --- | --- | --- |
| `system-design` | `skills/system-design/SKILL.md` | requirements, scoping, architecture, migration planning |
| `frontend-ui` | `skills/frontend-ui/SKILL.md` | React/Next UI, layout, interactions, visual states |
| `api-implementation` | `skills/api-implementation/SKILL.md` | route handlers, server behavior, validation, auth-aware logic |
| `test-check` | `skills/test-check/SKILL.md` | regression checklist, verification strategy, command selection |
| `code-review` | `skills/code-review/SKILL.md` | diff review, bug detection, regression risk, missing checks |
| `security-audit` | `skills/security-audit/SKILL.md` | authorization, trust boundaries, sensitive data, audit risk |
| `db-design` | `skills/db-design/SKILL.md` | schema impact, migration impact, query impact, persistence decisions |
| `docs-writer` | `skills/docs-writer/SKILL.md` | README/docs updates, implementation notes, migration records |

## Repo-local Skill Origin

### Origin

- On 2026-03-13, the repository migrated the `everything-claude-code` operating model into a Codex-specific structure
- Claude Code `agents/` and `hooks/` were not copied 1:1
- durable repo rules moved into `AGENTS.md`
- specialist roles moved into repo-local `skills/`
- execution paths moved into `package.json` scripts and `scripts/`
- hook-like quality gates were split across `.husky/` and CI

### Claude-to-Codex Mapping

| Claude-side role | Repo migration target |
| --- | --- |
| `architect` | `skills/system-design` |
| `frontend-engineer` | `skills/frontend-ui` |
| `backend-engineer` | `skills/api-implementation` |
| `qa-engineer` | `skills/test-check` |
| `code-reviewer` | `skills/code-review` |
| `security-engineer` | `skills/security-audit` |
| `database-engineer` | `skills/db-design` |
| `technical-writer` | `skills/docs-writer` |

## Allowed Support Skills

Only the following support skills may be used, and only in a secondary reference role.
They must never become the primary routing layer for the repository.

| Support skill | Allowed only as support for | Constraint |
| --- | --- | --- |
| `next-best-practices` | `frontend-ui`, `system-design` | only for specifically Next.js runtime, App Router, rendering, or app-structure behavior |
| `react-best-practices` | `frontend-ui` | only for React component structure, rendering, or state-pattern concerns |
| `tailwind-design-system` | `frontend-ui` | only for Tailwind utility structure, token consistency, or class organization |
| `web-design-guidelines` | `frontend-ui`, `docs-writer` | only for narrow UI review, readability, spacing, hierarchy, or documented UI standards |

## Disallowed as Primary Skills

The following skills must not be used as primary skills for ordinary work in this repository.

| Skill | Reason |
| --- | --- |
| `brainstorming` | can widen scope and introduce routing drift |
| `find-skills` | for discovery, not normal project execution |
| `frontend-design` | can pull the work away from repo-local UI conventions |
| `ui-ux-pro-max` | can expand scope and replace repo-specific decisions with generic design advice |

If these skills physically exist in the environment, they are still considered non-standard for this repository.

## System Skills

These are operational tools, not normal project work skills.

| Skill | Use only when |
| --- | --- |
| `.system/skill-creator` | explicitly creating or updating a skill |
| `.system/skill-installer` | explicitly installing or managing skills |

They must not be used for normal feature implementation, UI fixes, API work, review, security review, DB work, or docs work.

## Codex Global Skills Present In Environment

The following skills currently exist under `C:\Users\zeros\.codex\skills\`.
This is an inventory, not an endorsement.

| Skill | Likely origin | Normal-use status |
| --- | --- | --- |
| `.system/skill-creator` | Codex system | operational only |
| `.system/skill-installer` | Codex system | operational only |
| `brainstorming` | copied from `.agents` | not standard for normal repo work |
| `find-skills` | Codex global | not standard for normal repo work |
| `frontend-design` | installer-based import | not standard for normal repo work |
| `next-best-practices` | copied from `.agents` | allowed support only |
| `react-best-practices` | Codex global | allowed support only |
| `tailwind-design-system` | Codex global | allowed support only |
| `ui-ux-pro-max` | installer-based import | not standard for normal repo work |
| `web-design-guidelines` | Codex global | allowed support only |

## Legacy or External Skills Present In Environment

The following skills remain under `C:\Users\zeros\.agents\skills\`.
Some may be visible to a session, but they are not repo-standard routing choices.

| Skill | Notes | Normal-use status |
| --- | --- | --- |
| `better-auth-security-best-practices` | auth/security reference knowledge | not standard |
| `e2e-testing` | Playwright E2E patterns | not standard unless explicitly needed by session rules |
| `mapbox-web-integration-patterns` | Mapbox integration patterns | not standard |
| `prisma-database-setup` | Prisma setup knowledge | not standard |
| `websocket-engineer` | WebSocket/Socket.IO design | not standard |
| `writing-plans` | planning workflow helper | not standard |

## Source Classification

At this point, skill origins can be classified into four buckets.

| Category | Meaning | Examples |
| --- | --- | --- |
| Repo migration | reconstructed from `everything-claude-code` into this repo's Codex workflow | the 8 repo-local skills |
| Installer import | imported from external sources through installer tooling | `frontend-design`, `ui-ux-pro-max` |
| Legacy copy | copied from `.agents\skills` into `.codex\skills` | `brainstorming`, `next-best-practices` |
| Codex system/global | Codex-provided or global environment skills | `.system/*`, `find-skills`, `react-best-practices` |

## Relationship To `skills.sh`

- the repo-local `skills/` directory was not installed from `skills.sh`
- the trace of `skills.sh` exists through `C:\Users\zeros\.codex\skills\find-skills\SKILL.md`
- therefore, `skills.sh` is relevant as a global discovery catalog, not as the origin of the repo-local skills

## Practical Routing Guide

### Use `system-design` when

- requirements change
- multiple pages or modules are affected
- a new flow is introduced
- data-flow, screen-flow, or rollout decisions are needed

### Use `frontend-ui` when

- changing layout
- fixing spacing, alignment, or hierarchy
- adjusting tablet or desktop behavior
- updating visual states, modals, or transitions

### Use `api-implementation` when

- modifying route handlers
- changing request validation
- adjusting authorization checks
- updating transition rules
- touching repositories or server-side data flow

### Use `test-check` when

- deciding what to verify locally
- building a regression checklist
- selecting focused validation steps after a change

### Use `code-review` when

- reviewing diffs
- identifying bugs or regressions
- checking missing edge cases or forgotten related updates

### Use `security-audit` when

- reviewing ownership checks
- reviewing auth or authorization logic
- reviewing sensitive data handling
- checking trust boundaries or misuse paths

### Use `db-design` when

- touching schema or storage fields
- adjusting persistence structure
- considering migration impact
- checking query or relational consistency impact

### Use `docs-writer` when

- updating README
- writing implementation instructions
- writing migration notes
- documenting operational decisions or rules

## Prohibited Patterns

AI should avoid the following patterns in this repository.

- starting from a support skill instead of a repo-local skill
- using support skills as if they are authoritative for the repo
- importing broad redesign suggestions into a narrow local fix
- changing implementation style only because an external skill prefers it
- bypassing `security-audit` on auth-sensitive work
- bypassing `db-design` on schema or persistence changes
- bypassing `docs-writer` when rules or implementation instructions materially changed
- using non-standard skills just because they exist in the environment

## Review And Safety Expectations

This repository prioritizes the following.

- safe incremental change
- authorization correctness
- transition correctness
- DB integrity
- clear verification
- clear repository-specific documentation

Therefore:

- auth-sensitive changes should involve `security-audit`
- schema or persistence changes should involve `db-design`
- important diffs should involve `code-review`
- behavior changes should involve `test-check`
- rule or process changes should involve `docs-writer`

## Notes

- some `docs/plans/` files still contain `For Claude` wording from the migration period
- those are migration traces, not the current routing authority
- skill availability still depends on the session-specific available-skills list
- a skill can exist on disk without being the correct routing choice for a task

## Key References

- `AGENTS.md`
- `README.md`
- `MIGRATION_NOTES.md`
- `docs/plans/2026-03-13-everything-claude-code-codex-migration-design.md`
- `C:\Users\zeros\.codex\rules\default.rules`
