# NextAuth.js Credentials Authentication Design

**Date:** 2026-02-26  
**Scope:** 救急隊・病院・管理者の3ロール認証を Next.js App Router に導入する

## 1. Goal

- NextAuth.js (Auth.js v5) を使ったログイン機能の導入
- 認証後のロール別遷移を明確化
- 実装開始前に `.env.example` と DB 設計を先に確定

## 2. Chosen Approach

推奨案 1 を採用:

- Auth.js v5 + Credentials Provider
- `username` + `password` 認証
- セッションは JWT（DB session は使わない）
- `users` テーブルで認証情報を管理

### Why this approach

- 現状のプロジェクト規模に対して最短で導入可能
- Next.js App Router と相性が良い
- 追加テーブルを最小化し、病院側 UI 構築に早く移行できる

## 3. Roles and Redirects

- `EMS`（救急隊/A側） -> `/paramedics`
- `HOSPITAL`（病院） -> `/hospitals`
- `ADMIN`（管理者） -> `/admin`

## 4. Environment Variables Template

`.env.local` は実値運用済みのため、テンプレートは `.env.example` で管理する。

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

## 5. Database Schema

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

運用制約:

- `EMS`: `team_id` 必須、`hospital_id` は `NULL`
- `HOSPITAL`: `hospital_id` 必須、`team_id` は `NULL`
- `ADMIN`: `hospital_id`/`team_id` ともに `NULL`
- パスワードは平文保存せず、`password_hash` のみ保存

## 6. Login UI and Access Control

- ログイン画面: `/login`
- 入力項目: `username`, `password`
- 保護対象ページは `middleware.ts` で判定
- 未ログインで保護ページアクセス時は `/login` に遷移
- ログイン済みで `/login` アクセス時はロール別トップに遷移

## 7. Best-Practice Notes Applied

`vercel-react-best-practices` の適用方針:

- 認可判定は server-side を優先（middleware/route handler/server component）
- クライアント側は UI 表示制御のみ
- セッションからクライアントに渡すデータは最小限にする

`frontend-design` / `ui-ux-pro-max` の適用方針:

- 医療業務向けに高コントラスト・低装飾・高可読性
- 44px 以上の入力ターゲット、明確なフォーカス状態
- エラー表示は即時かつ文脈近傍に配置

