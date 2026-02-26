# NextAuth.js Credentials Auth Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** NextAuth.js (Auth.js v5) で `username/password` ログインを導入し、`EMS/HOSPITAL/ADMIN` の3ロールで `/paramedics` `/hospitals` `/admin` へ遷移させる。

**Architecture:** App Router + Auth.js Credentials Provider + PostgreSQL `users` テーブルを採用する。認可は `middleware.ts` とサーバー側チェックを優先し、クライアントは UI 表示制御のみ行う。セッションは JWT を使い、`id/role/displayName` の最小クレームを保持する。

**Tech Stack:** Next.js 16, React 19, TypeScript, Auth.js v5 (`next-auth`), `bcryptjs`, PostgreSQL (`pg`)

---

### Task 1: 依存関係を追加する

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

**Step 1: 追加前の依存関係を確認する**

Run: `npm ls next-auth bcryptjs`
Expected: 未インストールまたは empty

**Step 2: 必要ライブラリを追加する**

Run: `npm install next-auth bcryptjs`
Expected: install 成功、`package.json` に反映

**Step 3: 型定義の要否を確認する**

Run: `npm ls @types/bcryptjs`
Expected: `bcryptjs` が型を内包していれば追加不要

**Step 4: 動作確認として lint を実行する**

Run: `npm run lint`
Expected: 既存エラーが増えていない

**Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add auth dependencies for credentials login"
```

### Task 2: 環境変数テンプレートを追加する

**Files:**
- Create: `.env.example`

**Step 1: `.env.example` の雛形を作る**

```env
# Database
DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DBNAME?sslmode=require
DIRECT_URL=postgres://USER:PASSWORD@HOST:PORT/DBNAME?sslmode=require

# Auth.js
AUTH_SECRET=replace-with-long-random-secret
AUTH_URL=http://localhost:3000

