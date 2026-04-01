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

## finding priority

- Critical: 権限漏れ、データ破壊、越境アクセス、重大回帰
- High: 状態遷移不整合、主要フロー破綻、保存/表示不整合
- Medium: エッジケース不足、empty/read-only/disabled 状態抜け、重大な UX 混乱
- Low: 文言、軽微な整理、非本質的なリファクタ候補

## minimum review checklist

- 単一ファイルで完結すると決めつけず、対応する server/client の関連ファイルを確認したか
- 型、schema、validation、UI 表示の整合が崩れていないか
- loading、empty、error、read-only、disabled 状態が考慮されているか
- success だけでなく failure 時の挙動があるか
- 権限や ownership 条件が server 側にあるか
- 文言や状態ラベルが UI と API で一致しているか
- 更新系なら見た目と実データの整合が崩れていないか
- docs、tests、related queries の追従漏れがないか

## project-specific notes

- 認可、監査、設定保存、送信履歴、ケース表示整合は重点確認対象。
- UI レビューでも状態遷移や read-only 破綻を見落とさない。
- `case_id` / `case_uid` の混在、role helper の bypass、notification / analytics caller の追従漏れを重点確認する。
- 日本語 UI 文言変更では文字化けや placeholder 残りも確認対象に含める。
