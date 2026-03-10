# Documentation Guide

`docs/` は用途ごとに次のように扱います。

- `docs/IMPLEMENTATION_GUIDE.md`
  実装の全体ガイドと開発導線。
- `docs/system-spec-2026-03-06.md`
  現行仕様の基準文書。
- `docs/UI_RULES.md`
  UI 実装の共通ルール。
- `docs/hospital-names.md`
  病院名データの補助資料。
- `docs/plans/`
  日付付きの設計書と実装計画。`*-design.md` と `*-implementation.md` を対で残す。
- `docs/cleanup/`
  一回限りの棚卸し・監査メモ。

運用ルール:

- 新しい機能作業は `docs/plans/YYYY-MM-DD-<topic>-design.md` と `docs/plans/YYYY-MM-DD-<topic>-implementation.md` を基本形にする。
- 途中メモや作業ログは恒久仕様に混ぜず、必要なら `docs/cleanup/` に寄せる。
- 既存仕様を更新した場合は、関連する plan だけでなく `system-spec` や `IMPLEMENTATION_GUIDE` への反映要否も確認する。
