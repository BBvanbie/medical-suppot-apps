# Hospital Request Lifecycle Design

**Date:** 2026-02-26  
**Scope:** 病院側「受入依頼一覧」に、救急隊送信データの病院別受信・既読管理・回答・搬送確定連携を実装する

## 1. Goal

- 病院ログインユーザーに対して、自院宛の受入依頼だけを一覧表示する
- 病院詳細閲覧で既読化し、救急隊側で未読/既読を確認できるようにする
- 病院回答（受入可能/受入不可/要相談）と救急隊回答（搬送決定/搬送辞退）を状態遷移で管理する
- 搬送決定時に搬送患者一覧へ反映する

## 2. Data Model (Recommended)

### 2-1. `hospital_requests`（送信ヘッダ）

- 1回の救急隊送信を表す親レコード
- 主な列:
  - `id` (PK)
  - `request_id` (業務ID, unique)
  - `case_id`
  - `from_team_id`
  - `created_by_user_id`
  - `sent_at`
  - `created_at`, `updated_at`

### 2-2. `hospital_request_targets`（病院別受信明細）

- 送信先病院ごとに1行作成
- 主な列:
  - `id` (PK)
  - `hospital_request_id` (FK -> hospital_requests.id)
  - `hospital_id`
  - `status`
  - `selected_departments` (JSONB)
  - `opened_at`
  - `responded_at`
  - `decided_at`
  - `updated_by_user_id`
  - `created_at`, `updated_at`

### 2-3. `hospital_request_events`（監査ログ）

- 状態変化や詳細閲覧をイベントとして保存
- 主な列:
  - `id` (PK)
  - `target_id` (FK -> hospital_request_targets.id)
  - `event_type`
  - `from_status`
  - `to_status`
  - `acted_by_user_id`
  - `note`
  - `acted_at`

## 3. Status Workflow

- 初期: `UNREAD`
- 病院で詳細表示: `UNREAD -> READ`
- 病院回答:
  - `READ/NEGOTIATING` -> `ACCEPTABLE`
  - `READ/NEGOTIATING` -> `NOT_ACCEPTABLE`
  - `READ` -> `NEGOTIATING`
- 救急隊回答（`ACCEPTABLE` のみ）:
  - `ACCEPTABLE -> TRANSPORT_DECIDED`
  - `ACCEPTABLE -> TRANSPORT_DECLINED`
- 搬送患者一覧連携:
  - `TRANSPORT_DECIDED` 時に搬送患者データへ反映

## 4. Screen Behavior

### 4-1. 病院: 受入依頼一覧

- ログイン病院IDで `hospital_request_targets` を絞り込み表示
- 一覧は `status`, `sent_at`, `case_id`, `from_team` 等を表示

### 4-2. 病院: 受入依頼詳細

- 初回表示時に `UNREAD -> READ`
- 回答アクション:
  - 受入可能
  - 受入不可
  - 要相談

### 4-3. 救急隊: 送信履歴/依頼詳細

- 病院ごとに現在ステータス表示
- 最低限 `UNREAD/READ` が可視化されること

## 5. Audit and Consistency Rules

- 全状態変化で `hospital_request_events` を追加
- 許可された遷移以外は API で拒否
- 更新はトランザクションで実施

## 6. Best-Practice Notes Applied

- 認可は server-side で強制（role + 所属病院）
- クライアント表示は最小データのみ
- 病院向けUIは救急UIと同一構造、アクセントのみ緑系で統一

