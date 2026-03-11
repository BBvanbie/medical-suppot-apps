# EMS Case List Status and Layout Refinement Design

**Date:** 2026-03-11

## Goal

A側の覚知情報入力サイズをさらに整えつつ、事案一覧では親行ステータスを業務意味に合わせて再表示し、横スクロールなしで見やすい列構成へ戻す。

## Scope

- `覚知日付` input を少し狭くし、`覚知時間` と同寸法に揃える
- 事案一覧親行ステータスを `選定前 / 選定中 / 搬送先決定` で再算出する
- `指令先住所` は市/区までは含める方針を反映する
- 事案一覧テーブルを横スクロールなしで親幅に収める
- chevron 展開ボタンを削除し、行タップ展開に戻す

## Non-Goals

- 要請詳細や展開子行の構造変更はしない
- 送信先履歴のロジック自体は変えない
- 住所入力に複雑な自動補完は入れない

## Current State

- `ems-grid-aware` は前回の調整で日付・時間の幅を近づけたが、まだ日付が広く見える
- 事案一覧親行ステータスは既存の `incidentStatus` をそのまま表示している
- 一覧は前回 chevron 列を追加したため、横幅に余裕がなくなっている
- 展開は行タップと chevron の二重導線になっている

## Approach Options

### Option 1: Display-only status remap + fixed-width table rebalance

親行ステータスは一覧表示用に再計算し、テーブルは chevron を外して列幅を再配分する。

- 利点: 要件に最も素直
- 利点: 既存データ構造を壊さない
- 利点: 横スクロール解消と行タップ展開を両立しやすい

### Option 2: Persisted incident status migration

保存値自体を `選定前 / 選定中 / 搬送先決定` に寄せる。

- 利点: 表示と保存の意味が一致する
- 欠点: 今回の修正範囲を超える

### Option 3: Pure CSS-only table compression

ステータス算出は変えず、幅だけ詰める。

- 利点: 変更が軽い
- 欠点: ステータス要件を満たせない

## Recommendation

Option 1 を採用する。親行ステータスは一覧表示責務として再算出し、テーブルは現状の固定幅設計の中で再配分するのが最も安全で分かりやすい。

## Design

### 1. Aware input sizing

`app/globals.css` の `ems-grid-aware` をさらに詰める。`覚知日付` を今より狭くし、`覚知時間` と同じ幅レンジへ寄せる。`CaseFormPage.tsx` の input class は現状維持で、サイズ差はグリッド側で吸収する。

### 2. Parent row status mapping

`app/cases/search/page.tsx` で rows を表示用へ整形する段階に、親行ステータスの再算出を追加する。ルールは以下。

- 送信先のどれかが `TRANSPORT_DECIDED` → `搬送先決定`
- それ以外で `requestTargetCount > 0` → `選定中`
- `requestTargetCount === 0` → `選定前`

必要なら targets 展開後のキャッシュ更新時も同じ関数を使う。

### 3. Dispatch address guidance

`指令先住所` には市/区までを含める前提で、placeholder か補助文言で `三鷹市 / 世田谷区` のような粒度を明示する。入力値の保存形式までは変えず、まずは入力 guidance に留める。

### 4. Case list table layout

`CaseSearchTable.tsx` は chevron 列を削除し、以下の列に戻す。

- 事案ID
- 覚知日時
- 氏名
- 年齢
- ステータス
- 搬送先
- 詳細

`table-fixed w-full` のまま各列幅を再配分し、横スクロールなしで親 div に収める。展開は行タップのみ。`詳細` は `stopPropagation()` で遷移専用のまま維持する。行 hover と cursor で「行をタップすれば展開します」を補強する。

## Files

- Modify: `app/globals.css`
- Modify: `app/cases/search/page.tsx`
- Modify: `components/cases/CaseFormPage.tsx` (placeholder / helper only if needed)
- Modify: `components/cases/CaseSearchTable.tsx`

## Testing

- `npx.cmd tsc --noEmit`
- `npm.cmd run lint`
- `npm.cmd run build`
- 目視確認: 事案編集ページ / 事案一覧ページ
