# 2026-04-01 Search Score 実装メモ

## 目的

- `/hospitals/search` の表形式検索結果を server-side の優先度スコア順に統一する
- EMS が距離だけでなく、科目一致、応答実績、受入実績、滞留件数を見て選定できるようにする

## 今回の実装

1. `lib/hospitalSearchScoring.ts` を追加
   - availability
   - distance
   - responsiveness
   - conversion
   - load penalty
   を合成した `searchScore` を返す
2. `POST /api/hospitals/recent-search` を更新
   - `recent`
   - `municipality`
   の table search で `searchScore`, `scoreBreakdown`, `scoreSummary` を返す
3. `SearchResultsTab` を更新
   - client-side の距離ソートを廃止
   - API 順をそのまま表示
   - 優先度列と score 理由表示を追加
4. focused E2E を追加
   - 市区名検索で score が降順になっていること
   - score 理由が画面に表示されること

## 今回見送ったもの

- 個別病院検索カードへの score 表示
- score snapshot の送信履歴保存
- score の server-side unit test

## 確認

- `npm run check`
- `npx.cmd playwright test e2e/tests/hospital-search-score.spec.ts`

## 次

- 単位 B として `selection_stalled` / `consult_stalled` を通知と dashboard に分けて実装する
