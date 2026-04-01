# Phase 2 workstream

最終更新: 2026-04-01

## 目的

- Phase 1 の安全性と整合性を固めた後、運用改善と検索品質改善へ進む

## 現在の状態

- 状態: 単位A-C完了
- 設計メモ: [2026-04-01-phase2-operations-design.md](/C:/practice/medical-support-apps/docs/plans/2026-04-01-phase2-operations-design.md)
- 実装メモ: [2026-04-01-search-score-implementation.md](/C:/practice/medical-support-apps/docs/plans/2026-04-01-search-score-implementation.md)
- 実装メモ: [2026-04-01-phase2-alerts-implementation.md](/C:/practice/medical-support-apps/docs/plans/2026-04-01-phase2-alerts-implementation.md)
- 実装メモ: [2026-04-01-phase2-metrics-implementation.md](/C:/practice/medical-support-apps/docs/plans/2026-04-01-phase2-metrics-implementation.md)

## 次にやること

1. 統合仕様書の未整理項目を継続更新する
2. `search score snapshot` が本当に必要になった時点で、送信履歴 payload と DB 保存先をまとめて設計する
3. metrics を前提に追加 E2E や focused check が必要になったら別 workstream として切る

## 完了済み

- Phase 2 の設計メモを作成
- 実装順を `A. Search score -> B. Alert -> C. Metrics` に固定
- Search score の server-side 算出を追加
- `/api/hospitals/recent-search` に `searchScore` / `scoreBreakdown` / `scoreSummary` を追加
- EMS 病院検索の表形式を score 順表示へ更新
- score 理由表示の focused E2E を追加
- `selection_stalled` / `consult_stalled` の共通候補抽出を追加
- EMS / HOSPITAL 通知へ stalled alert を追加
- Admin dashboard alert に stalled alert を追加
- stalled alert focused E2E を追加
- `dashboardAnalytics.ts` の KPI を Phase 2 の画面指標へ寄せて整理
- Admin dashboard の case / target 集計境界を調整
- `search score snapshot` は Phase 2 では見送り、必要時に送信履歴と DB を同時設計する判断を記録

## 完了条件

- Search score, stalled alert, monitoring metrics の 3 単位が実装済み
- current-work と workstream が次の着手点を示している
- 必要な check と focused E2E が実施済み

## 関連 plan

- [2026-04-01-phase2-operations-design.md](/C:/practice/medical-support-apps/docs/plans/2026-04-01-phase2-operations-design.md)
- [2026-04-01-search-score-implementation.md](/C:/practice/medical-support-apps/docs/plans/2026-04-01-search-score-implementation.md)
- [2026-04-01-phase2-alerts-implementation.md](/C:/practice/medical-support-apps/docs/plans/2026-04-01-phase2-alerts-implementation.md)
- [2026-04-01-phase2-metrics-implementation.md](/C:/practice/medical-support-apps/docs/plans/2026-04-01-phase2-metrics-implementation.md)
