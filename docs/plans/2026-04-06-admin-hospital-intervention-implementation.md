# Admin / HOSPITAL 導線強化実装メモ

最終更新: 2026-04-06

## 目的

- Admin は監視 / 分析導線を強化する
- HOSPITAL は backlog / consult / response の対応効率を上げる

## 実装ステップ

### Step 1. Admin drill-down 定義

- 問題カテゴリ別
- 病院別
- 地域別
- dashboard から一覧へ条件付き遷移

### Step 2. HOSPITAL priority sort

- `NEGOTIATING` 停滞
- `READ` 未返信
- `UNREAD` 未読
- `ACCEPTABLE` 未確定
- 古い順

### Step 3. HOSPITAL detail panel 強化

- patient summary
- selection history
- comment history
- current status
- recent action
- next action

### Step 4. focused E2E

- HOSPITAL priority order
- Admin drill-down filter
- HOSPITAL direct response path

## 初回実装の完了条件

- priority sort がコード上で明示される
- HOSPITAL detail panel が必要情報を一画面で持つ
- Admin 側に drill-down path が定義される

## 実施記録

### 2026-04-06

- Step 1 実装
  - Admin home に `PROBLEM DRILL-DOWN`、病院別 / 地域別 drill-down link を追加
  - `/admin/cases` API に `problem / hospitalName / area` filter を追加
  - `AdminCasesPage` に drill-down context note を追加
- Step 2 実装
  - HOSPITAL priority sort を `lib/hospitalPriority.ts` に明示化
  - request list / consult list / dashboard pendingItems に同じ sort を適用
- Step 3 実装
  - `HospitalRequestDetail` に `直近 action` と `次に押せる action` を追加
- focused E2E
  - `e2e/tests/admin-hospital-intervention.spec.ts` を追加
  - 当初は localhost 応答不安定で Playwright の `page.goto(/login)` が `ERR_ABORTED` になり、再確認未完了だった
  - 2026-04-06 の localhost 安定化後に `e2e/tests/admin-hospital-intervention.spec.ts` は再通過
