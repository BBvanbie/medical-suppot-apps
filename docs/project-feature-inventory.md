# プロジェクト機能一覧

最終更新: 2026-04-06

この文書は、現在の `medical-support-apps` に実装済みの機能を、役割別・テーマ別に俯瞰するための入口とする。  
詳細仕様は [system-spec-2026-03-29.md](/C:/practice/medical-support-apps/docs/system-spec-2026-03-29.md)、進行中タスクは [current-work.md](/C:/practice/medical-support-apps/docs/current-work.md) を参照する。

## 1. 対応ロール

- EMS
  - 事案作成
  - 事案一覧
  - 病院検索
  - 送信履歴確認
  - 要相談返信
  - 搬送決定 / 搬送辞退
  - 統計
  - 設定
- HOSPITAL
  - 受入要請一覧
  - 要相談一覧
  - 搬送患者一覧
  - 辞退案件確認
  - 診療情報管理
  - 統計
  - 設定
- ADMIN
  - 管理ホーム
  - 統計
  - ユーザー管理
  - 端末管理
  - 組織管理
  - 病院管理
  - 救急隊管理
  - 事案一覧
  - 監査ログ
- DISPATCH
  - 指令一覧
  - 事案起票

## 2. EMS 機能

### 2-1. 事案入力

- 基本情報入力
  - 事案ID
  - 覚知日時
  - 患者情報
  - 現場住所
  - 主訴
  - メモ
- バイタル入力
  - 複数回記録
  - 瞳孔、意識、ECG、SpO2、体温など
- 所見入力
  - 症候別の structured findings
  - 外傷入力
  - 状態変化サマリー反映
- 患者サマリー確認
  - 基本情報
  - 関係者
  - 既往歴
  - 主訴
  - 要請内容
  - 最新バイタル
  - バイタル履歴
  - 変更所見
  - 特記事項

### 2-2. 事案一覧 / 送信履歴

- 自隊事案のみ表示
- 一覧から詳細遷移
- 行展開で送信先履歴表示
- 病院ごとの現在状態表示
- 要相談チャット起動
- 搬送決定 / 搬送辞退
- 決定済み搬送先の排他制御

### 2-3. 病院検索 / 送信

- 病院検索
- score 順表示
- score 理由表示
- 診療科選択
- 複数病院送信
- search mode 管理
- 送信履歴保存

### 2-4. オフライン対応

- オフラインバナー
- オフラインキュー一覧
- 未送信要請の再送
- retry all
- discard
- failure reason 分類
- conflict restore notice
- server 優先破棄
- offline 中の搬送決定 / 搬送辞退抑止

### 2-5. EMS 設定 / 統計

- 入力設定
- 通知設定
- 表示設定
- 同期設定
- EMS ダッシュボード
  - 平均時間 KPI
  - 補助指標
  - incident mix
  - transport result
- EMS 統計ページ

## 3. HOSPITAL 機能

### 3-1. 受入要請対応

- 受入要請一覧
- 既読
- 要相談
- 受入可能
- 受入不可
- 受入不可理由入力
- 詳細 modal / detail panel
- 患者サマリー表示
- 選定履歴表示

### 3-2. 相談 / コメント

- 要相談一覧
- 相談チャット
- EMS コメント受信
- 病院コメント送信
- consult stalled 通知対象化

### 3-3. 患者 / 診療情報

- 搬送患者一覧
- 科修正
- 病院診療情報表示
- transfer request confirm / completed フロー

### 3-4. HOSPITAL 設定 / 統計

- 施設設定
- 運用設定
- 通知設定
- 表示設定
- dashboard 設定
- HOSPITAL ホーム
  - backlog watch
  - KPI summary
  - priority cases
  - route rail
- HOSPITAL 統計ページ

## 4. ADMIN 機能

### 4-1. 管理ホーム / 統計

- 管理ホーム
  - priority watch
  - KPI summary
  - intervention targets
  - route rail
  - system load
  - top teams
  - hospital response
  - regional decision
- ADMIN 統計ページ

### 4-2. マスタ / 組織管理

- ユーザー管理
- 端末管理
- 組織管理
- 病院管理
- 救急隊管理
- 各 editor / create form
- 監査履歴表示

### 4-3. 事案管理

- 全事案一覧
- filter
- 一覧 + 詳細 split workbench
- 患者サマリー表示
- 選定履歴表示
- 履歴展開

### 4-4. 監査 / 運用確認

- 監査ログ一覧
- 状態変更追跡
- stalled alert 可視化

## 5. DISPATCH 機能

- 指令一覧
- 指令起票
- dispatch 起票案件の EMS 側反映
- role shell / loading / page header 対応

## 6. 共通基盤機能

### 6-1. 認可 / ルート制御

- role ごとの route access
- case 読み取り権限
- case 編集権限
- target 編集権限
- 他隊 / 他院アクセス拒否
- ADMIN の保存禁止 API 制御

### 6-2. 病院送信履歴 / 状態遷移

- hospital_requests
- hospital_request_targets
- hospital_request_events
- hospital_patients
- 状態:
  - `UNREAD`
  - `READ`
  - `NEGOTIATING`
  - `ACCEPTABLE`
  - `NOT_ACCEPTABLE`
  - `TRANSPORT_DECIDED`
  - `TRANSPORT_DECLINED`
- 終端状態再遷移拒否
- 二重搬送決定防止

### 6-3. 通知

- EMS / HOSPITAL 通知
- dedupe
- ack
- consult comment
- status changed
- transport decided / declined
- selection stalled
- consult stalled
- request repeat
- reply delay

### 6-4. analytics / KPI

- EMS KPI
- HOSPITAL KPI
- ADMIN KPI
- stalled alert 集計
- region / incident / age / team / hospital 系の集計

### 6-5. design system

- `ds-*` token
- foundations
  - color
  - spacing
  - typography
  - elevation
  - radius
  - focus
- shared primitives
  - button
  - field
  - status badge
  - dialog
  - loading
  - table surface
- shared patterns
  - split workbench
  - detail dialog frame
  - metadata grid
  - pagination
  - KPI panel
  - KPI + backlog
  - section panel
  - metric panel
  - hero shell
  - action rail
  - priority rail
  - selectable row
  - audit trail

## 7. テスト / 運用補助

- `npm run check`
- `npm run check:full`
- Playwright E2E
- bulk 100件 dataset
- bulk views regression
- bulk mutations regression
- focused role-shell regression
- offline regression
- send-history safety regression

## 8. 補足

- 画面追加や新規機能は、今後すべて [UI_RULES.md](/C:/practice/medical-support-apps/docs/UI_RULES.md) と既存 shared pattern を正本にして実装する。
- `offline diff/automerge` は保留中であり、機能一覧には「実装済み機能」として含めない。
