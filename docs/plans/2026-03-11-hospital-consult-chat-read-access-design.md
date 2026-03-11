# Hospital Consult Chat READ Access Design

**Date:** 2026-03-11

## Goal
`ConsultChatModal` を利用する HP 側画面で、`既読 (READ)` と `要相談 (NEGOTIATING)` の両方から相談チャットを開けるように統一する。テンプレート選択は相談チャット内で行い、選択内容を入力欄へ流し込める状態を保つ。

## Current Problem
- 受入要請一覧では相談チャット起動条件が `NEGOTIATING` のみ。
- 患者一覧でも相談チャット起動条件が `NEGOTIATING` のみ。
- `ConsultChatModal` 自体はテンプレ選択 UI を持てるが、親コンポーネント側の起動条件が不一致。
- その結果、`READ` 時点でテンプレを使って相談開始したい運用とずれる。

## Decision
- 相談チャット起動可否は共通関数で管理する。
- 共通条件は `READ` または `NEGOTIATING` を許可する。
- `ConsultChatModal` を使う画面ではこの共通関数を使ってボタン表示・活性を判定する。
- 患者一覧でも病院運用設定の `consultTemplate` を取得してモーダルへ渡す。

## Scope
- `lib/` に相談チャット起動可否の共通ロジックを追加
- `HospitalRequestsTable` の相談ボタン条件を共通化
- `HospitalPatientsTable` の相談ボタン条件を共通化し、テンプレ選択をモーダル内に追加
- `app/hospitals/patients/page.tsx` でテンプレ取得と props 配線を追加

## Non-Goals
- `HospitalConsultCasesTable` の独自相談ビューを `ConsultChatModal` へ統一すること
- API のステータス遷移ルール自体を変更すること
- 既読強調色や他の通知ロジックの変更

## Validation
- `READ` 行で相談ボタンが表示され、モーダルを開ける
- モーダル内でテンプレ選択が表示され、選択で textarea に本文が入る
- 手入力で編集して送信できる
- `NEGOTIATING` でも従来どおり使える

## 2026-03-11 Follow-up
- 受入要請一覧テーブルでは READ 行に相談ボタンは表示しない。
- ただし詳細画面の STATUS セクションから開く相談チャットでは、既読状態でもテンプレ選択ができるようにする。
- そのため HospitalRequestDetail の独自相談チャットにも consultTemplate を渡し、モーダル内で本文挿入を可能にする。
