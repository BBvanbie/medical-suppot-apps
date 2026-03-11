# Case Edit UI Tuning Design

**Date:** 2026-03-11

## Goal

事案編集ページの基本情報タブと送信履歴タブで発生している局所的な崩れを直し、iPad 基準表示での可読性を改善する。

## Scope

- 基本情報タブの `覚知時間` と `指令先住所` input 左端の被りを解消する
- input 内部余白、label と input の縦位置、必要なら iOS 系 input の見た目差を吸収する
- 送信履歴タブの `病院` / `ステータス` 列を広げる
- コメント列を狭め、表全体の文字サイズと余白を少し詰める
- 既存の配色、カード、バッジ、操作列構造は維持する

## Non-Goals

- 事案編集ページ全体の再設計はしない
- 送信履歴の操作導線やステータスロジックは変更しない
- A側全画面のタイポグラフィを再調整しない

## Current State

- `CaseFormPage.tsx` の `ems-grid-aware` 行では、日付・時間・住所の3入力を同じグリッドに乗せている
- `覚知時間` と `指令先住所` は iPad 幅で左端が窮屈になり、内部 padding と見た目が他フォームと揃っていない
- `CaseSendHistoryTable.tsx` は `min-w-[980px] table-fixed` だが、列幅定義がなく、病院名とステータスが相対的に狭い
- コメント列が幅を取りすぎて、病院列とステータス列の可読性を圧迫している

## Approach Options

### Option 1: Local layout tuning + fixed column plan

基本情報の3入力行だけを局所修正し、送信履歴は `table-fixed + colgroup` で幅配分を明示する。

- 利点: 影響範囲が最小
- 利点: 既存デザインとコンポーネント構造を維持しやすい
- 利点: iPad 基準で再発しにくい
- 欠点: 送信履歴の柔軟性は `table-auto` より低い

### Option 2: Auto layout table

送信履歴を `table-auto` にして内容ベースで列幅を決める。

- 利点: 実装は軽い
- 欠点: 行内容で揺れやすく、iPad 幅で再び崩れやすい

### Option 3: Global page density reduction

事案編集ページ全体のタイポグラフィと余白をさらに下げる。

- 利点: 全体が一度に詰まる
- 欠点: 今回の修正対象を超えて波及する

## Recommendation

Option 1 を採用する。局所修正に留めつつ、送信履歴だけは列幅設計を持たせる。これが最も安全で、既存の A側 iPad 最適化方針とも整合する。

## Design

### 1. Basic tab input row

対象は `CaseFormPage.tsx` の `ems-grid-aware` ブロックのみ。`label` を `flex flex-col` ベースに揃え、ラベルと input の距離を固定する。`覚知時間` と `指令先住所` は `pl-3` と `min-w-0` を明示し、必要なら `appearance-none` や `text-left` を補って左端の食い込みを防ぐ。入力高さは既存の `ems-control` を維持し、他フォーム部品と同じ丸み・ボーダー・文字サイズに揃える。

### 2. Send history table layout

`CaseSendHistoryTable.tsx` は `table-fixed` を維持し、`colgroup` を追加して列幅を固定する。優先配分は次の通り。

- 送信日時: 標準幅
- 病院: 拡大
- ステータス: 拡大
- 選定科目: 標準幅
- 病院コメント: 縮小
- A側コメント: 縮小
- 操作: 維持

コメント列は `break-words` と少し詰めた行高で可読性を保つ。病院列は2行折り返しでも読みやすい幅にし、ステータス列は `RequestStatusBadge` が潰れない最低幅を持たせる。テーブル文字サイズは全体的に一段小さくし、セル上下余白も少し削る。

### 3. Validation

- 1180x820 基準で、`覚知時間` と `指令先住所` の左端が欠けず、他 input と高さ・内側余白が揃う
- 送信履歴で長めの病院名が読める幅を持つ
- ステータスバッジが潰れない
- コメント列は狭くなるが読み切れる
- 配色、カード、操作ボタン構造は変わらない

## Files

- Modify: `components/cases/CaseFormPage.tsx`
- Modify: `components/cases/CaseSendHistoryTable.tsx`

## Testing

- `npx.cmd tsc --noEmit`
- `npm.cmd run lint`
- 可能なら `npm.cmd run build`
- 目視確認: A側事案編集ページの基本情報タブ / 送信履歴タブ
