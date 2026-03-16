---
name: db-design
description: 既存の PostgreSQL テーブル、repository、seed scripts を確認したうえで、スキーマ変更やデータ設計を安全に進めるための skill。保存項目追加、履歴設計、移行影響、既存データ整合を整理したいときに使う。
---

# db-design

## purpose

- DB 変更を UI/API の都合だけで決めず、運用と移行の安全性を含めて設計する。

## use this skill when

- 新しい保存項目、テーブル、履歴、ステータス、関連付けが必要なとき
- `scripts/*.sql`、repository、seed データへの影響を伴うとき
- 既存データとの互換性や backfill を整理したいとき

## do not use this skill when

- DB を触らない UI の微修正だけを行うとき
- 既存 schema をそのまま利用する単純な API 実装だけを行うとき

## workflow

1. 現行テーブル、repository、seed/setup scripts を確認する。
2. 読み書きパスと既存データへの影響を整理する。
3. schema、migration/backfill、検証方法を決める。
4. 実装前にリスクとロールバック観点を残す。

## output format

- 現状整理
- 提案 schema/data change
- 移行/互換性
- 検証方法

## quality bar

- 永続化先と利用箇所の整合があること
- 既存データへの影響説明があること
- 必要なら backfill/seed 観点まで触れていること

## review order

1. 何を保存したいのかを明確にする
2. 既存 schema や責務と衝突しないか確認する
3. `NULL` 許容、required、default の妥当性を決める
4. migration の安全性と既存データ影響を確認する
5. repository、query、API、UI の追従箇所を洗い出す

## minimum checklist

- 新規カラムや relation は本当に必要か
- optional と required のどちらが妥当か
- 既存データで migration failure や不整合が起きないか
- backfill が必要か
- default 値で意味が通るか
- 一覧取得、詳細取得、更新処理の query 影響があるか
- 型生成や validation 定義の追従が必要か
- 監査履歴や状態遷移ロジックへ副作用が出ないか

## avoid

- UI 都合だけで DB 項目を増やす
- 一時的な表示都合を永続化に逃がす
- migration の通過だけ見て運用影響を見ない
- repository 修正なしで schema だけ変えて終える

## project-specific notes

- このリポジトリは `pg` と手動 SQL/script 運用があるため、コード変更だけで完結しない可能性を前提にする。
- 設定系や送信履歴系は既存テーブル拡張との整合を確認する。
