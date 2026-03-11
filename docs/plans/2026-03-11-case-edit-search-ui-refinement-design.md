# Case Edit and Search Table UI Refinement Design

**Date:** 2026-03-11

## Goal

A側の事案編集ページでは覚知日付・覚知時間の見た目を統一し、事案一覧ページでは列優先順位と展開導線を整理して視認性と操作性を上げる。

## Scope

- `CaseFormPage.tsx` の覚知情報エリアで `覚知日付` と `覚知時間` の寸法を揃える
- `CaseSearchTable.tsx` から `住所` と `性別` を外す
- `ステータス` 列を広げる
- 右端に chevron 展開アイコンを追加する
- 行クリックと chevron クリックの両方で展開できるようにする
- `詳細` ボタンは遷移専用として残す

## Non-Goals

- 一覧の展開中コンテンツ自体は変えない
- 事案詳細ページや要請詳細の導線は変えない
- A側一覧の色やバッジコンポーネント構造は変えない

## Current State

- `CaseFormPage.tsx` の覚知情報は 3 カラムで表示しているが、date/time の見た目がまだ完全には揃っていない
- `CaseSearchTable.tsx` は `住所` と `性別` を含む 9 列構成で、右端は `詳細` ボタンのみ
- 行クリックで展開はできるが、展開操作の視覚的な取っかかりが弱い
- `ステータス` 列がやや窮屈で、優先度に対して幅配分が弱い

## Approach Options

### Option 1: Minimal column rebalance + explicit expand affordance

不要列を削り、ステータス列を広げ、右端に chevron を追加する。行クリックと chevron の両方で展開できるようにする。

- 利点: 目的に対して最小差分
- 利点: 既存の table 構造と展開ロジックを活かせる
- 利点: `詳細` と展開の責務を分離できる

### Option 2: Action-only expansion

展開は chevron のみ、行クリックでは展開しない。

- 利点: 誤操作は減る
- 欠点: 今回の要件に合わない

### Option 3: Card-style mobile adaptation

一覧全体をカード寄りに崩して、展開と詳細を再配置する。

- 利点: 自由度は高い
- 欠点: 今回の修正範囲を超える

## Recommendation

Option 1 を採用する。既存の一覧構造を保ちながら、情報優先順位と操作 affordance だけを整理するのが最も安全で効果が高い。

## Design

### 1. Case edit aware info sizing

`CaseFormPage.tsx` の `覚知日付` と `覚知時間` に共通の入力寸法を与える。日付だけわずかに横幅を狭め、時間と同じ高さ・padding・font-size に統一する。住所入力は横に広く保ち、3入力の中でサイズのばらつきが出ないよう wrapper と input class を合わせる。

### 2. Case list column restructuring

`CaseSearchTable.tsx` の列は以下に整理する。

- 事案ID
- 覚知日時
- 氏名
- 年齢
- ステータス
- 搬送先
- 詳細
- 展開 chevron

これにより `住所` と `性別` を削除し、空いた幅を `ステータス` に優先配分する。`氏名` は必要に応じて少し縮める。全体のテーブル幅は大きく変えず、既存の `table-fixed` を維持する。

### 3. Expand interaction

- 行クリック: 展開/折りたたみ
- chevron クリック: 展開/折りたたみ
- `詳細` ボタン: 遷移のみ、`stopPropagation()` で展開しない
- chevron は展開中に回転させる

`ChevronDownIcon` のような既存 Heroicon を使う。色味は既存の slate 系に寄せる。

### 4. Validation

- 覚知日付と覚知時間の高さ・padding・文字サイズが揃う
- 一覧から住所/性別が消えても情報密度が落ちすぎない
- ステータスバッジの視認性が上がる
- 行クリック / chevron クリック / 詳細ボタンの役割が衝突しない

## Files

- Modify: `components/cases/CaseFormPage.tsx`
- Modify: `components/cases/CaseSearchTable.tsx`

## Testing

- `npx.cmd tsc --noEmit`
- `npm.cmd run lint`
- 必要なら `npm.cmd run build`
- 目視確認: A側事案編集ページ / 事案一覧ページ
