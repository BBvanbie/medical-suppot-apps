# 訓練 / デモモード設計

最終更新: 2026-04-06

## 結論

- 訓練モードは「システム全体切替」ではなく、`case` 起点の `mode=LIVE | TRAINING` と、ユーザー単位の `currentMode` を組み合わせて実現する。
- 初期段階では `currentMode` を設定画面から切り替え、表示・通知・集計の混入を防ぐ基盤を優先する。
- `TRAINING mode` ユーザーだけが training 事案を作成でき、一覧や通知は `TRAINING only` で表示する。

## 前提と制約

- 同一 DB に LIVE / TRAINING が共存してもよいが、UI / 通知 / analytics では混入させない。
- role ごとの権限分離は既存の `EMS / HOSPITAL / ADMIN / DISPATCH` を維持する。
- UI は既存 [UI_RULES.md](/C:/practice/medical-support-apps/docs/UI_RULES.md) と shared pattern を前提にする。
- 本番 analytics への TRAINING 混入は許容しない。初期段階で training 専用 analytics は作らない。
- `ADMIN` は LIVE / TRAINING を同時表示しない。設定から切替可能にする。

## 方式比較

### 1. システム全体モード切替

- 長所: 実装は単純
- 短所: 誤切替時の影響が大きい。LIVE と TRAINING を並行運用できない
- 判断: 不採用

### 2. 組織単位モード切替

- 長所: 専用訓練隊 / 専用訓練病院には使いやすい
- 短所: 同一組織内で LIVE / TRAINING を併走できず、通知や一覧の境界が複雑
- 判断: 主設計としては不採用

### 3. 事案ごとの mode + ユーザー currentMode

- 長所: 柔軟性が高く、混在と混入を分けて制御できる
- 短所: filter の実装漏れがあると混入リスクがある
- 判断: 採用

## 推奨設計

### データ

- `users.current_mode`
  - `LIVE | TRAINING`
  - デフォルトは `LIVE`
- `cases.mode`
  - `LIVE | TRAINING`
- 派生データも親 case の mode を引き継ぐ
  - `hospital_requests`
  - `notifications`
  - `hospital_patients`

### 表示

- `LIVE mode` ユーザーは `LIVE only`
- `TRAINING mode` ユーザーは `TRAINING only`
- TRAINING 中は次を表示する
  - 常設上部バナー
  - header / shell の mode badge
  - 一覧 / 詳細 / status 付近の training badge

### 作成と通知

- `TRAINING mode` ユーザーだけが training 事案を作成可能
- 初期作成者は `DISPATCH / ADMIN / EMS`
- 通知は `TRAINING mode` かつ対象案件 scope の関係者にのみ送る

### analytics

- TRAINING データは本番 analytics / KPI / dashboard から完全除外
- training analytics は後続テーマ

### リセット

- training データ一括リセットは `ADMIN` のみ

## 非目標

- training 専用 analytics
- LIVE / TRAINING 同時表示監視画面
- モード別の別 DB / 別 schema
- デモ専用第三モード `DEMO`

## 影響ファイル / 検証方針

- 影響候補
  - `lib/authContext.ts`
  - `users` schema / setup SQL
  - settings API / settings page
  - role shell / badge / banner
  - case / notification / analytics の mode filter
- 初期検証
  - mode 保存と再取得
  - `TRAINING mode` の切替 UI
  - shell / settings 上の mode 表示
  - `npm run check`
