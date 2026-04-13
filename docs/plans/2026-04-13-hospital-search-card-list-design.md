# 2026-04-13 Hospital Search Card List Design

## 目的

- EMS 病院検索結果を 1 行 table ではなく 1 病院 1 カードで比較できる UI に変更する。
- 受入一覧や事案一覧で使っている「一覧カード + 詳細情報近接」の見た目に寄せる。
- 選択操作を checkbox 依存から card tap / click へ変更し、iPad 横画面でも素早く選択できるようにする。

## 対象

- `components/hospitals/SearchResultsTab.tsx`
- `components/hospitals/HospitalSearchPage.tsx`
- `components/hospitals/TransferRequestConfirmPage.tsx`
- 病院検索導線内の送信履歴表示

## 方針

- 表形式検索結果は card list に置き換える。
- card は `first look -> compare -> act` を優先し、上段に病院名 / 状態 / 距離、下段に診療科 / 住所 / 電話 / 選択状態を置く。
- 優先度の数値は非表示にし、比較根拠は短い summary 文のみ表示する。
- 並び順は server-side score 順を維持する。
- 選択は card 全体の click で toggle し、選択中は border / background / action label で明示する。
- 病院検索ページ内の他一覧も card vocabulary に寄せ、table 混在を減らす。

## 非対象

- server-side の score 算出ロジック変更
- `/hospitals/requests` や `/cases/search` など既に card style 化された別一覧の全面刷新

## 受け入れ条件

- 検索結果が table ではなく card list で表示される。
- 数値の優先度表示が UI から消えている。
- card クリックで選択 / 解除できる。
- 病院検索導線内の送信履歴 / 送信前確認も card style へ寄る。
