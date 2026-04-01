---
name: e2e-testing
description: この repository の Playwright E2E を追加・修正するときの repo-local skill。global な Playwright 知識を土台にしつつ、この repo の role-based flow、seed、selector 方針、focused run 方針に合わせて使う。
---

# e2e-testing

## purpose

- この repository の主要 workflow を、Playwright で壊れにくく、運用に即した形で検証する。

## use this skill when

- `e2e/tests/*.spec.ts` を追加・修正するとき
- 既存 workflow に focused E2E を足すとき
- selector、seed、scope、assertion 粒度を決めるとき
- flaky test の原因を切り分けるとき

## do not use this skill when

- 単にどこまで確認するか判断したいだけのとき
- unit test や server-side test が主題のとき

## relationship to other skills

- verification scope の判断は `test-check` を primary にする
- E2E spec の具体的な組み立てはこの skill を使う

## repository structure to check first

- `e2e/global-setup.ts`
- `e2e/support/test-data.ts`
- `e2e/tests/`
- 近い workflow の既存 spec

## workflow

1. まず近い既存 spec を探す。
2. 変更対象に最も近い role flow を選ぶ。
3. selector は既存方針に合わせる。
4. assertion は fixed count より、意味のある挙動確認を優先する。
5. 最後に focused run コマンドを決める。

## selector priority

1. 既存 `data-testid`
2. role + accessible name
3. label
4. text

avoid:

- brittle な CSS selector
- DOM 階層依存
- 見た目だけに依存した locator

## assertion guidance

- 変更点の意味を直接確認する
- 既存 seed 以外の実データ混在があり得る画面では、件数完全一致を避ける
- fixed count より文言存在、状態遷移、アクセス可否、並び順、ボタン活性状態を優先する
- 認可系は 403 / 非表示 / scope 制限のどれを確認するか明確にする

## repository-specific testing patterns

### role-aware

- EMS は自隊 scope を前提に確認する
- HOSPITAL は自院 target scope を前提に確認する
- ADMIN は全体閲覧だが、一部画面は実データ混在を考慮する
- DISPATCH は専用 route の表示可否と遷移を分けて考える

### workflow-aware

- 送信履歴
  - `case_id` と `case_uid` の整合を壊さない
- 通知
  - dedupe や bucket の都合で、単純件数より対象通知の存在を優先する
- analytics
  - 実データ混在時は exact count より KPI 文言や分布の意味を確認する
- オフライン
  - reconnect、retry、conflict restore の導線を個別に見る

## flaky test guidance

- hard wait は使わない
- route transition、API response、target text のいずれかで待つ
- 既存 seed 依存が強すぎる場合は assertion を意味ベースへ寄せる
- 既存データ混在が避けられない画面では exact count を捨てる

## focused run examples

- `npx playwright test e2e/tests/cases-access.spec.ts`
- `npx playwright test e2e/tests/operational-alerts.spec.ts`
- `npx playwright test e2e/tests/hospital-flows.spec.ts --grep "..." `

## output format

- 対象 workflow
- 追加 / 修正した観点
- selector / assertion 方針
- focused run コマンド

## project-specific notes

- まず既存 spec を真似て、この repo の style から外れないことを優先する
- EMS / HOSPITAL / ADMIN の scope 漏れは最優先で検出対象にする
- exact count assertion が不安定になる画面では、意味が伝わる assertion に置き換える
