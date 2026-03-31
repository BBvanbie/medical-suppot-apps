# EMS Offline E2E Runbook

**Date:** 2026-03-16

## Goal

EMS のオフライン導線を Playwright で継続的に検証できる状態にする。

## Covered Scenarios

1. オフライン時に送信系操作が無効化される
2. `/settings/offline-queue` に queued item が表示される
3. `/settings/offline-queue` の件数表示が更新される
4. ケース検索画面からオフライン制約が分かる
5. 通知的な注意文言が表示される
6. 相談返信 queue の表示を確認できる
7. 日本語 UI 文言が壊れていないことを確認する

## Manual Follow-up Scenarios

- 病院検索 UI の詳細なオフライン表現
- 同期再実行 UI の細かな状態確認
- `case draft` の途中保存
- `case_update` や `settings_sync` の競合ケース
- `offline-*` ID から server `caseId` への置換
- `updated_at` の競合解決ロジック

## Preconditions

- `.env.local` に `DATABASE_URL` が設定されている
- Playwright 実行に必要なブラウザが入っている
- `npm install` 済み

## Implementation Steps

### 1. Normalize E2E fixtures

- `e2e/support/test-data.ts` の case id と seed の対応を揃える
- オフライン対象ケースが毎回安定して見えるようにする

### 2. Add browser-side IndexedDB helpers

- `e2e/support/offline.ts` に IndexedDB の store 操作用 helper を追加する
- queue seed / read helper を用意する
- `navigator.onLine` と `offline/online` event を扱う helper を用意する

### 3. Add offline Playwright scenarios

- `e2e/tests/ems-offline.spec.ts` に主要シナリオを追加する
- 必要に応じて `data-testid` や queue id を補う
- 日本語文言や Unicode escape を含む表示が崩れていないことを確認する

### 4. Run local verification

- `npm run check`
- `npx playwright test e2e/tests/ems-offline.spec.ts`

## Execution Result on 2026-03-16

- `npm run check`: 実行
- `npm run lint`: success
- `npm run typecheck`: success
- `npx playwright test e2e/tests/ems-offline.spec.ts`: 6 passed

## Notes

- `app/cases/search/page.tsx` では `OfflineProvider` 配下で `useOfflineState()` を参照するため、provider の外ではなく content component 側で判定する
- `npm run check` の `eslint` が Node OOM になる環境では、`NODE_OPTIONS=--max-old-space-size=4096` を付けて `lint` を実行する
- PostgreSQL の `sslmode` 差異で Playwright が不安定な場合は接続文字列を明示的に揃える
