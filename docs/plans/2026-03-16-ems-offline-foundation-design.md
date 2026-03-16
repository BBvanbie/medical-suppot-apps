# EMS Offline Foundation Design

**Date:** 2026-03-16

## Goal

EMS 側で、通信不安定時やオフライン時でも事案入力と検索参照を継続しつつ、送信系操作は安全に未送信キューへ退避できる最小オフライン基盤を追加する。

## Scope

- 対象ロールは `EMS` のみ
- 対象ページ
  - `/cases/new`
  - `/cases/[caseId]`
  - `/hospitals/search`
  - `/settings`
  - `/settings/notifications`
  - `/settings/display`
  - `/settings/input`
  - `/settings/sync`
  - 新規 `/settings/offline-queue`
- IndexedDB ベースのローカル保存
- 共通オフライン状態管理
- 共通オフラインバナー
- 事案下書きのローカル保存
- 病院検索キャッシュと簡易検索
- 受入要請送信の未送信キュー化
- 相談返信の未送信キュー化
- オンライン復帰通知
- 競合検知
- 搬送決定 / 搬送辞退のオフライン無効化

## Non-Goals

- `HOSPITAL` / `ADMIN` のオフライン対応
- 完全 PWA 化
- background sync の本格実装
- 全画面の完全キャッシュ
- 送信系の自動再送
- 競合解決 UI の完全自動マージ

## Constraints

- 送信系はオンライン復帰後も自動送信しない
- `搬送決定` / `搬送辞退` はオフライン時に許可しない
- `localStorage` は主保存先にしない
- 競合時は自動上書きしない
- 既存 API を再利用し、オフライン専用 API は増やしすぎない
- 将来の PWA 拡張に備えて、オフライン責務は `lib/offline/` 配下へ集約する

## Approach

### Option 1: IndexedDB 中心のクライアント同期レイヤーを追加

`lib/offline/` にオフライン状態管理、IndexedDB ストア、同期キュー、競合判定、ローカル設定保存を集約する。各画面は既存 API 呼び出し直前でこのレイヤーを経由する。

- 利点: 今回の要件に最も適合する
- 利点: 将来 PWA / background sync へ広げやすい
- 利点: 既存 API と UI を大きく壊さない
- 欠点: 画面ごとの送信導線に差し込みが必要

### Option 2: 画面単位で個別に IndexedDB を直接扱う

`CaseFormPage`、`HospitalSearchPage`、`ConsultChatModal` などがそれぞれ直接 IndexedDB を読む。

- 利点: 初期着手は速い
- 欠点: 保存形式と競合判定が分散する
- 欠点: 将来の PWA 化で再整理が必要

### Option 3: サービスワーカー先行

PWA とキャッシュ戦略を先に入れ、送信も SW 主導に寄せる。

- 利点: 将来像には近い
- 欠点: 今回の「安全な限定オフライン」に対して過剰
- 欠点: 送信系の明示再送と相性が悪い

## Recommendation

Option 1 を採用する。  
理由は、このリポジトリでは既存 UI と既存 API がすでに存在しており、今回必要なのは「送信可否の制御」「未送信の可視化」「手動再送」「競合停止」であるため。オフライン責務を `lib/offline/` に寄せると、`casesClient`、設定フォーム、病院検索、相談モーダルの既存構造を保ったまま差し込める。

## Design

### 1. ローカル ID 方針

オフライン新規事案はサーバー `caseId` を使わず、`offline-*` 形式の `localCaseId` を払い出す。

- 例: `offline-20260316-ab12cd`
- IndexedDB 上では `localCaseId` を主参照キーにする
- サーバー作成成功後に `serverCaseId` を紐付ける
- 関連キュー項目は `localCaseId` から `serverCaseId` へ解決する

これにより、未送信事案とサーバー登録済み事案を混同せずに扱える。

### 2. ローカル保存レイヤー

`IndexedDB` を主保存先とし、保存責務を `lib/offline/` に切り出す。