# App
NODE_ENV=development
```

**Step 2: `.env.local` の実値を参照していないことを確認する**

Run: `rg -n "replace-with-long-random-secret|USER:PASSWORD" .env.example`
Expected: テンプレート文字列のみ

**Step 3: Commit**

```bash
git add .env.example
git commit -m "docs: add env template for auth and database"
```

### Task 3: users テーブルの SQL を追加する

**Files:**
- Create: `scripts/setup_auth.sql`

**Step 1: 失敗する確認を先に行う（ファイル未存在）**

Run: `Test-Path scripts/setup_auth.sql`
Expected: `False`

**Step 2: users テーブルと index 作成 SQL を実装する**

```sql
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('EMS', 'HOSPITAL', 'ADMIN')),
  display_name TEXT NOT NULL,
  hospital_id INTEGER REFERENCES hospitals(id) ON DELETE SET NULL,
  team_id INTEGER REFERENCES emergency_teams(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_hospital_id ON users(hospital_id);
CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id);
```

**Step 3: SQL 文法を検査する**

Run: `node scripts/execute_sql.js scripts/setup_auth.sql`
Expected: users テーブル作成成功（実行環境に DB 接続があること）

**Step 4: Commit**

```bash
git add scripts/setup_auth.sql
git commit -m "feat: add users table schema for auth"
```

### Task 4: 初期ユーザー投入スクリプトを追加する

**Files:**
- Create: `scripts/seed_auth_users.ts`
- Create: `scripts/seed_auth_users.example.json`

**Step 1: 入力フォーマットを定義する**

```json
[
  { "username": "ems001", "password": "ChangeMe123!", "role": "EMS", "displayName": "救急隊A", "teamId": 1 },
  { "username": "hospital001", "password": "ChangeMe123!", "role": "HOSPITAL", "displayName": "○○病院", "hospitalId": 1 },
  { "username": "admin01", "password": "ChangeMe123!", "role": "ADMIN", "displayName": "システム管理者" }
]
```

**Step 2: 最小実装を書く**

- JSON を読み込む
- `bcryptjs.hash()` で `password_hash` を生成
- `users` に UPSERT する
- ロールごとの `team_id/hospital_id` 制約を実装

**Step 3: dry-run を先に実行する**

Run: `node --loader ts-node/esm scripts/seed_auth_users.ts --dry-run --file scripts/seed_auth_users.example.json`
Expected: SQL 実行なしで検証ログのみ

**Step 4: 本実行する**

Run: `node --loader ts-node/esm scripts/seed_auth_users.ts --file scripts/seed_auth_users.example.json`
Expected: users へ 3 件投入（upsert）

**Step 5: Commit**

```bash
git add scripts/seed_auth_users.ts scripts/seed_auth_users.example.json
git commit -m "feat: add auth user seed script with password hashing"
```

### Task 5: Auth.js 設定を追加する

**Files:**
- Create: `lib/auth.ts`
- Create: `auth.config.ts`
- Create: `auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`

**Step 1: 先に失敗を作る（import 未解決）**

Run: `npm run build`
Expected: auth 関連モジュール未作成エラー

**Step 2: Credentials authorize を実装する**

- `username` と `password` を検証
- `users` から `is_active = true` を条件に取得
- `bcrypt.compare()` で照合
- 成功時に `{ id, role, displayName, username }` を返す

**Step 3: JWT / session callbacks を実装する**

- `token.role`, `token.displayName`, `token.userId` を設定
- `session.user` に必要最小限を反映

**Step 4: build で型とルーティングを確認する**

Run: `npm run build`
Expected: auth ルートを含めて build 成功

**Step 5: Commit**

```bash
git add lib/auth.ts auth.config.ts auth.ts app/api/auth/[...nextauth]/route.ts
git commit -m "feat: configure authjs credentials provider and jwt session"
```

### Task 6: ログインページとサインアウト導線を実装する

**Files:**
- Create: `app/login/page.tsx`
- Create: `components/auth/LoginForm.tsx`
- Modify: `app/layout.tsx` (必要なら provider 導入)

**Step 1: 失敗する UI テストを先に書く**

Run: `npm run lint`
Expected: LoginForm 未作成エラー

**Step 2: フォームの最小実装を作る**

- `username`, `password` 入力
- submit で `signIn("credentials")`
- 認証失敗時にエラーメッセージ表示
- 成功時の callback URL をロール別トップに設定

**Step 3: a11y チェックを行う**

Run: `npm run lint`
Expected: ラベル、button type、基本アクセシビリティに問題なし

**Step 4: Commit**

```bash
git add app/login/page.tsx components/auth/LoginForm.tsx app/layout.tsx
git commit -m "feat: add credentials login page and form"
```

### Task 7: middleware でルート保護を実装する

**Files:**
- Create: `middleware.ts`

**Step 1: 先に保護仕様を固定する**

- `/paramedics` は `EMS` のみ
- `/hospitals` は `HOSPITAL` のみ
- `/admin` は `ADMIN` のみ
- `/login` は未ログイン専用

**Step 2: middleware を最小実装する**

- 未ログインは `/login`
- ロール不一致は安全なトップへ遷移
- 静的ファイル/API auth は除外

**Step 3: build で matcher を検証する**

Run: `npm run build`
Expected: middleware を含めて成功

**Step 4: Commit**

```bash
git add middleware.ts
git commit -m "feat: protect role-based routes with middleware"
```

### Task 8: 最低限のページ雛形を揃える

**Files:**
- Create: `app/paramedics/page.tsx` (未実装なら)
- Create: `app/hospitals/page.tsx` (病院トップ)
- Create: `app/admin/page.tsx` (管理者トップ)

**Step 1: 先に TODO 文言だけで作成する**

- それぞれ role 名と今後の実装予定を表示

**Step 2: ログイン後遷移を手動確認する**

Run: `npm run dev`
Expected: ロールごとに指定ルートへ遷移

**Step 3: Commit**

```bash
git add app/paramedics/page.tsx app/hospitals/page.tsx app/admin/page.tsx
git commit -m "feat: add post-login landing pages by role"
```

### Task 9: ドキュメント更新と最終検証

**Files:**
- Modify: `README.md`
- Modify: `docs/IMPLEMENTATION_GUIDE.md`

**Step 1: 認証セットアップ手順を追記する**

- `.env.example` の説明
- `scripts/setup_auth.sql` 実行手順
- 初期ユーザー投入手順

**Step 2: 最終チェックを実行する**

Run: `npm run lint && npm run build`
Expected: 成功

**Step 3: Commit**

```bash
git add README.md docs/IMPLEMENTATION_GUIDE.md
git commit -m "docs: add auth setup and operation guide"
```

