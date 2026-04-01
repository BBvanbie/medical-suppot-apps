# Phase 2 運用改善設計

作成日: 2026-04-01

## 結論

Phase 2 は次の 3 本に分けて進める。

1. 検索順位スコアリング
2. 未対応長時間放置アラート
3. 運用監視指標の固定

推奨順は `検索順位スコアリング -> 放置アラート -> 監視指標反映` とする。
理由は、検索品質改善が EMS の主要操作に直結し、放置アラートと監視指標はその結果を追える形に後置した方が実装と検証を小さく切れるためである。

## 前提と制約

- 現行システムは `hospital_requests` / `hospital_request_targets` / `hospital_request_events` を保持しており、通知運用項目と dashboard analytics の基盤は既にある
- 通知は `GET /api/notifications` 時の materialize で生成しており、scheduler / cron / worker は未導入
- 検索 UI は EMS 側の `/hospitals/search` にあり、検索結果の計算根拠を UI だけでなく server-side でも安定させる必要がある
- 新しい依存追加や外部基盤は避け、既存の Next.js App Router + PostgreSQL + `pg` の範囲で完結させる
- role ごとの運用責務は維持する
  - EMS: 送信先選定と再送判断
  - HOSPITAL: 受信確認と応答
  - ADMIN: 全体監視

## 方式比較

### 案1. 検索・通知・監視をそれぞれ個別に都度実装する

- 長所
  - 着手は速い
  - 各画面単位で閉じやすい
- 短所
  - 指標定義が route / page / UI に分散しやすい
  - 同じ「滞留」「難渋」の定義が画面ごとにずれやすい
  - 後で Admin 監視へ寄せるときに差分調整が増える

### 案2. score / alert / metric の定義を先に共通化してから画面へ接続する

- 長所
  - EMS / HOSPITAL / ADMIN で定義を共有しやすい
  - E2E と analytics の検証観点を揃えやすい
  - 機能追加より先に運用言語を固定できる
- 短所
  - 初回設計の文量は増える
  - 1 回で UI 効果が見えにくい

## 推奨設計

案2を採用する。

### 1. 検索順位スコアリング

`/hospitals/search` の結果順は、単純な条件一致順ではなく `search score` を明示的に持たせる。

#### 1-1. score の目的

- EMS が first look で上位候補を比較しやすくする
- 受入可能性と応答期待を混ぜず、再送しやすい順を安定して出す
- 同一条件で結果順がぶれにくいように tie-break を固定する

#### 1-2. score の構成

初期フェーズでは重み付き加算で十分とする。機械学習や複雑な正規化は行わない。

- `availabilityScore`
  - 科目一致
  - 受入可否情報の有無
  - 診療科 availability の最新状態
- `distanceScore`
  - 近距離を優先
  - 極端に遠い候補を下げる
- `responsivenessScore`
  - 直近 30 日の `sent_at -> responded_at` 平均または中央値
  - 応答実績がない病院は中立値
- `conversionScore`
  - `ACCEPTABLE` 率、相談後 `ACCEPTABLE` 到達率
  - 件数が少ない病院は過大評価しないため、最低母数未満は中立値
- `loadPenalty`
  - `UNREAD` / `READ` / `NEGOTIATING` の滞留 target が多い病院には軽い減点

#### 1-3. 初期重み

- availability: 45
- distance: 25
- responsiveness: 15
- conversion: 10
- load penalty: -15 上限

重みは設定 UI を作らず定数管理にし、Phase 2 の初回実装ではコード内定義でよい。

#### 1-4. tie-break

同点時は以下順に固定する。

1. availability が高い
2. 距離が近い
3. 直近 30 日の返信中央値が短い
4. hospital `display_order`
5. hospital `id`

#### 1-5. 実装位置

- `lib/` に search score 用の server-side module を追加する
- 検索 API は score と score breakdown を返す
- UI では上位候補の説明用に breakdown を 2-3 項目まで表示する

### 2. 未対応長時間放置アラート

既存の `request_repeat` / `reply_delay` は病院側の未確認・未応答に寄っている。
Phase 2 では EMS / ADMIN が運用上見たい「長時間決まらない事案」を追加する。

