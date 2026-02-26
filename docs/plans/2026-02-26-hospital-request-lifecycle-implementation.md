# Hospital Request Lifecycle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 病院側「受入依頼一覧」に自院宛依頼のみを表示し、詳細既読化・病院回答・救急隊最終判断までの状態遷移を実装する。

**Architecture:** 受入依頼を `hospital_requests`（ヘッダ）と `hospital_request_targets`（病院別明細）に分離し、`hospital_request_events` に監査ログを記録する。病院詳細表示時に `UNREAD -> READ` を更新し、救急隊側で既読状態を可視化する。`TRANSPORT_DECIDED` 時は搬送患者一覧データへ反映する。

**Tech Stack:** Next.js 16 (App Router), TypeScript, PostgreSQL (`pg`), Auth.js v5

---

### Task 1: DBスキーマ追加（専用テーブル）

**Files:**
- Create: `scripts/setup_hospital_requests.sql`

**Step 1: SQLファイルの不在を確認する**

Run: `Test-Path scripts/setup_hospital_requests.sql`  
Expected: `False`

**Step 2: テーブルを作成する**

- `hospital_requests`
- `hospital_request_targets`
- `hospital_request_events`
- 必要インデックス（`hospital_id`, `status`, `sent_at`）

**Step 3: SQL実行**

Run: `node scripts/execute_sql.js scripts/setup_hospital_requests.sql`  
Expected: テーブル作成成功

**Step 4: Commit**

```bash
git add scripts/setup_hospital_requests.sql
git commit -m "feat: add schema for hospital request lifecycle"
```

### Task 2: 状態遷移ルールを定義する

**Files:**
- Create: `lib/hospitalRequestStatus.ts`

**Step 1: 定数・型を定義**

- `UNREAD`, `READ`, `NEGOTIATING`, `ACCEPTABLE`, `NOT_ACCEPTABLE`, `TRANSPORT_DECIDED`, `TRANSPORT_DECLINED`

**Step 2: 遷移判定関数を実装**

- `canTransition(from, to, actorRole)` を作成
- 不正遷移を `false` にする

**Step 3: 型チェック**

Run: `npm run lint`  
Expected: エラーなし

**Step 4: Commit**

```bash
git add lib/hospitalRequestStatus.ts
git commit -m "feat: add request status transition rules"
```

### Task 3: 救急隊送信時に専用テーブルへ保存する

**Files:**
- Modify: `app/api/cases/send-history/route.ts`

**Step 1: 現行保存処理を確認する**

- 既存の `send_history` 保存処理を把握

**Step 2: 追加保存処理を実装**

- 送信時に `hospital_requests` を1件作成
- 送信病院ごとに `hospital_request_targets` 作成（初期 `UNREAD`）
- `hospital_request_events` に `sent` イベント追加

**Step 3: 失敗時ロールバックを実装**

- トランザクション化

**Step 4: Commit**

```bash
git add app/api/cases/send-history/route.ts
git commit -m "feat: persist outbound requests into hospital request tables"
```

### Task 4: 病院側一覧APIを作成する

**Files:**
- Create: `app/api/hospitals/requests/route.ts`

**Step 1: 認証・認可チェック実装**

- `HOSPITAL` ロールのみ許可
- ログインユーザーの `hospital_id` を取得

**Step 2: 一覧取得SQL実装**

- `hospital_request_targets` を `hospital_id` で絞る
- 必要なら `hospital_requests` / `cases` / `emergency_teams` と JOIN

**Step 3: レスポンス整形**

- 表示必要項目のみ返す

**Step 4: Commit**

```bash
git add app/api/hospitals/requests/route.ts
git commit -m "feat: add hospital inbound request list api"
```

### Task 5: 病院側詳細APIと既読化を実装する

**Files:**
- Create: `app/api/hospitals/requests/[targetId]/route.ts`

**Step 1: 詳細取得時の既読化**

