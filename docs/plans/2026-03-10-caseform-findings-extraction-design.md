# CaseForm Findings Extraction Design

**Date:** 2026-03-10

**Goal:** `CaseFormPage` に残る所見レンダラ群を別ファイルへ抽出し、保守性を高めつつ既存挙動を維持する。

## Current Problem

- `CaseFormPage` には `renderNeuroMiddleBody`, `renderCardioMiddleBody`, `renderDigestiveMiddleBody`, `renderTraumaMiddleBody` が残っている。
- 画面ロジックより JSX 量のほうが支配的で、変更時に差分が読みづらい。
- 一方で症候ごとの差分は大きく、過剰な設定駆動化は可読性を落とす可能性がある。

## Constraints

- 既存 UI と state 遷移は変えない。
- source of truth は `CaseFormPage` に残す。
- props は平坦に大量列挙せず、`findingState` と `findingActions` のように grouped object で受ける。
- DSL 化やメタデータ主導の大抽象化は行わない。

## Options

### 1. Recommended: Extract renderers into dedicated module

- `CaseFindingBodies.tsx` に `plusMinus` と 4 系統の renderers を移す。
- state と setter は object にまとめて渡す。
- `CaseFormPage` は orchestration に集中できる。

### 2. Small primitive only

- `plusMinus` や `label/input/select` の小部品だけ切り出す。
- 安全だが、`CaseFormPage` の肥大化はあまり改善しない。

### 3. Full config-driven schema

- 症候定義を JSON 的設定で表現する。
- DRY にはなるが、医療 UI の細かい差分が読みづらくなる。

## Approved Design

- `components/cases/CaseFindingBodies.tsx` を追加する。
- `plusMinus` と `renderNeuroMiddleBody` / `renderCardioMiddleBody` / `renderDigestiveMiddleBody` / `renderTraumaMiddleBody` をこのファイルへ移す。
- props は `findingState` と `findingActions` にまとめ、必要な option 配列も `findingOptions` としてまとめる。
- `CaseFormPage` では `renderFindingBody` を `CaseFindingBodies` の exported functions で組み立てる。

## Verification

- `npm.cmd run lint`
- `npm.cmd run build`
