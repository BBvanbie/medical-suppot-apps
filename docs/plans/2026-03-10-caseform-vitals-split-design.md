# CaseForm Vitals Split Design

**Date:** 2026-03-10

**Goal:** `CaseFormPage` の `要請概要・バイタル` タブを安全に分割し、表示責務を整理したうえで既存挙動を維持する。

## Current Problem

- `components/cases/CaseFormPage.tsx` に `basic` と `vitals` の大きな JSX が集中している。
- 既に `summary` と `history` は外出し済みだが、`vitals` タブは入力 UI と所見アコーディオンが混在しており、読みづらい。
- ロジック自体は安定しているため、ここで state や保存処理まで再設計する必要はない。

## Constraints

- 挙動変更は避ける。
- state は `CaseFormPage` に残す。
- server/client の境界は増やさず、既存の client component 構成を維持する。
- `.env.local` は触らない。

## Options

### 1. Recommended: Vitals tab only

- `要請概要`, `本人の主訴`, `基本バイタル`, `所見` を専用 component に分離する。
- props は多くなるが、保存処理や send logic に触れずに整理できる。
- 今回の安全整理に最も合う。

### 2. Basic + Vitals split

- `basic` 側も同時に外出しする。
- 効果は大きいが、props の爆発とレビュー負荷が増える。

### 3. Hook + sections refactor

- state と derived value を hook に寄せて page を薄くする。
- 将来案としては有効だが、今回は範囲が広すぎる。

## Approved Design

- `components/cases/CaseFormVitalsTab.tsx` を追加する。
- さらに `components/cases/CaseVitalInputs.tsx` と `components/cases/CaseFindingsAccordion.tsx` に分け、`rendering-hoist-jsx` に沿って長い静的 JSX を page から離す。
- `CaseFormPage` は `state`, `derived values`, `event handlers`, `save/send` を保持する。
- `CaseFormVitalsTab` には表示に必要な値と setter/event handlers を props で渡す。
- 文言は既存を基本維持し、不自然な見出しだけ揃える。

## Verification

- `npm.cmd run lint`
- `npm.cmd run build`
