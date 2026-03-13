# Everything Claude Code to Codex Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `everything-claude-code` の運用思想を、このリポジトリ向けの Codex 用 `AGENTS.md`、Skill、scripts、hooks に再構成する。

**Architecture:** 常設ルールはルート `AGENTS.md` に集約し、8 つの専門役割は `skills/` に分離する。commands は `package.json` scripts と `scripts/` の実行コマンドとして用意し、hooks は `.husky/` と CI に分解する。

**Tech Stack:** Next.js 16, React 19, TypeScript 5, npm, ESLint 9, Playwright, GitHub Actions

---

### Task 1: Capture project-wide Codex guidance

**Files:**
- Create: `AGENTS.md`
- Check: `README.md`
- Check: `docs/IMPLEMENTATION_GUIDE.md`
- Check: `docs/UI_RULES.md`

**Step 1: Draft the required sections**

Write sections for project overview, tech stack, directory map, naming, implementation principles, UI rules, change rules, done criteria, verification, forbidden actions, and skill invocation guidance.

**Step 2: Keep the guidance durable**

Ensure the document focuses on rules that should apply on every change instead of one-off project notes.

**Step 3: Cross-check with existing docs**

Confirm the guidance does not contradict current README, UI rules, or implementation guide.

**Step 4: Save the file**

Create `AGENTS.md` with concise, project-specific operating rules.

### Task 2: Create the Codex skill set

**Files:**
- Create: `skills/system-design/SKILL.md`
- Create: `skills/frontend-ui/SKILL.md`
- Create: `skills/api-implementation/SKILL.md`
- Create: `skills/test-check/SKILL.md`
- Create: `skills/code-review/SKILL.md`
- Create: `skills/security-audit/SKILL.md`
- Create: `skills/db-design/SKILL.md`
- Create: `skills/docs-writer/SKILL.md`

**Step 1: Define the role boundaries**

Write one purpose per skill and avoid overlap with project-wide guidance in `AGENTS.md`.

**Step 2: Use a consistent template**

Each `SKILL.md` must include `name`, `description`, `purpose`, `use this skill when`, `do not use this skill when`, `workflow`, `output format`, `quality bar`, and `project-specific notes`.

**Step 3: Tailor for this repository**

Mention routes, API patterns, auth roles, UI rules, DB caution, and verification expectations relevant to this codebase.

**Step 4: Save all eight skill files**

Create the `skills/` tree with the final `SKILL.md` files.

### Task 3: Add command wrappers for Codex operations

**Files:**
- Create: `scripts/run-checks.mjs`
- Create: `scripts/run-changed-review.mjs`
- Modify: `package.json`

**Step 1: Add a local validation runner**

Implement `scripts/run-checks.mjs` to run `lint`, `typecheck`, and optionally `build` in sequence with clear status output.

**Step 2: Add a changed-files review helper**

Implement `scripts/run-changed-review.mjs` to print tracked changed files and recommend the relevant skills/verification path.

**Step 3: Wire package scripts**

Add `typecheck`, `check`, `check:full`, and `review:changed` scripts to `package.json`.

**Step 4: Keep commands lightweight**

Do not add heavy dependencies or scripts that alter production behavior.

### Task 4: Add hook migration scaffolding

**Files:**
- Create: `.husky/pre-commit`
- Create: `MIGRATION_NOTES.md`

**Step 1: Document hook replacements**

Write a mapping table from Claude Code hook intent to Codex equivalents such as `AGENTS.md`, package scripts, `.husky`, and CI.

**Step 2: Add the minimal hook**

Create `.husky/pre-commit` that runs the lightweight local check path suitable for developer machines.

**Step 3: Keep hook setup explicit**

Document that the hook is opt-in until Husky installation is wired, instead of silently changing developer environments.

### Task 5: Update developer-facing docs

**Files:**
- Modify: `README.md`

**Step 1: Add the Codex migration section**

Explain the role of `AGENTS.md`, `skills/`, `MIGRATION_NOTES.md`, and the new scripts.

**Step 2: Add command examples**

Document how to run `npm run check`, `npm run check:full`, and `npm run review:changed`.

**Step 3: Mention the lightweight hook path**

Briefly note `.husky/pre-commit` as the local hook entrypoint and CI as the final gate.

### Task 6: Verify and summarize

**Files:**
- Check: `package.json`
- Check: `AGENTS.md`
- Check: `skills/**/*.md`
- Check: `MIGRATION_NOTES.md`
- Check: `README.md`

**Step 1: Run lint**

Run: `npm run lint`  
Expected: PASS

**Step 2: Run typecheck**

Run: `npm run typecheck`  
Expected: PASS

**Step 3: Run the new local check**

Run: `npm run check`  
Expected: PASS

**Step 4: Review git diff**

Run: `git status --short`  
Expected: only the intended documentation, skills, scripts, and package updates are present

**Step 5: Prepare the final report**

Summarize created files, migration mapping, hook replacement, deferred items, and next expansion candidates.
