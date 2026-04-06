# Analytics Page Composition Design

## 結論

- analytics page 群は `header -> range tabs -> filter -> summary -> section grid` の page composition を shared 化する。
- role 固有差は `header` と `summary` slot に残し、共通化は page-level order と spacing に限定する。

## 前提と制約

- `app/admin/stats/page.tsx`、`app/hospitals/stats/page.tsx`、`app/paramedics/stats/page.tsx` は構成順がほぼ同じ。
- ただし header は `AnalyticsHeader` と `EmsPageHeader` が混在し、summary も `DashboardKpiGrid` と `EmsMetricStrip` で異なる。
- role ごとの visual language は維持したいので、hero や summary の中身まで共通化しない。

## 方式比較

### 1. 現状維持

- 利点:
  - 追加実装なし
- 欠点:
  - stats 画面追加時に page composition の順序と spacing が散らばる
  - `tabs -> filter -> summary -> grid` の標準順を code で表現できない

### 2. page-level layout だけ共通化する

- 利点:
  - role 差を残しつつ、analytics page の構成順を固定できる
  - props が過剰に膨らまない
  - 既存 `AnalyticsHeader` / `AnalyticsFilterBar` / `DashboardKpiGrid` / `EmsMetricStrip` をそのまま使える
- 欠点:
  - visual を統一する component ではないため、見た目の差は残る

### 3. header / filter / summary まで一体化する

- 利点:
  - 見た目はさらに揃う
- 欠点:
  - role 固有差を props で吸う必要があり、万能 component 化しやすい
  - EMS の `EmsPageHeader` と admin/hospital の analytics header が自然に揃わない

## 推奨設計

- 方式 2 を採用する。
- `components/analytics/AnalyticsPageLayout.tsx` を追加し、`header`、`tabs`、`filters`、`summary`、`children` を slot で受ける。
- `Admin / Hospital / EMS` stats 3画面をこの layout に載せ替える。

## 非目標

- stats page hero を 1 component に統一すること
- KPI summary の中身を統一すること
- role 固有の CTA や copy を共通 props 化すること

## 検証

- `npm run check`
