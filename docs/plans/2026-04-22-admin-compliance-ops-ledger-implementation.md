# Admin コンプライアンス運用記録レジャー implementation

日付: 2026-04-22

## 目的

- 実データ未投入でも、ガイドライン準拠に必要な `点検 / 監査 / 訓練 / 見直し` の実施記録と期限管理をシステム内で扱える状態にする。

## 実装内容

1. DB
   - `compliance_operation_runs` テーブルを migration 追加で作成する
   - `operation_key`、`status` の check 制約と、`operation_key + completed_at` の参照 index を追加する

2. repository / API
   - `lib/admin/adminComplianceRepository.ts` を追加する
   - operation catalog、summary 集計、recent records 取得、record 作成を集約する
   - `GET/POST /api/admin/compliance-runs` を追加する

3. Admin UI
   - `/admin/settings/compliance` を追加する
   - 設定トップから遷移できる card を追加する
   - システム設定と監視画面に summary を追加する

4. docs
   - `docs/current-work.md` に本機能の追加と位置づけを反映する

## 完了条件

- Admin が画面から実施記録を 1 件追加できる
- latest status / overdue / follow-up が画面に表示される
- migration と型チェックが通る
- `current-work` に再開可能な状態で反映される
