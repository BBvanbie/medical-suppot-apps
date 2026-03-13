# MIGRATION_NOTES.md

## Purpose

This note records how `everything-claude-code` concepts were adapted for this repository's Codex workflow.

## Core Translation

| Claude Code concept | Codex migration in this repo |
| --- | --- |
| global rules / conventions / behavior | `AGENTS.md` |
| agent roles | `skills/<role>/SKILL.md` |
| commands | `package.json` scripts + `scripts/` + guidance in `AGENTS.md` / `README.md` |
| hooks | `.husky/`, `scripts/`, CI, and docs |

## Agent Mapping

| Claude agent | Codex migration |
| --- | --- |
| architect | `skills/system-design` |
| frontend-engineer | `skills/frontend-ui` |
| backend-engineer | `skills/api-implementation` |
| qa-engineer | `skills/test-check` |
| code-reviewer | `skills/code-review` |
| security-engineer | `skills/security-audit` |
| database-engineer | `skills/db-design` |
| technical-writer | `skills/docs-writer` |

## Hook Replacement Strategy

| Original hook intent | Codex replacement | Notes |
| --- | --- | --- |
| SessionStart guidance | `AGENTS.md` | Persistent repo-level rules and command defaults |
| PreToolUse quality reminder | `AGENTS.md` + `skills/` | The agent chooses the right skill before acting |
| Pre-change local gate | `.husky/pre-commit` -> `npm run check` | Lightweight local guard |
| Post-change verification | `npm run check` / `npm run check:full` | Local command path for validation |
| Review changed work | `npm run review:changed` | Suggests skills and validation based on local diff |
| Notification hooks | Not migrated | Deferred; low value for initial Codex setup |
| Final quality gate | `.github/workflows/ci.yml` | CI remains the source of truth |

## Commands Added For Codex Workflow

- `npm run typecheck`
- `npm run check`
- `npm run check:full`
- `npm run review:changed`

## Why commands were not copied 1:1

Codex already has its own interaction model. Instead of recreating slash commands, this repo exposes stable execution commands through `npm` scripts and keeps role selection in `AGENTS.md` + `skills/`.

## What was intentionally not migrated

- Claude-specific hook internals
- Notification or session UI behavior
- A large `agents/` tree separate from `skills/`
- Command aliases that duplicate existing Codex behavior

## Next candidates

- Add focused references/examples under each skill when usage patterns stabilize
- Expand `.husky/` only if the team wants stronger local gates
- Add targeted E2E or review helper scripts when recurring workflows emerge

