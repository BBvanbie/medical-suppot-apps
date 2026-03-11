# Route Polling Refresh Design

**Date:** 2026-03-11

## Goal

A側とHP側の主要一覧画面で、画面遷移や手動再読み込みなしでも status が10秒ごとに反映されるようにする。

## Scope

- A側 `/cases/search` に10秒ポーリングを追加
- HP側 `/hospitals/requests`, `/hospitals/patients`, `/hospitals/consults`, `/hospitals/declined`, `/hospitals/medical-info` に10秒更新を追加
- 既存の送信後即時更新は維持する
- 更新中の重複 refresh を防ぐ

## Non-Goals

- WebSocket / SSE の導入
- 詳細ページ単位のリアルタイム同期
- 通知配信方式の変更

## Approach Options

### Option 1: 10-second polling + immediate refresh after actions

A側は既存 fetch を再利用し、HP側は `router.refresh()` で server component データを更新する。

- 利点: 最小差分で導入できる
- 利点: 現在の App Router 構成に合う
- 利点: 送信系の即時更新とも競合しにくい

### Option 2: Shell-level global polling

ポータル shell に共通 timer を置いて全画面で refresh する。

- 利点: まとめて実装しやすい
- 欠点: 関係ない画面でも通信が走る

### Option 3: SSE / WebSocket push

更新イベントだけ push して受信側で再取得する。

- 利点: 即時性が高い
- 欠点: 今回の修正範囲としては重い

## Recommendation

Option 1 を採用する。現在の構成に最も自然で、一覧画面だけに限定した更新制御を入れられる。

## Design

### 1. EMS case list polling

`app/cases/search/page.tsx` に10秒 interval を追加し、既存の `fetchCases()` を再実行する。展開中の case は `fetchCaseTargets()` も再実行し、親行 status と子行 status の両方を更新する。既存の通知ポーリングは15秒のまま維持する。

### 2. Hospital page polling

`components/shared/AutoRefreshOnInterval.tsx` を新規追加し、`router.refresh()` を指定間隔で実行する。`startTransition` と in-flight ref で重複 refresh を抑える。これを各 HP 一覧ページに差し込む。

### 3. Medical info page synchronization

`HospitalMedicalInfoPage.tsx` は `initialItems` から state を作っているため、`router.refresh()` の再描画結果を state に反映する `useEffect` を追加する。保存中カードがある間はそのカードの optimistic state を優先し、それ以外は新 props へ同期する。

## Validation

- A側事案一覧が10秒以内に status 反映される
- HP側各一覧で10秒以内に status 反映される
- 送信直後の即時更新が壊れない
- interval の多重登録が起きない
