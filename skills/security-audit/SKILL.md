---
name: security-audit
description: 認証、認可、秘密情報、入力処理、監査ログ、権限境界の観点で変更や既存実装を確認するための skill。高リスクな server-side 変更やアクセス制御の点検が必要なときに使う。
---

# security-audit

## purpose

- 権限漏れや危険な入力処理を早い段階で検出する。

## use this skill when

- login、session、role check、admin API、settings 保存、医療情報表示に触れるとき
- 秘密情報、環境変数、監査ログ、アクセス制御を確認したいとき
- ユーザーや端末、組織、病院データの保護が関わるとき

## do not use this skill when

- 静的な UI 文言修正だけを行うとき
- 設計前の抽象的な一般論だけを話すとき

## workflow

1. 認証経路と role 境界を特定する。
2. 入力、出力、権限、ログの観点で確認する。
3. 漏えい、過剰権限、監査不足、危険な前提を整理する。
4. 必要な追加確認や hardening を提案する。

## output format

- 対象範囲
- 主な懸念点
- 優先度
- 推奨対策

## quality bar

- 認証/認可の境界が具体的に説明されていること
- 重大な懸念を優先度順に扱っていること
- 既存実装の責務位置に基づいて確認していること

## project-specific notes

- `EMS`、`HOSPITAL`、`ADMIN` の越境アクセスは最優先で確認する。
- 監査ログや操作履歴が必要な処理では欠落を見逃さない。
