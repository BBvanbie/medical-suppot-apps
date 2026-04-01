# 2026-04-01 Phase 2 Alert 実装メモ

## 目的

- `selection_stalled` / `consult_stalled` を Phase 2 の単位Bとして通知と Admin dashboard alert に反映する
- `consult_stalled` の audience を設計どおり `EMS` / `HOSPITAL` / `ADMIN` に揃える

## 今回の実装

1. `lib/operationalAlerts.ts` を追加
   - `selection_stalled` / `consult_stalled` の候補抽出を共通化
   - warning / critical の閾値判定を一元化
2. `lib/notifications.ts` を更新
   - EMS: `selection_stalled` / `consult_stalled`
   - HOSPITAL: `consult_stalled`
   - 既存と同じ bucket + dedupe key 方式で materialize
3. `lib/dashboardAnalytics.ts` を更新
   - Admin dashboard alerts に stalled alert 件数を反映
4. focused E2E を更新
   - EMS team scope の `selection_stalled`
   - EMS team scope の `consult_stalled`
   - HOSPITAL 通知と ADMIN dashboard alert

## 実装メモ

- Admin dashboard は E2E seed 以外の既存データも集計対象になるため、alert 件数の完全一致ではなく stalled alert 文言の出現で検証する
- `consult_stalled` の EMS 通知は team scope で絞り、一覧導線は `cases-list` に寄せる
- `selection_stalled` / `consult_stalled` とも通知生成は `GET /api/notifications` 時の materialize を継続する

## 確認

- `npm run check`
- `npx.cmd playwright test e2e/tests/operational-alerts.spec.ts`

## 次

- 単位Cとして `dashboardAnalytics.ts` の KPI 定義整理と workstream/docs 反映を進める
