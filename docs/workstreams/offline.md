# オフライン workstream

最終更新: 2026-04-12

## 目的

- EMS がオフラインでも最低限の業務継続と回復操作を行えるようにする

## 現在の状態

- 状態: Phase 1 完了
- 未送信キューの失敗理由分類と回復導線を追加済み
- オフライン競合は `手動解決` `server優先` `フォーム再保存` の最小実装済み
- `OfflineQueue` と `CaseForm` に競合回復導線を追加済み
- `degraded` 依存は廃止し、オフラインのみで制限する構成へ整理済み
- IndexedDB の TTL とログアウト時のローカル削除を追加済み
- セッション失効 / 端末未信頼時に削除できる helper を追加済み
- `caseDrafts` / `offlineQueue` / `hospitalCache` の新規保存を Web Crypto AES-GCM で暗号化済み

## 残っているもの

1. 差分比較 UI や自動マージは未対応
   - 現行の競合検知は `baseServerUpdatedAt` と最新 `updatedAt` の比較のみ
   - `server payload snapshot` を保持していないため、現時点では保留判断とする
   - 2026-04-05 時点で `offlineSync.ts` と競合 UI を再確認し、保留継続で問題ないと判断
2. 後続の通知マトリクスや運用監視との接続は未整理
3. `hospitalCache` は 2026-04-12 に暗号化対象へ追加済み。今後は検索速度への影響が出る規模になった場合だけ、キャッシュ粒度や保持期間を再検討する

## 完了条件

- current phase のオフライン回復導線と競合方針が docs / 実装 / E2E で一致している

## 関連ファイル

- [`offlineSync.ts`](/C:/practice/medical-support-apps/lib/offline/offlineSync.ts)
- [`offlineRetention.ts`](/C:/practice/medical-support-apps/lib/offline/offlineRetention.ts)
- [`offlineCrypto.ts`](/C:/practice/medical-support-apps/lib/offline/offlineCrypto.ts)
- [`OfflineQueuePage.tsx`](/C:/practice/medical-support-apps/components/settings/OfflineQueuePage.tsx)
- [`CaseFormPage.tsx`](/C:/practice/medical-support-apps/components/cases/CaseFormPage.tsx)

## 関連 plan

- [2026-03-31-offline-queue-recovery-design.md](/C:/practice/medical-support-apps/docs/plans/2026-03-31-offline-queue-recovery-design.md)
- [2026-03-31-offline-conflict-resolution-design.md](/C:/practice/medical-support-apps/docs/plans/2026-03-31-offline-conflict-resolution-design.md)
- [2026-04-01-offline-conflict-ui-hardening-design.md](/C:/practice/medical-support-apps/docs/plans/2026-04-01-offline-conflict-ui-hardening-design.md)
- [2026-04-01-offline-diff-automerge-decision.md](/C:/practice/medical-support-apps/docs/plans/2026-04-01-offline-diff-automerge-decision.md)
