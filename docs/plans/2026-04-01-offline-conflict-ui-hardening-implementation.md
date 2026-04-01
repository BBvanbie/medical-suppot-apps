# オフライン競合 UI 強化実装メモ

最終更新: 2026-04-01

## 実装内容

- `OfflineQueuePage` に conflict 専用 detail block を追加
- conflict item から事案詳細へ戻る導線を追加
- conflict item に対して `server優先で破棄` を追加し、queue item と local draft を同時に整理
- `CaseFormPage` の header 内へ競合復元 banner を追加

## 期待する回復導線

1. フォームで競合復元に気づく
2. そのまま内容確認して再保存する
3. あるいは offline queue で server 優先整理を行う

## 確認

- `npm run check`
