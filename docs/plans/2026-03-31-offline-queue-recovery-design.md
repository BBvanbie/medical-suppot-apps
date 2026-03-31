# 未送信キュー回復導線設計

## 結論

- EMS のオフライン運用は「通信状態の常時警告」ではなく「失敗した操作を分類し、未送信キューから回復できること」を主軸にする。
- `degraded` のような曖昧な中間状態は持たず、`offline` と `reconnected` のみを通信状態表示に使う。
- 未送信キューでは、各項目に対して `失敗理由の分類` と `推奨アクション` を保持し、個別再送と一括再送を提供する。

## 前提と制約

- 対象は EMS 系画面の未送信キュー運用であり、HOSPITAL / ADMIN の業務フローは変えない。
- 既存の IndexedDB 構成と `OfflineQueueItem` を拡張して対応する。別ストアは増やさない。
- 既存の送信保留対象は `case_update` `settings_sync` `hospital_request_send` `consult_reply` の4種。
- `hospital_request_send` と `consult_reply` は手動送信中心、`case_update` と `settings_sync` は復帰時自動同期を維持する。

## 方式比較

### 案A: 通信状態を細かく増やして UI 制御する

- 利点: 画面ごとの表示は増やしやすい。
- 欠点: 判定根拠が曖昧で誤検知しやすい。実際の回復導線が弱いままになる。

### 案B: 未送信項目ごとに失敗理由と推奨アクションを持つ

- 利点: 「何が失敗し、次に何をすべきか」を利用者が判断しやすい。
- 利点: オフライン、サーバー失敗、競合を同じバナーに押し込めずに済む。
- 欠点: 型、同期ロジック、キュー UI の更新が必要。

## 推奨設計

- `OfflineQueueItem` に以下を追加する。
  - `failureKind`: `network | server | validation | conflict | unknown | null`
  - `recoveryAction`: `retry | review | discard | null`
  - `lastAttemptAt`: 最後に送信を試行した時刻
- 同期失敗時は HTTP ステータスや競合判定から失敗理由を分類する。
- 未送信キュー画面では以下を提供する。
  - 状態サマリー
  - 個別詳細
  - 個別再送
  - 一括再送
  - 個別破棄
- 送信元画面では、オフライン保存メッセージを維持しつつ、失敗時は「未送信キュー確認」前提の説明に寄せる。

## 非目標

- 新しいバックグラウンド同期機構の追加
- 通知基盤の刷新
- HOSPITAL / ADMIN 側のオフライン運用拡張

## 影響ファイル

- `lib/offline/offlineTypes.ts`
- `lib/offline/offlineSync.ts`
- `components/settings/OfflineQueuePage.tsx`
- `e2e/support/offline.ts`
- `e2e/tests/ems-offline.spec.ts`

## 検証方針

- `npm run typecheck`
- `npm run check`
- `npx playwright test e2e/tests/ems-offline.spec.ts`