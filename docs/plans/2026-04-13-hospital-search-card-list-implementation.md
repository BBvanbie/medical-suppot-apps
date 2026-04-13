# 2026-04-13 Hospital Search Card List Implementation

## 実装単位

1. 検索結果の table を card list へ置換する
2. card click 選択へ変更する
3. 病院検索導線内の関連一覧を同じ card vocabulary に寄せる
4. E2E と local check を更新する

## 実装メモ

- score 数値は非表示にするが、並び順回帰確認用に `data-search-score` は残してよい。
- card の選択状態は checkbox を hidden 化せず、button / `aria-pressed` で明示する。
- 表示情報は病院名、病院ID、距離、科目、住所、電話、summary を基本とする。
- 送信履歴と送信前確認も table より card list を優先する。

## 確認

- `npm run check`
- `npx.cmd playwright test e2e/tests/hospital-search-score.spec.ts`
