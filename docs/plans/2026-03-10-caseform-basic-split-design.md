# CaseForm Basic Split Design

**Date:** 2026-03-10

**Goal:** `CaseFormPage` の `基本情報` タブを安全に分割し、入力 UI の責務を page 本体から切り離す。

## Current Problem

- `CaseFormPage` では `summary`, `history`, `vitals` の分離が進んだが、`basic` タブはまだ page に大きく残っている。
- `氏名/性別/生年月日`, `関係者`, `既往歴・かかりつけ` が 1 ファイルに密集しており、読み替えコストが高い。
- 状態管理や保存処理は既に安定しているため、今回は UI 抽出だけに限定するのが適切。

## Constraints

- 挙動変更は避ける。
- state と save/send logic は `CaseFormPage` に残す。
- `PastHistoryRow` や既存 helper はそのまま再利用する。
- `.env.local` は触らない。

## Options

### 1. Recommended: Single basic tab component

- `CaseFormBasicTab.tsx` に `基本情報`, `関係者`, `既往歴・かかりつけ` をまとめて移す。
- props は増えるが、導入コストと安全性のバランスがよい。

### 2. Three-section split

- `patient info`, `related people`, `past history` に分ける。
- より細かいが、props の分配が煩雑になる。

### 3. Hook + form schema refactor

- state と form updates を hook 化する。
- 将来案としては有効だが、今回は範囲が広い。

## Approved Design

- `components/cases/CaseFormBasicTab.tsx` を追加する。
- `CaseFormPage` は `basic` 表示を新 component に委譲する。
- 既存の `PastHistoryRow` は page 内に残さず、新 component から受け取って利用する。
- 文言は既存を維持し、不自然な見出しだけを揃える。

## Verification

- `npm.cmd run lint`
- `npm.cmd run build`
