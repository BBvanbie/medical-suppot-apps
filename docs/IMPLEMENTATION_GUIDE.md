# 実装ガイド（実装記録・今後課題）

最終更新: 2026-03-07

このドキュメントは、現時点の実装状況・DB構成・既知課題・次の優先実装をまとめた開発ガイドです。  
新しい作業に着手する前に、まず本ページを確認してください。

## 1. 実装記録

### 1-1. ホームダッシュボード

- 左サイドバー（開閉対応）
  - メニュー: ホーム / 新規事案作成 / 事案検索 / 病院検索 / 設定
  - フッター: 救急隊名 + 隊ID表示
- メイン
  - 過去事案一覧テーブル
  - 「新規事案作成」ボタン
  - 行右端「詳細」ボタンから事案詳細へ遷移

### 1-2. 事案情報ページ（`/cases/new`, `/cases/[caseId]`）

- タブ構成
  - 基本情報
  - 概要_バイタル
  - 患者サマリー
  - 送信履歴
- 基本情報タブ（実装済み）
  - 氏名（不明トグル）
  - 性別（3種）
  - 生年月日（西暦/和暦）+ 年齢自動計算
  - 住所、電話番号（ハイフン自動整形）
  - ADL（自立 / 要支援1〜2 / 要介護1〜5）
  - アレルギー、体重
  - 関係者（3名: 氏名 / 関係性 / 電話）
  - 既往症6枠 + かかりつけ（病院候補サジェスト + 自由入力許容）
- 概要_バイタル
  - 要請概要 / 本人主訴
  - 基本バイタル（最大3セット）
  - 所見（神経 / 循環器 / 呼吸器 / 消化器 / 外傷）
  - 変更がある所見のハイライト表示
- 患者サマリー
  - 基本情報、概要/主訴、バイタル、変更所見の一括確認
- 送信履歴
  - 事案に紐づく送信履歴表示（ステータス列あり）

### 1-3. 病院検索ページ（`/hospitals/search`）

- タブ構成
  - 検索条件
  - 検索結果
  - 送信履歴
- 検索条件
  - 共通診療科目カード（直近検索 / 市区名検索で共通利用）
  - 直近検索（住所 + 共通科目 + OR/AND）
  - 市区名検索（候補リスト選択 + 共通科目 + OR/AND）
  - 個別検索（病院名候補リスト選択）
- 検索結果
  - テーブル表示（20件ページング）
  - 列: 病院ID / 病院名 / 科目 / 住所 / 電話番号 / 距離
  - 上部右端「受入要請送信」ボタン
- 個別検索結果
  - 単一病院ダッシュボード表示
  - 診療科目カード（可: 白、不可: グレーアウト、押下でアクティブ表示）
  - 選択した科目を送信時に反映
- 受入要請フロー
  - 受入要請送信 -> 確認画面 -> 送信完了
  - 確認画面では患者サマリーを事案情報サマリーと同等構成で表示

### 1-4. 認証（`/login`）

- 認証方式
  - NextAuth.js（Auth.js）Credentials Provider
  - `username + password` で認証
  - セッションは JWT
- ロール
  - `EMS`（救急隊） -> `/paramedics`
  - `HOSPITAL`（病院） -> `/hospitals`
  - `ADMIN`（管理者） -> `/admin`
- アクセス制御
  - `proxy.ts` で `/paramedics` `/hospitals` `/admin` を保護
  - 未ログイン時は `/login` へ遷移

### 1-5. 管理者向け設定/管理基盤（`/admin/*`）

- 追加ルート
  - `/admin/settings`
    - 管理者向け設定トップ
    - システム設定 / セキュリティ設定 / 通知ポリシー / マスタ設定の入口カードを表示
  - `/admin/hospitals`
    - 病院一覧
    - 病院追加フォーム
  - `/admin/ambulance-teams`
    - 救急隊一覧
    - 救急隊追加フォーム
- レイアウト
  - admin 専用サイドバーを追加
  - `settings` と `management` を `/admin/*` 配下で分離
- 保存ルール
  - 病院追加 / 救急隊追加は確認ダイアログ付き
  - 保存後は一覧へ即時反映
- API認可
  - `ADMIN` のみ許可
  - `EMS` / `HOSPITAL` は `403`

### 1-6. EMS / HOSPITAL 設定ルーティング分離

- EMS 側
  - `/settings`
  - `/settings/device`
  - `/settings/sync`
  - `/settings/notifications`
  - `/settings/display`
  - `/settings/input`
  - `/settings/support`
- HOSPITAL 側
  - `/hp/settings`
  - `/hp/settings/facility`
  - `/hp/settings/operations`
  - `/hp/settings/notifications`
  - `/hp/settings/display`
  - `/hp/settings/support`
