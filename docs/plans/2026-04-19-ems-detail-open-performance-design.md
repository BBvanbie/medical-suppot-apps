# EMS detail open performance design

## 結論

- EMS detail-open の次バッチは、`/cases/[caseId]` 初回表示で不要な client bundle と派生計算を後ろへ逃がし、first look を server 側で先に返す方針で進める。

## 前提と制約

- EMS は tablet landscape 前提で、`first look -> compare -> act` を崩さない。
- `CaseFormPage` は編集フォーム、送信履歴、相談モーダル、搬送判断ダイアログを 1 つの client component に抱えている。
- route prefetch と一覧側の prewarm は既に入っており、残る主論点は detail page 初回 bundle / hydration / render cost である。
- offline draft、role 境界、送信履歴保存の既存挙動は維持する。

## 方式比較

### 案1. `CaseFormPage` の中だけを軽くする

- summary 計算の `useMemo` 化や一部 conditional render だけで対応する。
- 変更は小さいが、history/consult/decision 群の chunk は依然として初回 bundle に残りやすい。

### 案2. `summary` と `history` を親から切り出して lazy load する

- `CaseFormPage` から非初期タブの派生計算とモーダル群を分離し、初回表示では `basic` に必要なロジックだけを読む。
- bundle と render の両方に効く。
- 送信履歴を autosave payload に残す都合上、親に最小 state は残す必要がある。

### 案3. 詳細ページ全体を server shell + client workspace に分ける

- `app/cases/[caseId]/page.tsx` 側で first-look summary を先に返し、client form は下段 workspace として読む。
- 体感改善は大きいが、今回 1 バッチでやるには責務分解がやや広い。

## 推奨設計

- 今回は `案2 + 案3 の薄い版` を採る。
1. `CaseFormSummary` の派生計算を dynamic import 先へ移し、`summary` タブが開くまで `buildCaseSummaryData()` を走らせない。
2. `CaseFormHistory` を独立 component に分離し、送信履歴 refresh、相談チャット、搬送判断ダイアログ、関連 API import を dynamic import 側へ逃がす。
3. `app/cases/[caseId]/page.tsx` には EMS detail の first-look marker を server 側で出し、focused benchmark の待ち条件を `meaningful first look` に寄せる。
4. `navigation-perf.spec.ts` は EMS detail-open の待ち条件を first-look marker ベースへ更新し、計測軸を安定化する。

## 非目標

- `CaseFormPage` 全体の全面分割
- EMS 詳細フォームの visual redesign
- 送信履歴 API / 相談 API の設計変更

## 影響ファイル / 検証方針

- `app/cases/[caseId]/page.tsx`
- `components/cases/CaseFormPage.tsx`
- `components/cases/CaseFormSummary*.tsx`
- `components/cases/CaseFormHistory*.tsx`
- `e2e/tests/navigation-perf.spec.ts`
- `docs/current-work.md`

検証:

- `npm run check`
- `npx.cmd playwright test e2e/tests/navigation-perf.spec.ts --grep "EMS navigation stays responsive"`
- 必要なら最後に `npm run check:full`
