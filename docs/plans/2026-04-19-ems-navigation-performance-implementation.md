# EMS navigation performance implementation

## 実施内容

1. benchmark を EMS 導線の比較基準として利用し、`ホーム -> 事案一覧`、`一覧展開`、`詳細オープン` の区間を固定した。
2. `Sidebar` で EMS の主要 route を idle prefetch するようにした。
3. `CaseSearchPageContent` は初回一覧取得直後に detail route prefetch と上位案件の送信履歴 prewarm を開始するよう変更した。
4. `CaseSearchPageContent` の初回通知 fetch は一覧表示後へ後ろ倒しし、一覧初動と競合しにくくした。
5. `app/api/cases/search/route.ts` は schema check と auth 解決を並列化した。
6. `app/api/cases/search/[caseId]/route.ts` と `lib/caseSelectionHistory.ts` は、`caseUid` と team scope が既に分かっている経路で `cases` 再 join を避ける read path を追加した。
7. `app/cases/[caseId]/page.tsx` は detail row 再取得を `case_uid` 直指定へ寄せた。
8. `CaseFormPage` は `summary` / `vitals` / `history` の非初期 tab を dynamic import 化し、初回表示 bundle を軽くした。

## 計測結果

### baseline

- `ems:paramedics->cases-search`: 約 `2847.4ms`
- `ems:case-expand`: 約 `3846.5ms`
- `ems:case-detail-open`: 約 `3408.0ms`

### after batch 2

- `ems:paramedics->cases-search`: 約 `762.3ms`
- `ems:case-expand`: 約 `2796.2ms`
- `ems:case-detail-open`: 約 `3236.9ms`

## 所見

- 最大改善は一覧遷移で、route prefetch と初回 fetch 競合の緩和が支配的だった。
- 一覧展開も background prewarm と query 軽量化で約 1 秒改善した。
- 詳細オープンは改善幅が小さく、残る支配要因は `CaseFormPage` 本体の巨大 client component と初回 hydration コストの可能性が高い。

## 次に見る候補

1. `CaseFormPage` 本体の責務分割
2. detail page の server/client boundary 再整理
3. send history / consult modal 群の追加遅延読込

## 実施確認

- `npm run check`
- `npx.cmd playwright test e2e/tests/navigation-perf.spec.ts`