- 導線
  - EMS サイドバーの `設定` は `/settings`
  - HOSPITAL サイドバーの `設定` は `/hp/settings`
- 権限
  - `/settings/*` は `EMS` のみ
  - `/hp/settings/*` は `HOSPITAL` のみ
  - `ADMIN` は両方に入れず `/admin/settings` 側で扱う
- 実装状態
  - 初回は UI とルーティング分離、`readOnly / editable` の見え方まで
  - 永続化 API は後続対応

### 1-7. EMS 設定永続化

- 保存対象
  - `/settings/notifications`
  - `/settings/display`
  - `/settings/input`
- 新規テーブル
  - `ems_user_settings`
- API
  - `GET/PATCH /api/settings/ambulance/notifications`
  - `GET/PATCH /api/settings/ambulance/display`
  - `GET/PATCH /api/settings/ambulance/input`
- 認可
  - `EMS` のみ許可
  - `HOSPITAL` / `ADMIN` は `403`
- 保存方式
  - 即時保存
  - UI に `saving / saved / error` を表示
- 実装状態
  - 通知、表示、入力補助は永続化済み
  - 同期設定は未永続化

### 1-8. HOSPITAL 施設設定永続化

- 保存対象
  - `/hp/settings/facility`
  - `displayContact`
  - `facilityNote`
- 新規テーブル
  - `hospital_settings`
- API
  - `GET/PATCH /api/settings/hospital/facility`
- 認可
  - `HOSPITAL` のみ許可
  - `EMS` / `ADMIN` は `403`
- 保存方式
  - 確認ダイアログ付き保存
  - UI に `saving / saved / error` を表示
- 実装状態
  - `facility` の 2 項目は永続化済み
  - `operations`、`notifications`、`display` は未永続化

### 1-9. HOSPITAL 運用テンプレート永続化

- 保存対象
  - `/hp/settings/operations`
  - `consultTemplate`
  - `declineTemplate`
- 利用テーブル
  - `hospital_settings` 拡張
- API
  - `GET/PATCH /api/settings/hospital/operations`
- 認可
  - `HOSPITAL` のみ許可
  - `EMS` / `ADMIN` は `403`
- 保存方式
  - 確認ダイアログ付き保存
  - 差分がない場合は保存しない
  - UI に `saving / saved / error` を表示
- 実装状態
  - `operations` の 2 項目は永続化済み
  - `notifications`、`display` は未永続化

### 1-10. HOSPITAL 通知設定永続化

- 保存対象
  - `/hp/settings/notifications`
  - 新規要請通知
  - 返信到着通知
  - 搬送決定通知
  - 辞退通知
  - 再通知
  - 返信遅延通知
  - 返信遅延しきい値（10 / 15 / 20 分）
- 利用テーブル
  - `hospital_settings` 拡張
- API
  - `GET/PATCH /api/settings/hospital/notifications`
- 認可
  - `HOSPITAL` のみ許可
  - `EMS` / `ADMIN` は `403`
- 保存方式
  - 即時保存
  - UI に `saving / saved / error` を表示
- 実装状態
  - 通知設定と返信遅延しきい値は永続化済み
  - `display` は未永続化

## 2. DB構成（Neon / PostgreSQL）

### 2-1. 使用テーブル

- `hospitals`
- `emergency_teams`
- `cases`
- `medical_departments`
- `hospital_departments`
- `users`
- `audit_logs`

### 2-2. データ投入関連

- `scripts/load_neon_seed.py`
  - 病院CSV取り込み
  - 住所ジオコーディング（緯度経度）
  - 既存データ削除後の再投入
- `scripts/setup_departments.sql`
  - 診療科目マスタ作成（正式名称/略称）
- `scripts/setup_auth.sql`
  - 認証用 `users` テーブル作成
- `scripts/setup_hospital_requests.sql`
  - 受入依頼ライフサイクル用テーブル作成
  - `hospital_requests`
  - `hospital_request_targets`
  - `hospital_request_events`
  - `hospital_patients`
- `scripts/seed_auth_users.js`
  - `emergency_teams` / `hospitals` から users を自動生成して投入
- `scripts/seed_hospital_departments_demo.sql`
  - 病院-診療科目のデモ紐づけ
- `scripts/execute_sql.js`
  - SQL実行ユーティリティ

#### 認証ユーザー投入コマンド（検証用）

1. `node scripts/execute_sql.js scripts/setup_auth.sql`
2. `node scripts/execute_sql.js scripts/setup_hospital_requests.sql`
3. `node scripts/seed_auth_users.js --password "ChangeMe123!"`

