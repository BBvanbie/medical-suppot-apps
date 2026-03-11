# EMS iPad Aware Input and Municipality Label Design

**Date:** 2026-03-11

## Goal

iPad で崩れている覚知日付 / 覚知時間 input の重なりを解消し、事案一覧の親行では独立した市区名列を追加して、指令先住所から抽出した市区名を表示する。

## Scope

- A側事案編集ページの覚知日付 / 覚知時間 input を iPad でも安定表示にする
- 2つの input の高さ、padding、文字サイズを同一に揃える
- 事案一覧 API で `address` から市区名を抽出して返す
- 事案一覧の親行に幅の狭い `市区名` 列を追加する

## Non-Goals

- 住所の正規化やジオコーディングは入れない
- 指令先住所の保存形式は変えない
- 事案一覧の検索条件や展開ロジックは変えない

## Current State

- `ems-grid-aware` は前回の調整で幅を詰めているが、iPad の `input[type=date]` と `input[type=time]` のネイティブ UI 差分までは吸収できていない
- 事案一覧 API は `address` を返しているが、市区名だけを独立して返していない
- 親行の氏名まわりには市区名の独立列がない

## Approach Options

### Option 1: CSS specialization + API-side municipality extraction

`date/time` だけ専用 class を持たせ、Safari 系の内部余白差を CSS で吸収する。市区名は API 側 helper で抽出して独立列へ表示する。

- 利点: iPad 崩れを局所修正できる
- 利点: 市区名ロジックを一覧データの責務として一元化できる
- 利点: 既存の一覧構造をほぼ維持できる

### Option 2: Grid-only width tuning + client-side municipality extraction

幅だけさらに調整し、市区名はテーブル側で `address` から切り出す。

- 利点: 実装は軽い
- 欠点: iPad Safari のネイティブ input 差分に弱い
- 欠点: 市区名ロジックが他画面と共有しづらい

### Option 3: Custom date/time UI replacement

ネイティブ `date/time` をやめて、独自 UI か text input に置き換える。

- 利点: 見た目を完全制御できる
- 欠点: 今回の不具合に対して過剰
- 欠点: 入力 UX と保守コストが悪化する

## Recommendation

Option 1 を採用する。崩れは iPad Safari の `date/time` 差分が主因なので、入力種別専用 CSS で吸収するのが最も安全で影響が小さい。市区名は API 側で抽出した方が表示責務が明確になる。

## Design

### 1. iPad aware inputs

`app/globals.css` に `ems-aware-input` を追加し、`padding-inline`、`line-height`、`min-width: 0`、`box-sizing` を明示する。`::-webkit-date-and-time-value` と `::-webkit-calendar-picker-indicator` も対象にして、iPad Safari の内部レイアウト差で文字やアイコンが隣列へ食い込まないようにする。`CaseFormPage.tsx` の覚知日付 / 覚知時間 input に同じ class を適用する。

### 2. Municipality extraction

`app/api/cases/search/route.ts` に小さな helper を追加し、`address` から `○○市`、`○○区`、必要なら `○○町` / `○○村` までを先頭から抽出する。抽出に失敗した場合は空文字を返す。これを `rows` の `municipality` として返す。

### 3. Case list rendering

`CaseSearchTableRow` に `municipality` を追加する。`CaseSearchTable.tsx` では幅の狭い `市区名` 列を新設し、氏名列とは独立して表示する。既存の展開や詳細導線は変更しない。

## Validation

- iPad 幅で覚知日付と覚知時間が重ならない
- date/time の高さと text サイズが揃う
- 事案一覧の親行で市区名が独立列に出る
- 住所が長くても API がエラーにならない
