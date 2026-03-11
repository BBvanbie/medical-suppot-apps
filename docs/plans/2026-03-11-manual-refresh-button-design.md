# Manual Refresh Button Design

**Date:** 2026-03-11

## Goal

A側 / HP側の一覧画面から10秒自動更新を撤回し、テーブル外右上の手動更新ボタンで status を再取得する方式へ統一する。あわせて A側の `要相談` 右に出している `未返信` 表示を削除する。

## Scope

- A側 `/cases/search` の自動更新を削除
- HP側一覧ページの自動更新を削除
- 一覧ごとに手動 `更新` ボタンを配置
- A側の `未返信` バッジを削除

## Recommendation

自動更新コンポーネントは撤去し、A側は既存 fetch を再利用、HP側は `router.refresh()` を手動実行する。画面の再取得タイミングが明示され、通信も最小化できる。

## Design

### 1. EMS case list

`app/cases/search/page.tsx` から polling 用 refs / effect を削除する。テーブルセクション右上に `更新` ボタンを置き、押下で `fetchCases(appliedQuery)` と展開中 case の `fetchCaseTargets(caseId)` を実行する。押下中は `更新中...` にする。

### 2. Hospital list pages

`AutoRefreshOnInterval` を削除し、各一覧ページヘッダ右上に `更新` ボタンを置く client component を差し込む。押下時は `router.refresh()` を実行する。対象は `requests / patients / consults / declined / medical-info`。

### 3. Reply badge

`CaseSelectionHistoryTable` の `未返信` バッジ表示を A側一覧では使わない。`CaseSearchTable.tsx` の `showReplyBadge` 指定を外す。
