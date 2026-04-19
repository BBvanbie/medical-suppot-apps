# 医療情報システム安全管理ガイドライン ギャップ整理 design

作成日: 2026-04-14

## 結論

- `docs/Guideline` の 5 文書と現行 docs を照合すると、技術的セキュリティ対策は進んでいる一方、ガイドライン準拠に必要な運用設計と証跡設計が不足している。
- 今後は `security / operations hardening` を単独テーマとして閉じず、より上位の `ガイドライン準拠ギャップ解消` に位置付けて進める。

## 前提と制約

- 現行 repo には認証、MFA、端末登録、監視、バックアップ、オフライン保護、脆弱性対応 runbook などの基盤がある。
- 一方で、ガイドラインは `責任分界`、`リスク評価`、`監査`、`BCP`、`委託 / クラウド管理`、`真正性 / 保存性` まで求める。
- 本プロジェクトは救急搬送支援システムであり、`EMS / HOSPITAL / ADMIN / DISPATCH` の役割分離が前提である。
- どこまでを正式な診療録等の保存主体として扱うかは未確定であり、この点は product scope の判断に依存する。

## 方式比較

### 案1: 既存 security plan の残件として吸収する

- 利点:
  既存文書の延長で扱える。
- 欠点:
  ガイドラインが要求する governance / evidence / BCP / 委託管理が埋もれる。技術対策だけ進んで準拠判断が曖昧になる。

### 案2: ガイドライン準拠ギャップを独立テーマ化する

- 利点:
  docs、運用、infra、product の横断課題をまとめて扱える。優先順位が明確になる。
- 欠点:
  文書テーマが 1 つ増える。

## 推奨設計

- 案2を採用する。
- `docs/medical-safety-guideline-gap-summary.md` を docs 直下の短い正本にし、具体的な履歴は plan に残す。
- 実行順は以下とする。

1. docs foundation
   - 責任分界表
   - リスクアセスメント台帳
   - 規程 / 証跡一覧
   - 委託 / クラウド確認 checklist
2. operations foundation
   - 監査 / 点検 runbook
   - ID 棚卸手順
   - 教育 / 訓練記録
   - BCP / restore drill 記録
   - ネットワーク運用文書
3. product / infra implementation
   - docs で確定した不足をコードや infra 要件へ落とす
   - 特に真正性 / 保存性 / 代行入力 / 時刻管理は scope 判定後に着手する

## 影響ファイル

- `docs/medical-safety-guideline-gap-summary.md`
- `docs/current-work.md`
- `docs/plans/2026-04-14-medical-safety-guideline-gap-implementation.md`

## 検証方針

- 今回は docs 更新のみとし、既存 docs と矛盾しないことを確認する。
- 実装チェックコマンドは実行しない。コード変更がないため。
