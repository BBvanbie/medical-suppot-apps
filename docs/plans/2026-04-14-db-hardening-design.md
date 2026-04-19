# DB hardening / inventory design

更新日: 2026-04-14

## 背景

- 本番DBレビューで、`通知 dedupe の実効性`、`schema適用方式の二重管理`、`analytics fallback の不整合`、`履歴保持の cascade` を主要論点として確認した
- あわせて、DBテーブル一覧と query inventory を別紙で整理した

## 目的

1. 本番DBの schema と query の正本を一本化する
2. 互換 fallback ではなく、正しい schema 前提の query に揃える
3. 通知、搬送決定、監査などの業務履歴を冪等かつ説明可能にする
4. 削除候補と統合候補を段階的に解消する

## 設計方針

### 1. schema 適用は migration 正本

- `scripts/setup_*.sql` を起点に、正式 migration 群を用意する
- runtime の `ensure*Schema` / `ensure*Tables` は、本番 mutate をやめる方向で縮退する
- 起動時は `schema version mismatch を検知して fail fast` を優先する

### 2. case identity は `case_uid` 正本

- relation / join / analytics / request 履歴は `case_uid` を正本とする
- `case_id` は業務番号、表示番号、検索互換として残す
- `case_id OR case_uid` の曖昧解決は入口 helper に限定する

### 3. 通知と送信履歴は冪等化

- `notifications` は dedupe 制約を migration で必須化する
- `hospital_request_events` の `sent` は request 再試行で重複しない設計にする
- `hospital_patients` の一意制御は維持しつつ、競合と履歴の扱いを明文化する

### 4. analytics は fallback で別結果を返さない

- `lib/dashboardAnalytics.ts` の fallback query は削除対象
- migration 未適用時は warning ではなく、明示的な障害として扱う

### 5. 履歴は hard delete に弱くしない

- `notifications`、`hospital_request_targets`、`hospital_patients` などの `ON DELETE CASCADE` を見直す
- まずは delete 運用の有無を確認し、その後 schema を調整する

## 実装優先順位

### P0

1. DB inventory と query inventory を docs として固定する
2. notifications dedupe 制約を正式 migration に昇格する
3. `ensure*` の `42501` スキップ方針を見直す
4. analytics fallback 削除方針を決める

### P1

1. `hospital_request_events(sent)` の冪等化
2. `resolveCaseByAnyId` / `resolveCaseAccessContext` の統合
3. request / detail query の shared repository 化
4. cascade と履歴保持方針の整理

### P2

1. `ILIKE` 検索の性能改善
2. index の削減候補を `EXPLAIN ANALYZE` ベースで評価
3. 本番相当データでの query 定点観測を CI / runbook に組み込む

## 削除対象の考え方

### まず削除するもの

- `dashboardAnalytics` の legacy fallback query
- migration 化後の runtime schema mutate

### すぐには削除しないもの

- 本番テーブル本体
- 単一 index
- `case_id` カラム

理由:
- 現時点ではどれも参照が残っており、先に query / migration / 保守導線を整理する必要がある

## 関連文書

- `docs/reference/db-table-inventory-2026-04-14.md`
- `docs/reference/db-query-inventory-2026-04-14.md`
- `docs/current-work.md`