オプション:

- `--dry-run`: DB更新せず件数とサンプルのみ表示
- `--admin-username <name>`: 管理者 username を変更
- `--no-admin`: 管理者を作成しない

## 3. API

- `GET /api/hospitals/suggest?q=...`
  - 病院名候補サジェスト
- `POST /api/hospitals/recent-search`
  - 直近検索 / 市区名検索 / 個別検索の実行
- `GET /api/cases/send-history?caseId=...`
  - 事案の送信履歴取得
- `POST /api/cases/send-history`
  - 事案の送信履歴保存
- `GET/POST /api/auth/[...nextauth]`
  - NextAuth.js 認証エンドポイント
- `GET /api/admin/hospitals`
  - 管理者向け病院一覧取得
- `POST /api/admin/hospitals`
  - 管理者向け病院追加
- `GET /api/admin/ambulance-teams`
  - 管理者向け救急隊一覧取得
- `POST /api/admin/ambulance-teams`
  - 管理者向け救急隊追加

## 4. 既知課題

- 一部ファイルで文字化けが発生している可能性がある（要 UTF-8 統一確認）
- 送信履歴ステータスは現状「初期値: 未読」のみで、更新UI未実装
- 個別検索の病院名あいまい一致ルール（同名・近似名）の精緻化余地あり
- 確認/完了画面の文言とレイアウトの細部チューニング余地あり
- admin 管理画面は初回スコープのため、病院/救急隊ともに編集・無効化・履歴閲覧は未実装
- `audit_logs` は記録のみ先行実装で、閲覧画面 `/admin/logs` は未着手
- EMS/HOSPITAL 設定画面は永続化未接続のため、通知・表示・入力補助・運用テンプレートは UI のみ
- HOSPITAL 側は `facility`、`operations`、`notifications` の一部が永続化済みで、`display` は未接続
- EMS 側は通知 / 表示 / 入力補助のみ永続化済みで、同期は未接続

## 5. 今後の優先実装

1. HOSPITAL `display` の永続化追加
2. EMS 同期設定の実行 API 接続
3. admin 管理画面の編集 / 無効化 / 履歴閲覧追加
4. 送信履歴ステータス更新機能（未読->既読->受入可能->搬送先決定、キャンセル）
5. 受入要請通知のリアルタイム化（必要ならPusher等の導入）
6. 文字コードの全体点検（UTF-8統一）
7. E2Eテスト追加（検索->送信->履歴参照、admin 管理追加導線、設定ルーティング）

## 7. デプロイメモ

- `.env.local` はテンプレート化済み
- Vercel では `DATABASE_URL` を必須設定する
- 認証用に `AUTH_SECRET` `AUTH_URL` を設定する
- 機密情報は `.env.local` にコミットしない（`.gitignore` 済み）

## 8. デプロイ前チェックリスト（再発防止）

### 8-1. ローカル事前チェック（必須）

1. `npm run lint`
2. `npx.cmd tsc --noEmit`
3. （可能な環境なら）`npm run build`

### 8-2. 実装時ルール（TypeScript）

- `map` / `filter` コールバックで暗黙 `any` を残さない  
  - 例: `(row: CaseRow) => ...`
- DB取得結果は `type` を定義し、`db.query<Type>` で受ける

### 8-3. Next.js 16 運用ルール

- `useSearchParams` を使うクライアントコンポーネントは、`page.tsx` 側で `Suspense` ラップする
- プリレンダー対象ページで CSR bailout 警告が出たら、まず `Suspense` の有無を確認する

### 8-4. Vercel確認ポイント

- デプロイログ冒頭の `Commit` が修正対象コミットか確認
- 環境変数 `DATABASE_URL` が `Production`（必要なら `Preview`）に設定済みか確認
- エラー発生時はログの「最初の TypeScript エラー1件」を優先修正し、再デプロイで前進させる

## 6. 開発運用ルール（当面）

- UI 文言は日本語を標準とする
- 主要利用端末は iPad横 / PC（モバイル最適化は低優先）
- UI統一ルールは `docs/UI_RULES.md` を参照する
- 仕様追加時はこのドキュメントへ実装記録と未対応項目を追記する

## 9. 文字コード運用ルール（必須）

- 全テキストファイルは **UTF-8 (BOMなし)** を使用する。
- Shift_JIS / CP932 / UTF-16 での保存を禁止する。
- 日本語文言が含まれる変更では、文字化けがないことをレビュー時に必ず確認する。
- 新規作成/更新時は `.editorconfig` と `.gitattributes` の設定に従う。
- 文字化けが発生した場合は、機能修正より先に文字コード修復を優先する。