- 初回詳細表示で `UNREAD -> READ`
- `opened_at` 更新
- `hospital_request_events` に `opened_detail`

**Step 2: 不正アクセス防止**

- 自院以外 `403`

**Step 3: Commit**

```bash
git add app/api/hospitals/requests/[targetId]/route.ts
git commit -m "feat: mark hospital request as read on detail open"
```

### Task 6: 病院回答APIを実装する

**Files:**
- Create: `app/api/hospitals/requests/[targetId]/status/route.ts`

**Step 1: 受入可能/不可/要相談の更新実装**

- `READ/NEGOTIATING` から遷移許可
- 不正遷移は `400`

**Step 2: 監査イベント追記**

- `from_status`, `to_status`, `acted_by`

**Step 3: Commit**

```bash
git add app/api/hospitals/requests/[targetId]/status/route.ts
git commit -m "feat: add hospital response status update api"
```

### Task 7: 救急隊最終判断APIを実装する

**Files:**
- Create: `app/api/paramedics/requests/[targetId]/decision/route.ts`

**Step 1: `ACCEPTABLE` のみ決定操作を許可**

- `TRANSPORT_DECIDED` / `TRANSPORT_DECLINED` を更新

**Step 2: `TRANSPORT_DECIDED` 時に患者一覧反映**

- `hospital_patients`（または暫定テーブル）へ upsert

**Step 3: Commit**

```bash
git add app/api/paramedics/requests/[targetId]/decision/route.ts
git commit -m "feat: add paramedic final decision api for hospital requests"
```

### Task 8: 病院側受入依頼一覧UIを実データ化する

**Files:**
- Modify: `app/hospitals/requests/page.tsx`
- Create: `components/hospitals/HospitalRequestsTable.tsx`

**Step 1: 一覧表示**

- 送信時刻 / 事案ID / 送信元 / 状態 / 詳細ボタン

**Step 2: 緑アクセントでUI統一**

- 既存病院サイドバーのトーンに合わせる

**Step 3: Commit**

```bash
git add app/hospitals/requests/page.tsx components/hospitals/HospitalRequestsTable.tsx
git commit -m "feat: render inbound hospital request list from api"
```

### Task 9: 病院側詳細UIを実装する

**Files:**
- Create: `app/hospitals/requests/[targetId]/page.tsx`
- Create: `components/hospitals/HospitalRequestDetail.tsx`

**Step 1: 詳細表示**

- 事案サマリー
- 選択診療科
- 状態遷移ボタン（受入可能/受入不可/要相談）

**Step 2: 初回表示で既読化**

- 詳細API呼び出し時に更新

**Step 3: Commit**

```bash
git add app/hospitals/requests/[targetId]/page.tsx components/hospitals/HospitalRequestDetail.tsx
git commit -m "feat: add hospital request detail page with read tracking"
```

### Task 10: 救急隊側で既読状態を可視化する

**Files:**
- Modify: `components/cases/CaseFormPage.tsx` (または送信履歴表示箇所)
- Create/Modify: 必要なAPI呼び出しヘルパー

**Step 1: 病院別状態を表示**

- 未読/既読/要相談/受入可/受入不可/搬送決定/搬送辞退

**Step 2: UI差分最小で反映**

- 既存送信履歴テーブルへ列追加

**Step 3: Commit**

```bash
git add components/cases/CaseFormPage.tsx
git commit -m "feat: show per-hospital read and response status for paramedics"
```

### Task 11: ドキュメント更新・最終検証

**Files:**
- Modify: `README.md`
- Modify: `docs/IMPLEMENTATION_GUIDE.md`

**Step 1: セットアップ手順追記**

- 新SQL実行手順
- 状態遷移仕様

**Step 2: 最終チェック**

Run: `npm run lint && npm run build`  
Expected: 成功

**Step 3: Commit**

```bash
git add README.md docs/IMPLEMENTATION_GUIDE.md
git commit -m "docs: add hospital request lifecycle setup and operation guide"
```

