# Admin コンプライアンス運用記録レジャー design

日付: 2026-04-22

## 結論

- 導入先の実名責任者や実保管場所を repo に固定できない間も、ガイドライン準拠を支える技術的基盤として `運用記録レジャー` を先に実装する。
- 対象は `ID 棚卸`、`監査レビュー`、`restore drill`、`資産 / 教育`、`委託先見直し`、`ネットワーク安全管理見直し` の 6 系統とする。
- Admin は設定画面から実施記録を登録し、監視 / システム設定から期限超過と要フォローアップ件数を確認できるようにする。

## 前提と制約

- 導入先が未確定のため、実名責任者、実保管場所、実ベンダ名は repo に固定できない。
- 既存 docs には runbook と様式があるが、システム内で「実施済み / 未実施 / 次回期限」を一元管理する機能がない。
- 本リポジトリは migration 追加運用が正本であり、既存 setup SQL の直編集では進めない。
- 影響範囲は `ADMIN` に限定し、`EMS`、`HOSPITAL` の挙動は変えない。

## 方式比較

### 案 A: docs のみ継続強化

- 利点:
  - 実装コストが最小
- 欠点:
  - 実施記録の期限管理、監視、検索、証跡化がシステム内に残らない
  - `Guideline に準拠した技術を持つシステム` という説明力が弱い

### 案 B: 汎用コンプライアンス運用記録レジャーを追加

- 利点:
  - 実データ未確定でも、監査 / 点検 / 訓練の記録、期限、要フォローアップをシステムで扱える
  - 既存の `backup_run_reports` と同じ監視文法で Admin に見せられる
  - 導入先決定後は `evidenceLocation` や notes に実記録の参照先を差し込める
- 欠点:
  - DB、API、UI、docs の追加が必要

## 推奨設計

- 案 B を採用する。
- 新規テーブル `compliance_operation_runs` を追加し、次を保持する。
  - `operation_key`
  - `status`
  - `completed_at`
  - `next_due_at`
  - `evidence_location`
  - `notes`
  - `reported_by_user_id`
  - `created_at`
- `operation_key` は次の固定語彙を使う。
  - `id_inventory`
  - `audit_review`
  - `restore_drill`
  - `asset_training`
  - `vendor_review`
  - `network_review`
- `status` は `completed` と `needs_followup` の 2 値にする。
- Admin 設定配下に `/admin/settings/compliance` を追加し、以下を載せる。
  - 直近 summary
  - operation ごとの最新実施状況
  - recent records
  - 新規記録フォーム
- `/admin/monitoring` と `/admin/settings/system` に summary を追加し、期限超過や follow-up を他の運用 signal と同列で見えるようにする。
- API は `GET/POST /api/admin/compliance-runs` とし、Admin のみ利用可能にする。

## 非目標

- 導入先固有の責任者マスタや保管場所マスタの固定化
- 実施記録の承認ワークフロー
- ファイル添付保管
- `EMS`、`HOSPITAL` 向け UI 展開

## 影響ファイル

- `scripts/migration_manifest.js`
- `scripts/migration_20260422_0012_compliance_operation_runs.sql`
- `lib/admin/adminComplianceRepository.ts`
- `app/api/admin/compliance-runs/route.ts`
- `components/admin/AdminComplianceRunForm.tsx`
- `app/admin/settings/compliance/page.tsx`
- `app/admin/settings/page.tsx`
- `app/admin/settings/system/page.tsx`
- `app/admin/monitoring/page.tsx`
- `docs/current-work.md`

## 検証方針

- `npm run check`
- 必要に応じて migration 適用後に Admin 画面の型整合を確認
- docs は `current-work` を再開ハブとして更新する
