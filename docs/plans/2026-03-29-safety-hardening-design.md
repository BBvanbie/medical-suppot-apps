# 2026-03-29 Safety Hardening Design

## 結論

レビューで挙がった項目を `既にある / 要強化 / 未実装` に分けると、現行システムは業務フローの土台は概ね揃っている一方で、Phase 1 として先に固めるべきなのは `認可共通化`、`搬送決定の排他制御`、`終端状態固定`、`監査ログ標準化` です。
今回の着手範囲は、この4項目のうち実装影響が高く既存フローを壊しにくい部分から始めます。

## 既にある

- ロール分離
  - `EMS / HOSPITAL / ADMIN / DISPATCH` のルート分離と基本認可
- 事案識別分離
  - `case_id` と `case_uid` の分離
- 主幹業務フロー
  - 指令起票 -> EMS 一覧 -> 病院検索 -> 受入要請 -> 病院応答 -> 搬送判断
- 病院要請モデル
  - `hospital_requests / hospital_request_targets / hospital_request_events / hospital_patients`
- 通知基盤
  - `notifications` テーブルと role scope ごとの配信
- EMS オフライン基盤
  - IndexedDB、下書き、キュー、検索キャッシュ、未送信一覧
- 管理画面
  - 病院、救急隊、ユーザー、端末、組織、ログ、事案の管理 UI/API

## 要強化

- 認可
  - `/cases/*` は page/API 側認可に依存しており、共通ガード化が弱い
  - HOSPITAL target 系も route ごとに個別認可が残る
- ステータス遷移
  - `TRANSPORT_DECIDED` が終端として固定されていない
- 排他制御
  - 搬送決定時の同時更新競合に対する防御がアプリ層中心で、DB 制約が弱い
- 監査ログ
  - `audit_logs` はあるが、actor scope や拒否イベントの標準化が弱い
- 通知
  - dedupe、severity、期限、再通知ルールは未定義
- オフライン
  - 競合解決ルール、キュー状態の仕様、破棄・再送操作の粒度が未完了
- 検索
  - スコアリング、理由表示、応答実績を使った順位付けは未対応

## 未実装

- 認可拒否イベントの監査記録
- 1事案1搬送決定の DB 制約
- オフライン競合解決 UI
- 通知の dedupe / severity / expires / ack
- 未対応長時間放置アラート
- 検索順位スコアリング
- リアルタイム通知
- レポート / CSV / 指標ダッシュボード
- 指令誤起票訂正、隊変更、重複事案警告

## Phase 1 実装方針

### 1. 認可共通化

- `case_uid` / `targetId` ベースの共通 access helper を追加する
- route handler では個別 SQL で ownership を判定せず、共通関数経由に寄せる
- 認可拒否時は可能な範囲で監査ログへ `forbidden_access_attempt` を残す

### 2. 終端状態固定

- `TRANSPORT_DECIDED` は通常運用では終端状態とする
- 再オープンは route handler からは許可せず、将来の `ADMIN` 補正専用操作に分離する

### 3. 搬送決定排他制御

- 搬送決定時は transaction 内で対象 target を再読込して状態一致を確認する
- `hospital_patients.case_uid` を 1 事案 1 決定の制約点として使い、unique index を追加する
- 同時搬送決定は `409` で返し、二重決定を防ぐ

### 4. 監査ログ標準化の最小対応

- `audit_logs` に actor scope (`actor_team_id`, `actor_hospital_id`) と補助 JSON を追加する
- 共通 writer 関数を追加し、既存の生 SQL insert を段階的に置換できる状態にする
- 今回はまず拒否イベントと搬送判断系から適用する

## 非目標

- 通知のリアルタイム化
- 検索スコアリング改善
- オフライン競合解決 UI 完成
- 管理画面全体の監査検索強化

## 影響ファイル

- `lib/caseAccess.ts`
- `lib/auditLog.ts`
- `lib/sendHistoryStatusRepository.ts`
- `lib/hospitalRequestSchema.ts`
- `scripts/setup_hospital_requests.sql`
- `e2e/global-setup.ts`
- `app/api/cases/*`
- `app/api/hospitals/requests/[targetId]/*`

## 検証方針

- `npm run check`
- `npm run check:full`
- `playwright test e2e/tests/hospital-flows.spec.ts e2e/tests/dispatch-flows.spec.ts`
- 可能なら後続で競合系 API テストを追加する