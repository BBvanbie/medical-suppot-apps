# Vitals Trauma Language Update Implementation Plan

**Goal:** 神経所見の分離、外傷 10 件化、外傷サマリーカード化、数値入力の半角安定化を行う。

**Architecture:** 所見 V2 定義を主軸にし、外傷のみ専用入力 renderer と専用サマリー renderer を追加する。

### Task 1: Update finding definitions

**Files:**
- Modify: `lib/caseFindingsConfig.ts`
- Modify: `lib/caseFindingsNormalizer.ts`
- Modify: `lib/caseFindingsLegacyAdapter.ts`

**Step 1: Split language disturbance from paralysis**

- `言語障害` を独立 item にする
- 3 項目の state detail を定義する

**Step 2: Expand trauma items**

- 外傷 1-10 を定義
- 大部位別の中項目とその他入力を追加

### Task 2: Build trauma-specific input UI

**Files:**
- Modify: `components/cases/CaseFindingsV2Panel.tsx`

**Step 1: Add compact trauma row renderer**

- 1 行に主要操作を収める
- 撮影 / 確認ボタンを設置する

### Task 3: Update summary rendering

**Files:**
- Modify: `lib/caseFindingsSummary.ts`
- Modify: `components/shared/PatientSummaryPanel.tsx`

**Step 1: Preserve structured trauma data in changed findings**

- サマリーで外傷カードに必要な detail を再利用できるようにする

**Step 2: Render trauma cards**

- 外傷のみカードグリッド化
- 縫合要否ラベル色を分ける

### Task 4: Normalize numeric inputs

**Files:**
- Create: `lib/inputDigits.ts`
- Modify: `components/cases/CaseFormBasicTab.tsx`
- Modify: `components/cases/CaseFormVitalsTab.tsx`
- Modify: `components/cases/CaseFormPage.tsx`

**Step 1: Add ASCII digit helpers**

- 全角数字を半角に正規化する

**Step 2: Apply to phone and vital inputs**

- `type="number"` 依存をやめる
- iPad で半角入力しやすい属性へ揃える

### Task 5: Verify

**Files:**
- Touched files above

**Step 1: Run repo checks**

Run: `npm run check`