想定モジュール:

- `lib/offline/offlineTypes.ts`
- `lib/offline/offlineDb.ts`
- `lib/offline/offlineStore.ts`
- `lib/offline/offlineSync.ts`
- `lib/offline/offlineStatus.ts`
- `lib/offline/offlineConflict.ts`

ストア構成:

- `caseDrafts`
  - `localCaseId`
  - `serverCaseId?`
  - `payload`
  - `syncStatus`
  - `lastKnownServerUpdatedAt?`
  - `updatedAt`
- `offlineQueue`
  - 共通キュー構造
- `hospitalCache`
  - 病院マスタ簡易検索用
- `searchState`
  - 検索条件と直近結果
- `emsSettings`
  - 通知 / 表示 / 入力補助のローカル保存
- `syncMeta`
  - オフライン状態、最終同期時刻、通知既読状態

### 3. キュー共通構造

送信系は type を持つ共通構造に統一する。

```ts
type OfflineQueueItemType =
  | "case_update"
  | "hospital_request_send"
  | "consult_reply"
  | "settings_sync";

type OfflineQueueItemStatus =
  | "pending"
  | "ready_to_send"
  | "sending"
  | "conflict"
  | "failed";

type OfflineQueueItem = {
  id: string;
  type: OfflineQueueItemType;
  localCaseId?: string;
  serverCaseId?: string;
  targetId?: string;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
  status: OfflineQueueItemStatus;
  errorMessage?: string | null;
  baseServerUpdatedAt?: string | null;
};
```

用途別補足:

- `case_update`
  - 下書き同期対象
  - 自動同期可
- `hospital_request_send`
  - 明示送信のみ
  - 選択病院、科目、送信時点の case snapshot を保持
- `consult_reply`
  - 明示送信のみ
  - `targetId`、コメント本文、送信基準時刻を保持
- `settings_sync`
  - 自動同期可

### 4. オフライン状態管理

オフライン判定は単一の client store で扱う。

判定材料:

- `navigator.onLine`
- 既存 API 呼び出し失敗の連続回数
- 明示的な同期不能状態

状態:

- `online`
- `offline`
- `degraded`
- `reconnected`

これを React hook で各 UI に配る。

### 5. 共通バナー

EMS 共通レイアウトに `OfflineStatusBanner` を追加する。

要件:

- 上部固定または header 直下で共通表示
- 表示内容
  - オフライン状態
  - 未送信件数
  - キュー画面リンク
- 文言
  - `オフライン中です。一部操作は未送信キューに保存されます。`
- オンライン復帰時
  - 未送信があれば `未送信キューがあります。内容を確認してください。`

### 6. 事案入力

対象: `/cases/new`, `/cases/[caseId]`

方針:

- 入力途中データは IndexedDB に継続保存
- 既存 `sessionStorage` ベースの case context は廃止または補助用途へ縮小
- 保存ボタンはオンライン時は既存 API、オフライン時はローカル保存へ切替
- 既存事案のオフライン更新は `case_update` キューへ積む
- ローカル下書きには `lastKnownServerUpdatedAt` を保持する

画面要件:

- ローカル保存済みであることを短く表示
- オフライン時でも `病院選定へ` へ進める
- ただしその後の送信はキュー化される

### 7. 病院検索

対象: `/hospitals/search`

方針:

- オンライン時に検索結果や病院マスタを IndexedDB へキャッシュ
- オフライン時はローカルキャッシュから簡易検索
- 完全検索と同一精度は保証しない

画面要件:

- 注意文言
  - `オフライン中のため、病院情報は最新ではない可能性があります。`
- 検索条件はローカル保存
- 検索履歴 / 直近結果はオフラインでも閲覧可

### 8. 受入要請送信

対象: 病院検索結果からの送信確認/完了導線

方針:

- オンライン時は既存 API を利用
- オフライン時は UI 操作のみ許可し、送信は `hospital_request_send` としてキューへ積む
- 自動再送しない

保持する payload:

