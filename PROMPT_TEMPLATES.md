# PROMPT_TEMPLATES.md

## Purpose

このファイルは、Codex に指示を出すときに「どの Skill を使わせるべきか」を素早く判断するための早見表です。

## First choice

迷ったらまずこれを使います。

```text
まず npm run review:changed を実行して、必要な skill を選んでから進めて。最後に npm run check まで回して。
```

## Skill selection guide

| やりたいこと | 指定する Skill | 使うときの目安 |
| --- | --- | --- |
| 要件整理、設計、移植、方式比較 | `system-design` | まだ実装に入る前、複数案がありそう、構成変更を含む |
| 画面修正、レイアウト調整、UI 挙動変更 | `frontend-ui` | `app/` や `components/` が主対象 |
| API 追加、認可付きサーバー処理、validation | `api-implementation` | `app/api/`、`lib/`、auth/repository が主対象 |
| 実装後の確認、何を検証すべきか整理 | `test-check` | lint/typecheck/build/E2E の要否を決めたい |
| 差分レビュー、バグや回帰の洗い出し | `code-review` | findings 優先でレビューしてほしい |
| 権限漏れ、秘密情報、監査観点の確認 | `security-audit` | login、role、admin API、医療情報、設定保存が絡む |
| DB 設計、保存項目追加、移行影響整理 | `db-design` | テーブル、SQL、repository、backfill が絡む |
| README や docs、設計書、移植メモ更新 | `docs-writer` | ドキュメントを残したい、運用ルールを整理したい |

## Copy-and-paste templates

### 1. どれを使うべきか判断してから進めたい

```text
まず npm run review:changed を実行して、必要な skill を選んでから進めて。最後に npm run check まで回して。
```

### 2. 実装前に設計を固めたい

```text
system-design skill を使って、この要件の実装方針を整理して。必要なら docs/plans に設計を残して。
```

### 3. 画面や UI を直したい

```text
frontend-ui skill を使って、既存 UI パターンに合わせてこの画面を修正して。最後に npm run check を実行して。
```

### 4. API や server-side の処理を追加したい

```text
api-implementation skill を使って、この API を追加して。認可、validation、呼び出し元との整合も確認して。
```

### 5. 実装後に何を確認すべきか整理したい

```text
test-check skill を使って、この変更に必要な確認項目を整理して、必要なコマンドを実行して。
```

### 6. 差分をレビューしてほしい

```text
code-review skill でこの差分をレビューして。findings を重要度順に出して。
```

### 7. セキュリティ観点で見てほしい

```text
security-audit skill でこの変更の認可漏れ、秘密情報、監査ログの抜けを確認して。
```

### 8. DB 設計から整理したい

```text
db-design skill を使って、この保存項目追加に必要なスキーマ変更と移行影響を整理して。
```

### 9. docs まで含めて整理したい

```text
docs-writer skill を使って、この作業内容を README と docs/plans に反映して。
```

## Combined examples

### UI 修正と確認までまとめて依頼

```text
frontend-ui skill を使ってこの画面を修正して。必要なら test-check skill の観点で確認項目も整理して、最後に npm run check を実行して。
```

### API 実装とセキュリティ確認をまとめて依頼

```text
api-implementation skill を使ってこの API を実装して。その後 security-audit skill の観点で認可漏れがないか確認して。
```

### 設計から docs までまとめて依頼

```text
system-design skill を使って方針を整理して、必要なら docs-writer skill の観点で docs/plans に残して。
```

## Recommended instruction style

- 何をしたいかを最初に書く
- 使ってほしい Skill 名を入れる
- 必要なら最後に実行してほしい command を書く
- 仕上げに review/check を含める

テンプレート例:

```text
[skill名] skill を使って、[やりたいこと] を進めて。最後に [確認コマンド] を実行して。
```
