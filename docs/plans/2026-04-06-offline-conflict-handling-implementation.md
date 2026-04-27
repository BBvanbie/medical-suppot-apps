# offline conflict handling 強化実装メモ

最終更新: 2026-04-06

## 目的

- unsafe な automerge を避けつつ、offline conflict の理解可能性と運用安全性を上げる。

## 実装ステップ

### Step 1. snapshot foundation

- server snapshot 保持
- compare source の明確化

### Step 2. conflict classification

- no conflict
- local only changed
- server only changed
- both changed

### Step 3. Offline Queue diff UI

- detail panel / modal
- `server / local / later`

### Step 4. queue behavior hardening

- conflict type 表示
- `retry all` skip
- discard 前の確認強化

## 初回実装の完了条件

- Offline Queue から conflict 詳細が見られる
- `retry all` が conflict をスキップする
- case draft 競合で 3 択を出せる

## 実施記録

### 2026-04-06

- Step 1 実装
  - `OfflineCaseDraft` に `serverSnapshot` を保持
  - `/api/cases/[caseId]/offline-conflict` を追加し、server payload snapshot を取得可能にした
- Step 2 実装
  - `lib/offline/offlineConflict.ts` に field-group 単位の conflict classification を追加
  - `local_only_changed / server_only_changed / both_changed_same_field / both_changed_different_fields / requires_review`
    を定義
- Step 3 実装
  - `OfflineQueuePage` detail panel に conflict summary を追加
  - `server / local / later` の初期三択を UI に反映
    - `server優先で破棄`
    - `localを採用して再保存`
    - `あとで確認する`
- Step 4 実装
  - conflict item に `retry all` が効かない現行挙動を維持
  - conflict type / field group を detail 上で表示
- focused E2E
  - `e2e/tests/ems-offline.spec.ts` に conflict summary 確認を追加
  - 当初は localhost 応答不安定で Playwright の `page.goto(/login)` が `ERR_ABORTED` になり、再確認未完了だった
  - 2026-04-06 の localhost 安定化後に focused E2E を再実行
  - `serverSnapshot` seed が現行 case fixture とずれており、期待どおり `localのみ変更` にならなかったため spec を修正
  - locator も summary scope に絞り、`e2e/tests/ems-offline.spec.ts --grep "inspect conflict classification and defer review"` は再通過

### 2026-04-22

- `lib/offline/offlineConflict.ts`
  - `buildOfflineConflictGroupDiffs()` を追加し、`base / local / server` の差分を field path 単位で生成できるようにした
- `components/settings/OfflineQueuePage.tsx`
  - conflict detail に group ごとの diff panel を追加した
  - `base / local / server` の 3 列で、どの field が local 変更か / server 変更かをその場で追えるようにした
- focused E2E
  - `e2e/tests/ems-offline.spec.ts` の conflict review ケースで diff UI の表示まで確認するようにした
  - `npx playwright test e2e/tests/ems-offline.spec.ts --grep "inspect conflict classification and defer review" --reporter=line` 相当の focused 実行で通過を確認した
