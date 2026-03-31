# オフライン workstream

最終更新: 2026-03-31

## 目的

- EMS がオフラインでも最低限の業務継続と回復操作を行えるようにする

## 現在の状態

- 状態: Phase 1 完了
- 未送信キューの失敗理由分類と回復導線を追加済み
- オフライン競合は `手動解決` `server優先` `フォーム再保存` の最小実装済み
- `degraded` 依存は廃止し、オフラインのみで制限する構成へ整理済み

## 残っているもの

1. 差分比較 UI や自動マージは未対応
2. オフライン対象データ一覧の docs 化は未完了
3. 後続の通知マトリクスや運用監視との接続は未整理

## 完了条件

- current phase のオフライン回復導線と競合方針が docs / 実装 / E2E で一致している

## 関連ファイル

- [`offlineSync.ts`](/C:/practice/medical-support-apps/lib/offline/offlineSync.ts)
- [`OfflineQueuePage.tsx`](/C:/practice/medical-support-apps/components/settings/OfflineQueuePage.tsx)
- [`CaseFormPage.tsx`](/C:/practice/medical-support-apps/components/cases/CaseFormPage.tsx)

## 関連 plan

- [2026-03-31-offline-queue-recovery-design.md](/C:/practice/medical-support-apps/docs/plans/2026-03-31-offline-queue-recovery-design.md)
- [2026-03-31-offline-conflict-resolution-design.md](/C:/practice/medical-support-apps/docs/plans/2026-03-31-offline-conflict-resolution-design.md)
