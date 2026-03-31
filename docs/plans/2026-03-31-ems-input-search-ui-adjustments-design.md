# EMS入力・検索UI修正 Design

**Date:** 2026-03-31

## Goal

EMS 事案入力で、数字入力と年齢算出を安定化し、病院検索結果の視認性と通信状態表示の信頼性を改善する。あわせて、概要/バイタルに事案種別を追加し、外傷ラベルと UI 方針を現場向けに揃える。

## Scope

- 西暦生年月日入力から年齢が即時に出るようにする
- 生年月日、体重、関係者TEL の全角数字を半角へ正規化する
- EMS の病院検索結果一覧の列幅を再配分し、横スクロール依存を減らす
- `通信が不安定です` バナーの誤表示を減らす
- 外傷ラベル `出血` を `出血等` に変更する
- 概要/バイタルに事案種別選択を追加する
- border 過多を避ける UI 方針を docs / repo-local skill に反映する

## Non-Goals

- 病院検索 API や検索条件ロジックそのものの変更
- オフライン同期仕様の全面刷新
- Patient summary 全面リデザイン

## Design

### 1. Birth date and numeric normalization

- 西暦生年月日は `YYYY-MM-DD` 完成済み文字列だけでなく、年/月/日 parts からも日付を組み立てる
- 月日が 1 桁でも年齢算出できるようにし、実際に存在しない日付は空扱いに戻す
- 数字入力は `extractAsciiDigits` / `normalizeAsciiNumberText` を使って全角数字を半角へ寄せる
- 体重は小数第 1 位まで許可する

### 2. Incident type

- `summary.incidentType` として保存する
- 選択肢は `[急病, 交通事故, 一般負傷, 加害, 自損行為, 労働災害, 運動競技, 火災, 水難事故, 自然災害, 転院搬送, その他]`
- `その他` でも追加テキスト欄は出さない
- 患者サマリー系にも反映する

### 3. Search results table

- 列幅を `colgroup` で固定し、病院名・科目・住所は折り返し前提にする
- `min-w` を抑え、通常の iPad/PC 幅で横スクロールしなくても主要列が見える配分にする

### 4. Offline banner reliability

- 自動同期対象は `pending` のみ再送する
- 既に `failed` / `conflict` の item を毎回再試行して `degraded` 扱いになる流れを止める
- 再送対象が存在しないオンライン時は `success` 扱いとして劣化表示を解除する

### 5. UI rule update

- 内側の区切りは `bg-slate-50` や subtle ring を優先する
- 1 画面で border の入れ子が増えすぎる状態を避ける

## Files

- Modify: `components/cases/CaseFormPage.tsx`
- Modify: `components/cases/CaseFormBasicTab.tsx`
- Modify: `components/cases/CaseFormVitalsTab.tsx`
- Modify: `components/cases/CaseFindingsV2Panel.tsx`
- Modify: `components/hospitals/SearchResultsTab.tsx`
- Modify: `components/shared/PatientSummaryPanel.tsx`
- Modify: `components/cases/CaseFormSummaryData.ts`
- Modify: `lib/caseFindingsConfig.ts`
- Modify: `lib/casePatientSummary.ts`
- Modify: `lib/offline/offlineSync.ts`
- Modify: `docs/UI_RULES.md`
- Modify: `skills/frontend-ui/SKILL.md`

## Verification

- `npm run check`
- 可能なら EMS 事案入力画面で西暦 1 桁月日 / 全角数字 / 体重 / 関係者TEL を確認
- 病院検索結果の table 幅を iPad 相当で目視確認
- オフラインキューに `failed` item が残っていても通常時に `通信が不安定です` が常時出ないことを確認
