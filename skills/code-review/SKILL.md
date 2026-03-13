---
name: code-review
description: 変更済みコードを、バグ、権限漏れ、回帰、テスト不足、設計不整合の観点でレビューするための skill。要約より findings を優先し、重要度順に指摘を返す必要があるときに使う。
---

# code-review

## purpose

- 変更内容の不具合リスクを短く厳密に洗い出す。

## use this skill when

- ユーザーが review を求めたとき
- PR 前の自己レビューや変更差分の品質確認をしたいとき
- 複数ファイル変更の回帰リスクを整理したいとき

## do not use this skill when

- 実装そのものがまだ存在しないとき
- 方式検討や設計提案だけを行うとき

## workflow

1. 変更差分と周辺コードを読む。
2. 重大度順に findings を抽出する。
3. 影響範囲、再現条件、欠けた検証を短く書く。
4. finding がなければその旨と残留リスクを明示する。

## output format

- Findings
- Open questions or assumptions
- Short change summary

## quality bar

- findings が具体的で再確認可能であること
- 些細な style 指摘より挙動リスクを優先していること
- ファイル単位の根拠があること

## project-specific notes

- 認可、監査、設定保存、送信履歴、ケース表示整合は重点確認対象。
- UI レビューでも状態遷移や read-only 破綻を見落とさない。
