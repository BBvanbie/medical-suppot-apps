# EMS Case List Button Cleanup Design

**Date:** 2026-03-16

## Goal

EMS 事案一覧の操作導線を整理し、重複して見える更新導線と行高さを不必要に押し上げる詳細ボタンを改善する。

## Scope

- `app/cases/search/page.tsx` のヘッダー導線整理
- `components/cases/CaseSearchTable.tsx` の詳細ボタン調整
- 視認性と操作性の改善

## Non-Goals

- 事案検索 API の変更
- テーブル列構成の大幅な見直し
- EMS 以外の一覧 UI 改修

## Current State

- 一覧画面のヘッダー付近に更新導線が重複して見える
- 詳細ボタンが縦積みレイアウトで、行高を過剰に広げている
- 行クリックとの関係が分かりづらい

## Approach Options

### Option 1: Minimal local cleanup

対象ページと対象ボタンだけを局所的に修正する。

- 利点: 変更範囲が小さい
- 利点: 既存 UI への影響を抑えやすい
- 欠点: 他画面への横展開は別途必要

### Option 2: Shared action button refactor

一覧系ボタンを共通化して横断で見直す。

- 利点: 今後の統一には有利
- 欠点: 今回の課題に対してはスコープが広い

## Recommendation

今回は Option 1 を採用する。目的は EMS 一覧画面の視認性改善であり、共通化まで広げる必要はない。

## Design

### 1. Header action cleanup

`app/cases/search/page.tsx` のヘッダー周辺を見直し、主導線となる更新操作を 1 つに整理する。

### 2. Detail button sizing

`components/cases/CaseSearchTable.tsx` の詳細ボタンは横並びのコンパクトなボタンへ変更する。

- `flex-col` をやめる
- `h-14 w-10` のような縦長サイズを縮小する
- 行高をテーブルとして自然な高さへ戻す

## Files

- Modify: `app/cases/search/page.tsx`
- Modify: `components/cases/CaseSearchTable.tsx`

## Testing

- `npm run lint`
- 手動確認: EMS 一覧画面で更新導線が 1 つに見えること
- 手動確認: 詳細ボタン変更後も行クリックや遷移が崩れないこと
