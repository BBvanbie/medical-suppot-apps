# Decision Reason Enforcement Design

**Date:** 2026-03-11

## Goal
受入不可 (`NOT_ACCEPTABLE`) と搬送辞退 (`TRANSPORT_DECLINED`) を送信する際に理由入力を必須化し、後の検証・分析で扱えるよう構造化して保存する。

## Decision
- 保存先は `hospital_request_events` とする。
- `note` は既存の相談コメント用途を維持し、理由は `reason_code` / `reason_text` を別カラムで保持する。
- 理由選択 UI は送信導線ごとにバラバラに持たず、共通ダイアログで扱う。
- 自動辞退は `TRANSFERRED_TO_OTHER_HOSPITAL` を自動付与する。

## Reason Codes
### NOT_ACCEPTABLE
- `DIFFICULT_TREATMENT` 処置困難
- `BUSY_WITH_OTHER_PATIENTS` 他患対応中
- `OUT_OF_SPECIALTY` 専門外対応困難
- `NO_BEDS` ベッド満床
- `RECOMMEND_HIGHER_CARE` 高次医療機関推奨
- `RECOMMEND_OTHER_DEPARTMENT` 別科目推奨
- `BLACKLISTED_PATIENT` ブラックリスト患者
- `OTHER` その他

### TRANSPORT_DECLINED
- `TRANSFERRED_TO_OTHER_HOSPITAL` 他院搬送決定
- `DECLINED_DUE_TO_DELAY` 返信遅延によるもの
- `PATIENT_CIRCUMSTANCES` 傷病者事情

## Validation
- `NOT_ACCEPTABLE` は理由コード必須
- `TRANSPORT_DECLINED` は理由コード必須
- `OTHER` は `reason_text` 必須
- それ以外のステータスでは理由コード不要
- API 側で必ず再検証する

## Scope
- `hospital_request_events` スキーマ拡張
- 理由コード定義とフォーマットの共通化
- `updateSendHistoryStatus` へ理由情報を追加
- 病院側受入不可導線すべてを共通ダイアログ化
- A側搬送辞退導線すべてを共通ダイアログ化
- 自動辞退に既定理由を付与

## Non-Goals
- 一覧表や履歴画面への理由表示追加
- 既存相談コメントの表示ロジック変更
- 集計画面の追加
