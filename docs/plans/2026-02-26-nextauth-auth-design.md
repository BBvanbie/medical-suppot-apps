# NextAuth.js（Credentials認証）設計書

**作成日:** 2026-02-26  
**対象:** 救急隊・病院・管理者の3ロール認証を Next.js App Router に導入

## 1. 目的

- NextAuth.js（Auth.js v5）によるログイン機能を導入する
- ロール別の遷移先を明確化する
- 実装前に `.env.example` と DB設計を確定する

## 2. 採用方式

- Auth.js v5 + Credentials Provider
- `username` + `password` 認証
- セッションは JWT
- 認証情報は `users` テーブルで管理

### 採用理由

- 既存構成に対して最短で導入できる
- App Router と相性が良い
- 病院側UI実装に早く移行できる

## 3. ロールと遷移先

- `EMS` -> `/paramedics`
- `HOSPITAL` -> `/hospitals`
- `ADMIN` -> `/admin`

## 4. 環境変数テンプレート

テンプレートは `.env.example` に置く。

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

## 5. DBスキーマ

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
```

## 6. ログインUIとアクセス制御

- ログイン画面: `/login`
- 入力: `username` / `password`
- 未ログインで保護ページアクセス時は `/login` にリダイレクト
- ログイン済みで `/login` アクセス時はロール別トップへ遷移

## 7. ベストプラクティス

- 認可判定は server-side 優先（middleware/proxy・route handler・server component）
- クライアントは表示制御に限定
- セッションからクライアントへ渡すデータは最小限
