# Route Loading Coverage Design

**Date:** 2026-03-14

## Goal

`app/` 配下で `loading.tsx` が未配置の主要ルートにローディング UI を追加し、画面遷移時に空白時間が出ないようにする。

## Scope

- `app/loading.tsx` を追加
- `app/cases/loading.tsx` を追加
- `app/cases/new/loading.tsx` を追加
- `app/login/loading.tsx` を追加
- 既存の共有スケルトンを優先利用する

## Recommendation

ページごとの個別追加ではなく、親セグメントで共通化できる箇所は共通化する。今回不足しているのは `app/`, `app/cases`, `app/cases/new`, `app/login` のみで、既存の `DashboardPageSkeleton` / `ListPageSkeleton` / `DetailPageSkeleton` を割り当てれば十分に整合が取れる。

## Design

### 1. Root route

`app/page.tsx` は EMS ホームダッシュボードのエントリなので、`app/loading.tsx` では既存の `DashboardPageSkeleton` を表示する。

### 2. Cases segment

`app/cases/page.tsx` は `search/page.tsx` の再エクスポートで一覧画面として振る舞うため、`app/cases/loading.tsx` を親セグメントに置いて `ListPageSkeleton` を共通表示する。`app/cases/search/loading.tsx` は既存のまま維持し、直接遷移時も同系統の表示に揃える。

### 3. New case page

`app/cases/new/page.tsx` は入力フォーム主体のため、`app/cases/new/loading.tsx` では `DetailPageSkeleton` を使い、チャット領域なしの詳細・フォーム寄りスケルトンを表示する。

### 4. Login page

`app/login/page.tsx` は単独カードレイアウトなので、`app/login/loading.tsx` ではログインカード形状に近い専用スケルトンを置く。用途が単一のため共有コンポーネント化は行わない。

### 5. Verification

UI 追加のみなので、まず `npm run check` を実行して lint/typecheck を確認する。
