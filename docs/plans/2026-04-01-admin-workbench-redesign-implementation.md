# Admin Workbench Redesign Implementation

最終更新: 2026-04-01

## 実装単位

1. admin 共通 workbench helper を追加
2. `AdminPortalShell` の背景トーンを admin 向けに調整
3. `AdminCasesPage` を高密度 row list + detail workbench へ再構築
4. `AdminLogsPage` を一覧 + JSON detail workbench へ再構築
5. `AdminUsersPage` を一覧 + editor workbench へ再構築

## 実装メモ

- orange は CTA、選択中、section kicker に限定して使う
- 日本語文言は既存用語を維持する
- `cases` の詳細モーダルは残しつつ、一覧画面内でも履歴比較しやすくする
- `logs` の JSON は黒背景固定ではなく、中立な slate 面で可読性を優先する
- `users` の編集面は既存 API / validation / confirm dialog をそのまま使う

## 確認メモ

- `npm run check` 通過
