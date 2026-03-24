# Vitals Trauma Language Update Design

**Date:** 2026-03-23

## Goal

バイタルタブ周辺で、神経所見の「麻痺」と「言語障害」を分離し、外傷を 10 件まで構造化入力できるようにする。あわせて患者サマリー上でも外傷を視認しやすいカード表示へ更新する。

## Scope

- `言語障害` を独立項目として追加
- `麻痺` から `言語障害` を分離
- `外傷1` から `外傷10` まで入力可能にする
- 外傷に部位、中項目、サイズ、出血、創傷種別、変形有無、縫合要否、写真操作を持たせる
- 患者サマリーの外傷表示を専用カードグリッドへ変更
- 電話番号、呼吸数、脈拍、血圧、SpO2 の数値入力を半角数字前提にする

## Non-Goals

- 写真保存 API や実ファイルアップロード
- 外傷以外の患者サマリーデザイン全面変更
- 旧 findings 互換レイヤーの完全撤去

## Current State

- 所見入力は `CaseFindingsV2Panel` と `CASE_FINDING_SECTIONS_V2` が主系統
- 神経所見の `言語障害` は `麻痺` の detail として内包されている
- 外傷は `external-injury` 1 件のみで、詳細も不足している
- 患者サマリーは `changedFindings` の汎用行表示のみ
- 数値欄の一部が `type="number"` のままで、iPad で全角混在挙動になりやすい

## Design

### 1. Findings definition

- `neuro.paralysis` から `languageDisturbance` を除外する
- `neuro.language-disturbance` を新設し、以下 3 detail を持たせる
  - `slurredSpeech`（呂律障害）
  - `dysarthria`（構音障害）
  - `aphasia`（失語）
- 各 detail は `＋ / － / 確認困難`

### 2. Trauma data model

- `musculoskeletal.external-injury-1` から `external-injury-10` を追加する
- 各外傷 item は以下の detail を持つ
  - `region`（大部位）
  - `site`（中項目）
  - `siteOther`（その他入力）
  - `size`
  - `bleeding`
  - `woundType`
  - `deformity`
  - `sutureRequired`
  - `photoMemo`
- 写真ボタン、確認ボタンは今回 UI 操作のみを置き、保存責務は持たせない
- 中項目は大部位に応じて切り替える

### 3. Rendering strategy

- `CaseFindingsV2Panel` に item 単位の専用レンダラーを追加する
- 外傷 item は 1 行完結のコンパクトレイアウトにする
- 一般 item は既存 generic renderer を維持する

### 4. Summary strategy

- `caseFindingsSummary` の payload は既存 `json:` 形式を維持する
- 外傷 item だけ追加 metadata を detail fields に載せる
- `PatientSummaryPanel` では `運動器` のうち外傷 item を抽出し、カードグリッド表示する
- カードは `外傷N / 写真 / 部位・創傷種別・サイズ / 出血 / 変形 / 縫合` の順で表示する

### 5. Numeric input normalization

- `type="number"` を避け、`inputMode="numeric"` or `decimal` を利用する
- onChange で全角数字を半角へ正規化してから保存する
- 対象:
  - 電話番号
  - 呼吸数
  - 脈拍数
  - 血圧
  - SpO2

## Files

- Create: `docs/plans/2026-03-23-vitals-trauma-language-implementation.md`
- Modify: `lib/caseFindingsConfig.ts`
- Modify: `lib/caseFindingsSummary.ts`
- Modify: `lib/caseFindingsNormalizer.ts`
- Modify: `lib/caseFindingsLegacyAdapter.ts`
- Modify: `components/cases/CaseFindingsV2Panel.tsx`
- Modify: `components/shared/PatientSummaryPanel.tsx`
- Modify: `components/cases/CaseFormBasicTab.tsx`
- Modify: `components/cases/CaseFormVitalsTab.tsx`
- Modify: `components/cases/CaseFormPage.tsx`
- Create: `lib/inputDigits.ts`

## Testing

- `npm run check`
- 画面確認:
  - 外傷 10 件が 10 行で収まること
  - 言語障害が麻痺から分離していること
  - 数値欄が半角で安定入力できること
  - 患者サマリーの外傷カードが過度に縮まないこと
