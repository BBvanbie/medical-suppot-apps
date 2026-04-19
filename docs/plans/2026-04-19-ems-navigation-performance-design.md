# EMS navigation performance design

## 背景

- EMS の主要導線である `ホーム -> 事案一覧`、`一覧展開`、`詳細オープン` の体感待ちが長く、現場操作のテンポを崩していた。
- 2026-04-19 時点の focused benchmark では、managed `next dev` 条件でおおむね `2.8s / 3.8s / 3.4s` 台だった。

## 制約

- EMS は tablet landscape 前提で、一覧表示の first look を崩さない。
- 役割境界、mode 境界、既存の offline draft 復元を壊さない。
- DB / API / UI をまたぐが、広い refactor は避ける。

## 方針

1. 計測は Playwright の focused benchmark を正本とし、`/paramedics -> /cases/search`、`case-expand`、`case-detail-open` を区間分解する。
2. 一覧表示は route prefetch と非重要 fetch の後ろ倒しで初動を短くする。
3. 一覧展開は `caseUid` 既知時の query を軽くし、上位案件の送信履歴を background prewarm して展開待ちを減らす。
4. 詳細オープンは route prefetch を早め、case detail read path の無駄な lookup を減らし、初回表示に不要な tab bundle を遅延読込へ逃がす。

## 非目標

- 送信履歴 API の全面 redesign
- EMS case detail form の全面分割
- production build 条件での最終 SLA 固定

## 影響ファイル

- `components/cases/CaseSearchPageContent.tsx`
- `components/home/Sidebar.tsx`
- `app/api/cases/search/route.ts`
- `app/api/cases/search/[caseId]/route.ts`
- `app/cases/[caseId]/page.tsx`
- `lib/caseSelectionHistory.ts`
- `components/cases/CaseFormPage.tsx`
- `e2e/tests/navigation-perf.spec.ts`

## 検証方針

- `npm run check`
- `npx.cmd playwright test e2e/tests/navigation-perf.spec.ts`
- before / after は EMS の3区間を並べて比較する
