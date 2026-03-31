# Documentation Guide

`docs/` は用途ごとに次のように扱います。

- `docs/current-work.md`
  次回再開用の統合実装計画。進行中・完了済み・次回着手順をここで管理する。
- `docs/workstreams/`
  テーマ別の状態整理。残作業、完了条件、関連 plan をここで管理する。
- `docs/IMPLEMENTATION_GUIDE.md`
  実装の全体ガイドと開発導線。
- `docs/system-spec-2026-03-29.md`
  現行コードベース準拠の統合仕様書。
- `docs/UI_RULES.md`
  UI 実装の共通ルール。
- `docs/reference/`
  補助資料や参照専用の一覧、棚卸し資料。
- `docs/domain/`
  特定ドメイン専用の仕様メモや所見関連資料。
- `docs/legacy/`
  旧仕様書、旧サマリ、旧入口などの履歴文書。
- `docs/plans/`
  日付付きの設計書と実装計画。`*-design.md` と `*-implementation.md` を対で残す。
- `docs/cleanup/`
  一回限りの棚卸し・監査メモ。

運用ルール:

- 新しい機能作業は `docs/plans/YYYY-MM-DD-<topic>-design.md` と `docs/plans/YYYY-MM-DD-<topic>-implementation.md` を基本形にする。
- 現在の再開点の正本は `docs/current-work.md`、テーマ別の状態整理は `docs/workstreams/` とする。
- 参照専用資料は `docs/reference/`、旧版は `docs/legacy/`、ドメイン固有資料は `docs/domain/` に寄せる。
- 途中メモや作業ログは恒久仕様に混ぜず、必要なら `docs/cleanup/` に寄せる。
- 既存仕様を更新した場合は、関連する plan だけでなく最新の `system-spec-2026-03-29.md` や `IMPLEMENTATION_GUIDE` への反映要否も確認する。
