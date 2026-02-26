# 病院受入依頼ライフサイクル設計書

**作成日:** 2026-02-26  
**対象:** 病院側「受入依頼一覧」に病院宛データの表示・既読管理・回答・搬送確定連携を実装

## 1. 目的

- 病院ログインユーザーに対して、自院宛の依頼のみ一覧表示する
- 詳細閲覧で既読化し、救急隊側で未読/既読を確認可能にする
- 病院回答と救急隊最終判断を状態遷移で管理する
- 搬送決定時に搬送患者一覧へ反映する

## 2. データモデル

### 2-1. `hospital_requests`（送信ヘッダ）

- 1回の送信単位を管理
- 主カラム: `request_id`, `case_id`, `from_team_id`, `sent_at`

### 2-2. `hospital_request_targets`（病院別受信明細）

- 送信先病院ごとに1行
- 主カラム: `hospital_id`, `status`, `selected_departments`, `opened_at`, `responded_at`, `decided_at`

### 2-3. `hospital_request_events`（監査ログ）

- 状態変更や詳細閲覧をイベントとして記録

## 3. 状態遷移

- 初期: `UNREAD`
- 詳細閲覧: `UNREAD -> READ`
- 病院回答:
  - `READ/NEGOTIATING -> ACCEPTABLE`
  - `READ/NEGOTIATING -> NOT_ACCEPTABLE`
  - `READ -> NEGOTIATING`
- 救急隊最終判断（`ACCEPTABLE` のみ）:
  - `ACCEPTABLE -> TRANSPORT_DECIDED`
  - `ACCEPTABLE -> TRANSPORT_DECLINED`
- `TRANSPORT_DECIDED` 時に搬送患者一覧へ反映

## 4. 画面仕様

- 病院受入依頼一覧: ログイン病院IDで絞り込み
- 病院受入依頼詳細: 初回表示時に既読化
- 救急隊側: 送信先病院ごとに状態（未読/既読/回答）を可視化

## 5. 監査・整合性

- 全状態遷移を `hospital_request_events` に記録
- 不正遷移はAPIで拒否
- 更新はトランザクションで実施
