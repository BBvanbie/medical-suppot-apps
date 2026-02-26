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

## DB 初期化・投入関連スクリプト

- `scripts/load_neon_seed.py`
- `scripts/setup_departments.sql`
- `scripts/setup_auth.sql`
- `scripts/setup_hospital_requests.sql`
- `scripts/seed_hospital_departments_demo.sql`
- `scripts/seed_auth_users.js`
- `scripts/execute_sql.js`

運用手順は [実装ガイド](./docs/IMPLEMENTATION_GUIDE.md) の「DB構成 / データ投入」に記載。

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
