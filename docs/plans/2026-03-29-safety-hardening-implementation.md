# 2026-03-29 Safety Hardening Implementation

## 目的

レビューで挙がった改善案を、現行コードに対して `既存あり / 要強化 / 未実装` で棚卸しし、Phase 1 の安全性項目から順に実装する。

## 実装順

1. 棚卸しと Phase 1 設計を docs/plans に残す
2. 認可共通化 helper を追加する
3. 事案系 / target 系 route handler を共通ガードへ寄せる
4. `TRANSPORT_DECIDED` を終端化する
5. 搬送決定時の排他制御を transaction と DB 制約で強化する
6. 監査ログ writer を共通化し、拒否イベントを最小追加する
7. check / build / E2E を実行する

## 実装メモ

- 認可共通化は一括置換ではなく、事故影響の大きい `cases` と `hospital request target` 周辺から始める
- `audit_logs` は既存列を壊さず、追加列と helper で拡張する
- 搬送決定の DB 制約は `hospital_patients(case_uid)` の unique index を使って表現する
- 終端状態の再オープンは今回は入れず、将来の `ADMIN` 補正 API として別設計にする

## 確認コマンド

- `npm run check`
- `npm run check:full`
- `npx playwright test e2e/tests/hospital-flows.spec.ts e2e/tests/dispatch-flows.spec.ts`

## 注意点

- 監査ログ列追加は runtime schema と setup SQL の両方を揃える
- route handler の bracket path は PowerShell 編集時に `-LiteralPath` を使う
- 日本語 docs は UTF-8 を維持する