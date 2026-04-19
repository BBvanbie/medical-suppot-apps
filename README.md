# 救急搬送支援システム（medical-support-apps）

Next.js で構築中の救急搬送支援システムです。  
本リポジトリは、現場入力（事案情報）と受入先探索（病院検索）を中心に、搬送判断を支援する UI/データ基盤を段階的に実装しています。

## 現在の実装範囲（2026-02-25 時点）

- ホームダッシュボード
- 事案情報ページ（新規/詳細の共通レイアウト）
- 病院検索ページ（条件タブ・結果タブ）
- Neon(PostgreSQL) への病院/救急隊/診療科目の初期投入スクリプト

詳細は [実装ガイド](./docs/IMPLEMENTATION_GUIDE.md) を参照してください。

## 画面構成

- `/` ホーム（過去事案テーブル、新規事案作成導線）
- `/cases/new` 新規事案作成
- `/cases/[caseId]` 既存事案詳細（共通フォーム構成）
- `/cases/search` 事案検索（プレースホルダー）
- `/hospitals/search` 病院検索
- `/settings` 設定（プレースホルダー）

## 技術スタック

- Next.js 16 (App Router)
- React 19
- TypeScript
- PostgreSQL（Neon）
- `pg`

## ローカル起動

1. 依存関係をインストール

```bash
npm install
```

2. `.env.local` を作成（テンプレートは `.env.example`）、接続情報を設定

```env
DATABASE_URL=postgres://...
DIRECT_URL=postgres://...
AUTH_SECRET=...
AUTH_URL=http://localhost:3000
```

3. 開発サーバーを起動

```bash
npm run dev
```

4. Lint

```bash
npm run lint
```

5. E2E

```bash
npx playwright install chromium
npm run test:e2e
```

6. `agent-browser` を使う場合

```bash
npm run browser:install
```

- `localhost` はユーザー側で起動する運用とする
- AI にブラウザ確認をさせるときは、先に `npm run dev` が `http://localhost:3000` で立ち上がっていることを確認する
- 詳細な運用は [agent-browser-operations.md](/C:/practice/medical-support-apps/docs/reference/agent-browser-operations.md) を参照

## CI

GitHub Actions で `lint` と `test:e2e` を実行します。  
E2E は DB にテストデータを投入するため、リポジトリの Actions secrets に `DATABASE_URL` を設定してください。

## DB 初期化・投入関連スクリプト

- `scripts/load_neon_seed.py`
- `scripts/setup_departments.sql`
- `scripts/setup_auth.sql`
- `scripts/setup_hospital_requests.sql`
- `scripts/seed_hospital_departments_demo.sql`
- `scripts/seed_auth_users.js`
- `scripts/execute_sql.js`
- `scripts/db_migrate.js`
- `scripts/db_migration_status.js`

運用手順は [実装ガイド](./docs/IMPLEMENTATION_GUIDE.md) の「DB構成 / データ投入」に記載。

### DB bootstrap / migration

```bash
npm run db:migration:status
npm run db:migrate
npm run db:verify
```

- `db:migrate` は `schema_migrations` に適用履歴を記録しながら `setup_*.sql` を順に適用する
- `db:bootstrap` は互換用 alias として `db:migrate` を呼ぶ
- `db:verify` は required table / column / index / constraint が揃っているか検証する

### 認証ユーザー投入（検証用）

1. users テーブルを作成

```bash
node scripts/execute_sql.js scripts/setup_auth.sql
node scripts/execute_sql.js scripts/setup_hospital_requests.sql
```

2. 救急隊・病院・管理者ユーザーを自動投入（固定パスワード）

```bash
node scripts/seed_auth_users.js --password "ChangeMe123!"
```

3. dry-run で件数確認のみ行う場合

```bash
node scripts/seed_auth_users.js --password "ChangeMe123!" --dry-run
```

## 開発メモ

- `.env.local` は `.gitignore` で除外済み
- UI 文言は日本語基準で統一方針
- iPad横/PC の利用を前提（モバイル最適化は優先度低）
## Codex Workflow

This repository now includes a Codex-oriented migration of the `everything-claude-code` operating model.

- `AGENTS.md`: repo-wide Codex behavior, verification defaults, forbidden actions, and skill routing
- `skills/`: role-focused Codex skills for design, UI, API, review, security, DB, testing, and docs
- `MIGRATION_NOTES.md`: mapping from Claude Code concepts to Codex-native replacements
- `scripts/run-checks.ps1`: local validation runner used by `npm run check` and `npm run check:full`
- `scripts/run-changed-review.ps1`: summarizes changed files and suggests relevant Codex skills/checks
- `.husky/pre-commit`: lightweight local hook entrypoint that runs `npm run check`

### Recommended commands

Prompt selection guide: PROMPT_TEMPLATES.md`r


```bash
npm run lint
npm run typecheck
npm run check
npm run check:full
npm run review:changed
npm run browser:install
npm run browser:close
```

### Browser verification

- `agent-browser` は実ブラウザでの確認、再現、簡易デバッグ用に使う
- Playwright は継続的な回帰テストと CI の保証に使う
- `localhost` の起動はユーザー側で行う。未起動なら AI は起動せず、起動を依頼する
- ブラウザ操作前には `snapshot -i --json` を取り、最新の `ref` を確認してから操作する
- 基本手順とコマンド例は [agent-browser-operations.md](/C:/practice/medical-support-apps/docs/reference/agent-browser-operations.md) を参照


### Prompt templates

Use these templates when you want Codex to pick the right skill and run the right checks.

```text
まず npm run review:changed を実行して、必要な skill を選んでから進めて。最後に npm run check まで回して。
```

```text
system-design skill を使って、この要件の実装方針を整理して。必要なら docs/plans に設計を残して。
```

```text
frontend-ui skill を使って、既存 UI パターンに合わせてこの画面を修正して。最後に npm run check を実行して。
```

```text
api-implementation skill を使って、この API を追加して。認可、validation、呼び出し元との整合も確認して。
```

```text
code-review skill でこの差分をレビューして。findings を重要度順に出して。
```

```text
security-audit skill でこの変更の認可漏れ、秘密情報、監査ログの抜けを確認して。
```

```text
db-design skill を使って、この保存項目追加に必要なスキーマ変更と移行影響を整理して。
```

```text
docs-writer skill を使って、この作業内容を README と docs/plans に反映して。
```

```text
test-check skill を使って、この変更に必要な確認項目を整理して、必要なコマンドを実行して。
```
### Operating model

- Use `AGENTS.md` as the persistent project guidance for Codex.
- Use the skill under `skills/` that matches the task instead of recreating Claude-specific agents.
- Use `npm run check` for the default local gate and CI for the final quality gate.
- Treat `.husky/pre-commit` as an opt-in local hook path unless Husky installation is later wired into the project.
- After UI changes, prefer a real browser check with `agent-browser` when `localhost` is already running.





## EMS オフライン基盤（初期実装）

- IndexedDB を使った EMS 向けオフライン保存基盤を追加
- 共通オフラインバナーを EMS ページに追加
- `/settings/offline-queue` で未送信キューを確認可能
- 相談返信はオフライン時に未送信キューへ保存
- 病院検索はオフライン時に保存済み病院データで簡易検索
- 搬送決定 / 搬送辞退はオフライン時に実行不可

詳細設計は `docs/plans/2026-03-16-ems-offline-foundation-design.md` を参照。
