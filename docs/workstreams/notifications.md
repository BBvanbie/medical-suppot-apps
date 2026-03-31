# 通知 workstream

最終更新: 2026-03-31

## 目的

- 通知の重複抑止、再通知、期限、確認済みを運用可能な形で維持する

## 現在の状態

- 状態: 主要実装完了、E2E 追確認待ち
- `severity` `dedupe_key` `expires_at` `acked_at` を追加済み
- HOSPITAL の未応答再通知 / 返信遅延通知を追加済み
- EMS の未確認再通知を追加済み
- 初回 E2E で dedupe race を検出し、DB unique と競合吸収を追加済み
- 最終の対象 Playwright 再確認だけ未完了

## 次にやること

1. 通知運用 E2E を安定したローカルサーバー状態で再実行する
2. 必要なら通知マトリクスを別 docs に整理する
3. 認可共通化後の API から発火する通知との整合を確認する

## 完了条件

- 追加した通知運用 E2E が安定して通る
- 仕様書と workstream の状態が一致している

## 関連ファイル

- [`notifications.ts`](/C:/practice/medical-support-apps/lib/notifications.ts)
- [`route.ts`](/C:/practice/medical-support-apps/app/api/notifications/route.ts)
- [`NotificationBell.tsx`](/C:/practice/medical-support-apps/components/shared/NotificationBell.tsx)

## 関連 plan

- [2026-03-31-notification-ops-design.md](/C:/practice/medical-support-apps/docs/plans/2026-03-31-notification-ops-design.md)
- [2026-03-31-notification-ops-implementation.md](/C:/practice/medical-support-apps/docs/plans/2026-03-31-notification-ops-implementation.md)
