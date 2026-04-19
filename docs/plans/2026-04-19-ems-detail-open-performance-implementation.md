# EMS detail open performance implementation

## 実施方針

1. EMS detail-open baseline を focused benchmark で取り、改善前の実測を固定する。
2. `CaseFormPage` から `summary` 派生計算を切り出し、summary tab open 時だけ読み込むよう変更する。
3. `history / consult / decision` 一式を独立 component へ分離し、dynamic import で遅延読込する。
4. 詳細ページに first-look marker を追加し、benchmark の待ち条件をその marker に寄せる。
5. focused benchmark を再実行し、改善幅を確認する。
6. `docs/current-work.md` に結果と残論点を反映する。

## 期待する効果

- 初回表示 bundle から送信履歴系 UI と相談モーダル群を外し、detail-open の初動を縮める。
- summary tab を開いていない時点では `buildCaseSummaryData()` を実行しない。
- benchmark の待ち条件を `meaningful first look` に固定し、ばらつきを減らす。

## 実施結果

1. `components/cases/CaseFormSummaryPane.tsx` を追加し、summary tab の派生計算を dynamic import 側へ移した。
2. `components/cases/CaseFormHistoryPane.tsx` を追加し、送信履歴 refresh、相談チャット、搬送判断ダイアログ、関連 API import を dynamic import 側へ切り出した。
3. `components/cases/CaseFormPage.tsx` は初回 tab に不要な import と state を外し、header に `data-testid="ems-case-detail-first-look"` を追加した。
4. `e2e/tests/navigation-perf.spec.ts` は EMS detail-open の待ち条件を body text ではなく first-look marker に更新した。

## 計測結果

### baseline

- `ems:paramedics->cases-search`: `2735.9ms`
- `ems:case-expand`: `3859.9ms`
- `ems:case-detail-open`: `3137.2ms`

### after batch 1

- `ems:paramedics->cases-search`: `1098.8ms`
- `ems:case-expand`: `2871.3ms`
- `ems:case-detail-open`: `2573.9ms`

### full navigation re-check

- `ems:paramedics->cases-search`: `4016.0ms`
- `ems:case-expand`: `3413.8ms`
- `ems:case-detail-open`: `3547.2ms`

## 所見

- focused 単体実行では detail-open は約 `563ms`、case-expand は約 `989ms` 改善した。
- full navigation re-check では managed `next dev` の冷えた再コンパイルぶれが残るため、focused benchmark を主比較軸として扱う。
- 残る主論点は `CaseFormBasicTab` 自体の巨大入力面と、詳細 route の初回 dev compile ぶれである。

## 実施確認

- `npm run check`
- `npx.cmd playwright test e2e/tests/navigation-perf.spec.ts --grep "EMS navigation stays responsive"`
- `npx.cmd playwright test e2e/tests/navigation-perf.spec.ts`
- `$env:NODE_OPTIONS='--max-old-space-size=4096'; npm run check:full`
