# 通知 workstream

最終更新: 2026-04-01

## 目的

- 通知の重複抑止、再通知、期限、確認済みを運用可能な形で維持する

## 現在の状態

- 状態: 完了
- `severity` `dedupe_key` `expires_at` `acked_at` を追加済み
- HOSPITAL の未応答再通知 / 返信遅延通知を追加済み
- EMS の未確認再通知を追加済み
- 初回 E2E で dedupe race を検出し、DB unique と競合吸収を追加済み
- focused Playwright により運用通知、dedupe、ack を再確認済み
- 本番既存重複通知に備え、runtime では dedupe unique index を作らず、`scripts/fix_notification_dedupe_unique.sql` で明示適用する運用へ変更

## 次にやること

1. 通知 matrix と統合仕様書の wording を必要時のみ微修正する
2. 新しい通知種別を追加したときは focused Playwright を同系統に追加する

## 完了条件

- 追加した通知運用 E2E が安定して通る
- 仕様書と workstream の状態が一致している

## 直近の確認

- `npx.cmd playwright test e2e/tests/hospital-flows.spec.ts e2e/tests/operational-alerts.spec.ts` 通過
- `request_repeat`, `reply_delay`, `selection_stalled`, `consult_stalled`, `ack` の挙動を確認済み

## 関連ファイル

- [`notifications.ts`](/C:/practice/medical-support-apps/lib/notifications.ts)
- [`route.ts`](/C:/practice/medical-support-apps/app/api/notifications/route.ts)
- [`NotificationBell.tsx`](/C:/practice/medical-support-apps/components/shared/NotificationBell.tsx)

## 関連 plan

- [2026-03-31-notification-ops-design.md](/C:/practice/medical-support-apps/docs/plans/2026-03-31-notification-ops-design.md)
- [2026-03-31-notification-ops-implementation.md](/C:/practice/medical-support-apps/docs/plans/2026-03-31-notification-ops-implementation.md)
