# NextAuth.js（Credentials認証）実装計画

> **実装担当向け:** この計画はタスク単位で順番に実行する。

**ゴール:** `username/password` 認証を導入し、`EMS/HOSPITAL/ADMIN` を `/paramedics` `/hospitals` `/admin` へ遷移させる。  
**構成:** Auth.js v5 + PostgreSQL `users` + JWTセッション。  
**技術:** Next.js 16 / React 19 / TypeScript / next-auth / bcryptjs / pg

---

### タスク1: 依存関係追加

- `next-auth` / `bcryptjs` を追加
- `npm run lint` で既存エラー増加がないことを確認

### タスク2: 環境変数テンプレート追加

- `.env.example` を追加
- `AUTH_SECRET` / `AUTH_URL` を明記

### タスク3: 認証テーブル作成SQL追加

- `scripts/setup_auth.sql` を追加
- `users` テーブルとインデックスを定義

### タスク4: 初期ユーザー投入スクリプト追加

- 固定パスワードを bcrypt ハッシュ化して投入
- `EMS/HOSPITAL/ADMIN` の初期投入を可能にする

### タスク5: Auth.js 設定追加

- `auth.config.ts`, `auth.ts`, `app/api/auth/[...nextauth]/route.ts`
- Credentials `authorize` と JWT/session callbacks を実装

### タスク6: ログイン画面追加

- `/login` と `LoginForm` を追加
- 失敗時エラー表示、成功時ロール別遷移

### タスク7: ルート保護

- `proxy.ts`（旧 middleware 相当）でロール別アクセス制御
- 未ログイン時のリダイレクトを実装

### タスク8: ロール別トップページ

- `/paramedics` `/hospitals` `/admin` を整備

### タスク9: ドキュメント更新

- README / IMPLEMENTATION_GUIDE を更新
- セットアップ手順・運用手順を追記

### 最終確認

- `npm run lint`
- `npm run build`
- 上記成功後にコミット