- 送信対象病院一覧
- 選択科目
- case snapshot
- `localCaseId` / `serverCaseId`
- キュー作成時点の `updatedAt`

### 9. 相談チャット返信

対象: `ConsultChatModal`

方針:

- オンライン時は既存 `PATCH /api/cases/consults/[targetId]`
- オフライン時は `consult_reply` キューへ積む
- メッセージ表示では未送信状態を明確化する

表示状態:

- `未送信`
- `送信待ち`
- `競合`
- `送信失敗`

視覚表現:

- 通常送信済み吹き出しと色調を分ける
- バッジを付ける

### 10. 搬送決定 / 搬送辞退

対象: `CaseFormPage`, `CaseSearchPage`, 相談チャット上の判断導線

方針:

- オフライン時は `disabled`
- 文言を明示
  - `この操作はオンライン時のみ実行できます`
- キュー化しない

### 11. EMS 設定

対象:

- `/settings/notifications`
- `/settings/display`
- `/settings/input`

方針:

- IndexedDB にローカル保存
- オンライン時は既存 API に保存
- オフライン時はローカルに即保存し、`settings_sync` を積む
- 復帰後は自動同期可
- 競合時は同期停止し、キューまたは同期画面に表示

`/settings/sync` は現行 DB ベース表示に加えて、ローカル未送信件数とオフライン状態を表示する。

### 12. 未送信キュー画面

新規ページ: `/settings/offline-queue`

表示項目:

- 種別
- 対象事案
- 作成時刻
- 状態
- エラー
- 競合有無
- 操作
  - 送信
  - 再試行
  - 破棄
  - 詳細確認

導線:

- オフラインバナーからリンク
- `/settings/sync` からリンク

### 13. 競合検知

基本方針:

- `updated_at` または同等の比較値を基準にする
- 復帰後送信前にサーバー最新を取得して比較
- 差異があれば `conflict`
- 自動上書きしない

競合対象:

- 既存事案更新
- 既存事案に紐づく送信系操作
- 設定同期

競合表示:

- キュー一覧に `競合あり`
- 詳細確認導線
- 自動送信停止

### 14. 既存構造への差し込み点

- `components/cases/CaseFormPage.tsx`
  - 下書き保存
  - 送信可否制御
- `components/hospitals/HospitalSearchPage.tsx`
  - case context の IndexedDB 化
  - ローカル病院検索
  - 送信キュー化
- `components/shared/ConsultChatModal.tsx`
  - 未送信メッセージ表現
- `lib/casesClient.ts`
  - 既存 API 呼び出しのラップ
- `app/settings/sync/page.tsx`
  - ローカル同期サマリー追加
- EMS 共通 shell / sidebar
  - バナーと導線追加

## Validation

- `npm run check`
- `npm run check:full`
- `npm run test:e2e`

重点確認:

- オフライン中の事案入力継続
- オフライン中の病院簡易検索
- 受入要請のキュー化
- 相談返信のキュー化
- 未送信表現
- オンライン復帰通知
- オフライン時の搬送決定 / 辞退無効化
- 競合停止

## Risks

- 既存 `sessionStorage` ベース導線との二重管理
- 文字化けを含む既存ファイルに触れる際の UTF-8 崩れ
- IndexedDB 初期化失敗時のフォールバック設計
- 既存 API に `updated_at` 比較値が不足する場合の追加実装範囲

## Completion Status


### Completed in current implementation

- IndexedDB-based offline foundation
- EMS common offline banner
- /settings/offline-queue page
- consult reply queueing
- hospital offline search
- hospital request queueing
- EMS settings local save and reconnect sync
- case draft auto-save / restore (initial)
- case_update queueing and reconnect auto-sync (initial)
- offline-* to canonical caseId resolution (initial)
- transport decision / decline disabled offline

### Pending

- detailed conflict detection on queue items
- stronger server updated_at comparison for case_update
- conflict stop/detail flow for manual resend
- conflict resolution UI
- E2E coverage
