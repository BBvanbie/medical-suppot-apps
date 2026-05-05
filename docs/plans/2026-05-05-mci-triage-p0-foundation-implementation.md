# 大規模災害TRIAGE P0 基盤実装

作成日: 2026-05-05

## 1. 目的

大規模災害TRIAGE P0のうち、安全性に直結する基盤を先に実装する。

対象:

- 仮登録傷病者
- 統括救急隊交代
- START/PAT algorithm version snapshot
- tag変更履歴
- hospital offer期限
- capacity lock
- 搬送status chain
- hospital引継完了
- audit event
- incident closure / report
- P0 safety E2E

## 2. DB

追加migration:

- `scripts/migration_20260505_0021_mci_triage_p0_foundations.sql`

追加/拡張:

- `triage_algorithm_versions`
- `triage_patient_tag_events`
- `triage_incident_command_transitions`
- `triage_audit_events`
- `triage_incident_reports`
- `triage_incidents` closure metadata
- `triage_incident_teams` command candidate metadata
- `triage_patients` provisional/review/merge/algorithm version columns
- `triage_hospital_offers` `expires_at` / cancel metadata
- `triage_transport_assignments` `DEPARTED` / `HANDOFF_COMPLETED` and timestamps

適用状況:

- 2026-05-05 にローカルDBへ `npm run db:migrate` で適用済み。
- `npm run db:migration:status` で `20260505_0021_mci_triage_p0_foundations` は `APPLIED OK`。
- `npm run db:verify` 成功。

互換性:

- 既存MCIテーブルは削除しない。
- 既存 `/patients`、`/transport-assignments`、`/decision` は維持。
- `triage_patients.patient_no` は仮登録対応のためnullable化し、正式番号はpartial unique indexで維持する。

## 3. API / Repository

主なrepository:

- `createMciProvisionalPatient`
- `reviewMciProvisionalPatient`
- `updateMciPatientTag`
- `transitionMciCommander`
- `updateMciTransportAssignmentStatus`
- `completeMciTransportHandoff`
- `listMciAuditEvents`

追加API:

- `POST /api/ems/mci-incidents/[incidentId]/provisional-patients`
- `POST /api/ems/mci-incidents/[incidentId]/patients/[patientId]/review`
- `POST /api/ems/mci-incidents/[incidentId]/patients/[patientId]/tag-events`
- `PATCH /api/ems/mci-transport-assignments/[assignmentId]/status`
- `PATCH /api/hospitals/mci-transports/[assignmentId]/handoff`
- `POST /api/dispatch/mci-incidents/[incidentId]/command-transitions`
- `GET /api/dispatch/mci-incidents/[incidentId]/audit-events`
- `POST /api/dispatch/mci-incidents/[incidentId]/close`

エラー方針:

- P0状態競合は `MciWorkflowError` で `{ message, code }` を返す。
- capacity超過は `409 CAPACITY_EXCEEDED`。
- offer期限切れは `409 OFFER_EXPIRED`。
- 統括権限不足は `403 COMMANDER_REQUIRED`。
- 終了blockerありの通常終了は `409 INCIDENT_CLOSE_BLOCKED`。

## 4. UI

最小追従:

- EMS MCI panelで非統括隊の仮登録送信を追加。
- EMS統括画面に仮登録レビュー待ち、承認、差戻しを追加。
- EMS搬送隊に辞退、出発、到着のstatus操作を追加。
- hospital MCI panelに引継完了操作を追加。
- dispatch/EMS/hospitalでoffer期限表示を追加。
- dispatch MCI panelに通常終了/理由付き強制終了の最小導線を追加。

注意:

- 今回はP0基盤の最小UIであり、UI導線設計で定義した3 pane再構築、Status Rail、audit timeline、closure reviewは次工程。

## 5. E2E

追加spec:

- `e2e/tests/mci-triage-p0-safety.spec.ts`

確認内容:

- 非統括EMSが仮登録患者を作成する。
- 統括EMSが仮登録を承認し、正式番号を採番する。
- 期限切れofferへの割当は `409 OFFER_EXPIRED`。
- capacity超過は `409 CAPACITY_EXCEEDED`。
- 非統括EMSの正式患者登録は `403 COMMANDER_REQUIRED`。
- 搬送決定、出発、到着、hospital引継完了まで進む。
- dispatchが統括救急隊を交代する。
- 旧統括は操作不可、新統括は患者登録可能。
- 未割当患者が残る通常終了は `409 INCIDENT_CLOSE_BLOCKED`。
- 理由付き強制終了でreportが作成される。
- audit eventに主要操作が残る。

既存spec維持:

- `e2e/tests/mci-triage-incident.spec.ts`
- 既存MCI基本flowと50名搬送flowは通過済み。

## 6. 検証

実行済み:

- `npm run db:migrate`
- `npm run db:verify`
- `npm run db:migration:status`
- `npm run typecheck`
- `npm run lint`
- `npx playwright test e2e/tests/mci-triage-p0-safety.spec.ts`
- `npx playwright test e2e/tests/mci-triage-incident.spec.ts`
- `$env:CI='1'; npx playwright test e2e/tests/mci-triage-p0-safety.spec.ts`
- `$env:CI='1'; npx playwright test e2e/tests/mci-triage-incident.spec.ts`
- `npm run check:full`
- `npm run review:changed`

結果:

- すべて成功。
- 既存dev server再利用時に一度API route 404が発生したため、fresh server相当の `$env:CI='1'` で再実行し、MCI本線とP0 safetyの両方が成功することを確認した。

## 7. 残作業

P0残:

- training reset時のaudit閲覧導線。
- UI導線設計に沿ったStatus Rail、audit timeline、hospital offer board、EMS 3 pane再構築。
- START/PAT algorithm version admin UI。
- 仮登録のmerge UIとAPI E2E。
- offline queueと仮登録同期の実ブラウザ/Playwright固定。

推奨次工程:

1. Status Railとaudit timelineをdispatch/EMS/hospitalへ実装する。
2. START/PAT algorithm version admin UIを追加する。
3. 仮登録merge UIとoffline queue同期E2Eを追加する。
