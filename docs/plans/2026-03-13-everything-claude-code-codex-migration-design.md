# Everything Claude Code to Codex Migration Design

**Date:** 2026-03-13

## Goal

`everything-claude-code` の考え方を、このリポジトリ向けの Codex 運用へ再構成する。Claude Code の構造をそのまま複製せず、常設ルールは `AGENTS.md`、専門役割は `skills/`、品質ゲートは `scripts/` と `.husky/` と CI に分解する。

## Scope

- ルート `AGENTS.md` の新設
- `skills/` 配下に 8 つの Codex Skill を新設
- `MIGRATION_NOTES.md` で移植方針を整理
- Codex 運用用の軽量コマンドを `package.json` と `scripts/` に追加
- Git hooks の最小代替を `.husky/` に追加
- `README.md` に運用追記

## Non-Goals

- Claude Code の `agents/` 構成や `hooks/` を 1 対 1 で再現すること
- このアプリケーションの既存機能や画面挙動を変更すること
- Skill を大量生成して網羅性を優先すること

## Project Constraints

- Next.js 16 App Router / React 19 / TypeScript / Playwright / npm 構成を維持する
- 既存 CI と矛盾しないこと
- 既存実装を壊さないこと
- 最初は最小構成に留め、将来拡張しやすくすること

## Mapping Strategy

### Global behavior

Claude Code の rules / conventions / durable guidance は `AGENTS.md` に移す。ここには、このプロジェクトで Codex が常時守るべき確認手順、設計原則、変更ポリシー、検証、禁止事項を集約する。

### Agent to Skill

Claude agent は独立 agent として再現せず、Codex Skill として再編する。

- `architect` -> `system-design`
- `frontend-engineer` -> `frontend-ui`
- `backend-engineer` -> `api-implementation`
- `qa-engineer` -> `test-check`
- `code-reviewer` -> `code-review`
- `security-engineer` -> `security-audit`
- `database-engineer` -> `db-design`
- `technical-writer` -> `docs-writer`

各 Skill は 1 目的に絞り、共通ルールは持たせない。共通ルールは `AGENTS.md` に集約する。

### Commands

Claude Code の commands は Codex built-in slash command に合わせず、次の 2 層へ分解する。

- 運用導線: `AGENTS.md` と `README.md` に「どの依頼でどの Skill を使うか」を書く
- 実行導線: `package.json` scripts と `scripts/` に検証・レビュー用コマンドを用意する

### Hooks

Claude Code hooks は 1 対 1 移植しない。役割ごとに次へ分解する。

- セッション開始 guidance -> `AGENTS.md`
- 軽量な事前チェック -> `.husky/pre-commit`
- 変更後のローカル検証 -> `npm run check`
- 本番品質ゲート -> `.github/workflows/ci.yml`

## File Plan

- Create: `AGENTS.md`
- Create: `MIGRATION_NOTES.md`
- Create: `skills/system-design/SKILL.md`
- Create: `skills/frontend-ui/SKILL.md`
- Create: `skills/api-implementation/SKILL.md`
- Create: `skills/test-check/SKILL.md`
- Create: `skills/code-review/SKILL.md`
- Create: `skills/security-audit/SKILL.md`
- Create: `skills/db-design/SKILL.md`
- Create: `skills/docs-writer/SKILL.md`
- Create: `scripts/run-checks.mjs`
- Create: `scripts/run-changed-review.mjs`
- Create: `.husky/pre-commit`
- Update: `package.json`
- Update: `README.md`

## Skill Design Principles

- `description` は使用タイミングを明確に判断できる文章にする
- `workflow` は薄く、再利用しやすくする
- `quality bar` は役割ごとの期待値を短く固定する
- `project-specific notes` ではこの救急搬送支援システム特有の注意点だけを書く

## Validation Plan

- `npm run lint`
- `npm run typecheck`
- `npm run check`

`build` は環境依存や DB 接続の影響を受ける可能性があるため、必要に応じて実施可否を判断する。追加した運用ファイル自体はアプリ挙動に影響しないため、最低限 lint/typecheck/command 動作確認を優先する。

## Risks

- `AGENTS.md` と Skill の責務分離が曖昧だと運用が重複する
- hook を重くしすぎるとローカル開発体験を損ねる
- project-specific guidance を一般論に寄せすぎると実用性が落ちる

## Decision

`AGENTS.md` 中心の薄い Skill 構成を採用し、commands は scripts、hooks は `.husky/` と CI に分解する。初回は 8 Skill を作るが、各 Skill は最小限の役割定義に留める。
