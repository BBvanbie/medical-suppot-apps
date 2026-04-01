# 搬送決定後の辞退再開と事案一覧送信先履歴 UI 再設計 実装メモ

日付: 2026-04-01

## 実装単位

1. EMS 遷移許可の更新
2. 決定解除時の `hospital_patients` 削除
3. EMS UI の搬送決定 / 辞退ボタン制御整理
4. 事案一覧 `detailed` 履歴 UI の card 化
5. `npm run check`

## 完了条件

- `TRANSPORT_DECIDED -> TRANSPORT_DECLINED` が理由必須で送信できる
- 解除後にケース全体が `搬送先決定` 扱いのまま残らない
- 事案一覧の送信先履歴でコメントと返信が横詰まりせず読める
- `npm run check` が通る

## 実装結果

- `lib/hospitalRequestStatus.ts` で EMS に `TRANSPORT_DECIDED -> TRANSPORT_DECLINED` を許可した
- `lib/sendHistoryStatusRepository.ts` で決定解除時に `hospital_patients` の該当 target を削除するようにした
- `components/cases/CaseFormPage.tsx` と `app/cases/search/page.tsx` で、決定済みケースは `搬送決定` を止めつつ、決定先の `搬送辞退` のみ許可する UI ガードへ変更した
- `components/cases/CaseSendHistoryTable.tsx` と `components/cases/CaseSearchTable.tsx` でボタン制御を新ルールへ揃えた
- `components/shared/CaseSelectionHistoryTable.tsx` の `detailed` variant を card/list UI に再構築した

## 確認

- `npm run check` 通過
