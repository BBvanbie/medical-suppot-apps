---
name: test-check
description: 変更内容に応じて lint、typecheck、build、focused E2E のどこまで回すべきかを判断し、結果と未検証項目を明確に返すための skill。検証の深さと報告粒度を決める primary skill として使う。
---

# test-check

## purpose

- 変更後の確認を過不足なく選び、何を確認したか、何を確認していないかを明確にする。

## use this skill when

- 実装後に確認コマンドを決めるとき
- E2E を回すべきかどうか判断するとき
- review 前に verification scope を整理するとき
- CI failure やローカル failure の切り分けを始めるとき

## do not use this skill when

- まだ何を変えるか固まっていないとき
- Playwright spec の具体的な書き方そのものが主題のとき

## routing rule

- この skill は verification decision の primary skill である。
- Playwright の実装ノウハウが必要な場合は repo-local の `e2e-testing` を併用する。
- この skill 自体は E2E authoring manual にはしない。
- `agent-browser` の具体的な操作手順を書く場ではなく、「今回の変更で browser verification を入れるべきか」を決める場とする。

## workflow

1. 変更ファイルと変更種別を確認する。
2. UI / API / DB / routing / docs のどれに触れたか分類する。
3. 最小十分なコマンドを選ぶ。
4. 実行結果、未実施項目、残るリスクを分けて報告する。

## command selection guide

- `npm run lint`
  - docs/config に近い軽微変更
- `npm run typecheck`
  - TS 影響のある変更で、まず型整合を見たいとき
- `npm run check`
  - UI / API / settings / analytics を含む通常変更の基準
- `npm run check:full`
  - build 影響、routing 影響、複数層変更、状態遷移変更を含むとき
- `npm run test:e2e`
  - 主要 user workflow、role flow、複数画面操作連鎖に触れたとき
- focused Playwright
  - workflow 全体ではなく、変更箇所に近い spec だけを狙うとき
- focused `agent-browser`
  - `localhost` が既に立っており、UI の見え方、モーダル、フォーム、状態変化を実画面で素早く確認したいとき

## minimum checks by change type

- UI 変更
  - `npm run check`
  - `localhost` が立っていれば focused `agent-browser` 確認を検討
  - tablet/desktop 幅
  - loading / empty / error / disabled / read-only
  - 文字量、崩れ、横スクロール有無
- API 変更
  - `npm run check`
  - 正常系、異常系、権限失敗、validation 失敗
  - 既存 caller との整合
- routing / page behavior 変更
  - `npm run check:full` を検討
  - 直リンク、戻る、role 制限、検索パラメータ維持
- DB / state transition 変更
  - `npm run check:full` を優先検討
  - focused E2E の要否を必ず検討
- docs / skill / rule 変更
  - 基本は lint/typecheck または `npm run check`
  - 影響が運用文書のみなら未実施項目を明示して終えてよい

## e2e decision rule

- 主要 workflow に触れたら E2E 要否を必ず書く
- 既存 spec に近い確認があるなら focused 実行を優先する
- 新規 spec が必要なら `e2e-testing` を使って設計する
- E2E を回していないときは、理由を必ず明示する

## browser verification rule

- `agent-browser` は exploratory confirmation 用であり、Playwright の代替として数えない
- UI の状態差分が主題で、`localhost` がユーザー側で既に起動しているなら、focused `agent-browser` を検討する
- browser verification を行う場合でも、重要 workflow の再現保証は Playwright 要否を別に判断する
- `agent-browser` を実施しなかった場合は、未実施として扱い、必要なら理由を書く

## minimum reporting

- 実施した確認
- 結果
- 未実施の確認
- 残るリスク
- `agent-browser` を使った場合は、開いたページ、主な操作、確認できた画面変化を短く含める

## quality bar

- 実施 / 未実施が混ざっていないこと
- 変更内容に対して verification depth が釣り合っていること
- 通していない確認を通したように書かないこと

## project-specific notes

- UI / settings / API 変更は最低でも `npm run check` を基準にする
- EMS / HOSPITAL / ADMIN / DISPATCH の role flow に触れたら focused E2E の検討を省略しない
- analytics や notification は見た目変更でも caller / data side の影響を確認する
- `agent-browser` を使うときも、`localhost` はユーザー起動前提であり、未起動なら起動依頼を返す