#### 2-1. 新規 alert の対象

- `selection_stalled`
  - audience: `EMS`, `ADMIN`
  - 条件:
    - case に少なくとも 1 件 `hospital_request_targets` がある
    - `TRANSPORT_DECIDED` なし
    - 最終送信または最終病院応答から一定時間以上進展なし
- `consult_stalled`
  - audience: `EMS`, `HOSPITAL`, `ADMIN`
  - 条件:
    - target status が `NEGOTIATING`
    - 最新相談イベントから一定時間以上更新なし

#### 2-2. 初期閾値

- `selection_stalled`
  - warning: 15 分
  - critical: 30 分
- `consult_stalled`
  - warning: 10 分
  - critical: 20 分

#### 2-3. 通知先

- EMS: 担当 team scope
- HOSPITAL: 対象 hospital scope
- ADMIN: Phase 2 では通知テーブルへは載せず dashboard alert にまず集約する

#### 2-4. 実装方針

- 既存と同様に `notifications.ts` で materialize する
- ただし ADMIN は `notifications` ではなく `dashboardAnalytics.ts` の alert で先行提供する
- dedupe は既存 bucket 方式を踏襲する

### 3. 運用監視指標

現在の dashboard 指標は可視化されているが、「運用で何を見るか」の定義が docs に固定されていない。
Phase 2 では指標を次の 2 系統に分けて固定する。

#### 3-1. 画面指標

利用者が日次で画面上確認する指標。

- EMS
  - 覚知から初回照会まで平均 / 中央値
  - 送信から搬送決定まで平均 / 中央値
  - 再送率
  - 相談移行率
  - score 上位採用率
- HOSPITAL
  - 受信から既読まで平均 / 中央値
  - 既読から返信まで平均 / 中央値
  - 相談後受入率
  - 科別依頼件数
  - backlog 件数
- ADMIN
  - 全体搬送決定率
  - 難渋事案件数
  - 未対応滞留件数
  - 病院別平均返信時間
  - 地域別搬送決定時間

#### 3-2. 運用指標

改善・監視のために運用会議や保守で見る指標。

- search ranking
  - 上位 3 件に対する採用率
  - 上位候補未採用率
  - score breakdown 別の偏り
- response ops
  - `request_repeat` 発生件数
  - `reply_delay` 発生件数
  - `selection_stalled` / `consult_stalled` 発生件数
- workflow quality
  - 同一 case の再送回数分布
  - 病院別 `NEGOTIATING -> ACCEPTABLE` 到達率
  - 終端化までの平均 target 数

#### 3-3. 観測地点

- source of truth は DB 集計
- 画面表示は `dashboardAnalytics.ts`
- 監視用 raw query は implementation 時に `lib/analytics` 配下へ分ける余地を残す
- 初回 Phase 2 では別テーブル追加は行わず、既存履歴から再計算する

## 実装単位

### 単位A. Search score 基盤

- 検索 API に score / breakdown を追加
- EMS UI に score 理由を表示
- 選定時に score snapshot を送信履歴へ残す

### 単位B. 長時間放置アラート

- `notifications.ts` に `selection_stalled` / `consult_stalled` の生成を追加
- Admin dashboard alerts に同一定義を反映

### 単位C. 監視指標整理

- `dashboardAnalytics.ts` の KPI を定義済みセットへ整理
- docs に画面指標 / 運用指標を反映

## 非目標

- 外部 scheduler / queue 導入
- ML ベース ranking
- リアルタイム push 通知
- 指標エクスポートや BI 連携
- 管理者向け通知 bell の新設

## 影響ファイル

- `lib/dashboardAnalytics.ts`
- `lib/notifications.ts`
- 検索 API / 検索 UI 関連 route と component
- `docs/workstreams/phase2.md`
- `docs/current-work.md`
- 統合仕様書の Phase 2 追記箇所

## 検証方針

- docs 作成時点
  - 設計の優先順と対象ファイルが `current-work` と workstream に反映されていること
- 実装時
  - `npm run check`
  - 検索順位の server-side test または focused E2E
  - 放置アラートの通知 dedupe / bucket 検証
  - dashboard の空データ / 少量データ表示確認
