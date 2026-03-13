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

## project-specific notes

- このリポジトリは `pg` と手動 SQL/script 運用があるため、コード変更だけで完結しない可能性を前提にする。
- 設定系や送信履歴系は既存テーブル拡張との整合を確認する。
