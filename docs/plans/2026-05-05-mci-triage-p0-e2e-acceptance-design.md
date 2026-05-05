# 大規模災害TRIAGE P0 E2E受入シナリオ設計

作成日: 2026-05-05

## 1. 目的

大規模災害TRIAGE P0の完成条件をPlaywright E2Eで固定する。

P0では、50名搬送の通し確認だけでは不十分である。病院枠の期限、capacity超過、統括交代、仮登録承認、搬送後続status、offline制限、監査ログまで含めて、壊れてはいけない状態遷移を確認する。

参照:

- [P0要件定義](/C:/practice/medical-support-apps/docs/plans/2026-05-05-mci-triage-p0-requirements-design.md)
- [P0 DB設計](/C:/practice/medical-support-apps/docs/plans/2026-05-05-mci-triage-p0-db-design.md)
- [P0 API契約](/C:/practice/medical-support-apps/docs/plans/2026-05-05-mci-triage-p0-api-contract-design.md)
- [P0 UI導線](/C:/practice/medical-support-apps/docs/plans/2026-05-05-mci-triage-p0-ui-wireflow-design.md)

## 2. 既存E2Eの土台

既存spec:

- `e2e/tests/mci-triage-incident.spec.ts`

既存で確認済みの主な観点:

- EMSがTRIAGE本部報告を作成する。
- dispatchがMCIインシデントを承認し、統括救急隊と参加隊を指定する。
- dispatchが病院へMCI受入依頼を送信する。
- hospitalが色別受入可能人数を返す。
- 統括救急隊が患者番号を採番し、搬送割当を作る。
- 搬送隊が搬送決定する。
- hospitalが搬送決定済み患者の番号と怪我詳細を確認する。
- 50名を11隊、2病院へ割り振り、全員搬送決定まで通す。

P0で追加する必要がある観点:

- 仮登録患者の承認/統合/差戻し。
- 統括救急隊交代。
- START/PAT algorithm version snapshot。
- tag変更履歴とoverride理由。
- hospital offer期限、予約、確定、解放。
- capacity超過と期限切れの409。
- 搬送status chain。
- hospital側の到着/引継完了。
- offline時の禁止操作と同期待ち。
- audit event。
- incident closure。
- TRAININGとLIVEの混同防止。

## 3. 受入シナリオ一覧

| ID | 優先度 | scenario | 種別 | 目的 |
| --- | --- | --- | --- | --- |
| MCI-P0-01 | P0 | 50名搬送 full path | positive | 大規模災害の本線を壊さない |
| MCI-P0-02 | P0 | 仮登録患者 review | positive/negative | 非統括隊入力を統括が承認/統合/差戻しする |
| MCI-P0-03 | P0 | 病院offer capacity lock | negative | 残枠超過割当を必ず409で止める |
| MCI-P0-04 | P0 | offer expiry | negative | 期限切れofferの新規割当を止め、UIへ復旧導線を出す |
| MCI-P0-05 | P0 | 統括救急隊交代 | positive/negative | 交代後の権限移譲と旧統括のread-only化 |
| MCI-P0-06 | P0 | 搬送status chain | positive/negative | `ASSIGNED -> DECIDED -> DEPARTED -> ARRIVED -> HANDOFF_COMPLETED` の順序保証 |
| MCI-P0-07 | P0 | tag変更履歴 | positive/negative | 再triage/overrideが履歴とauditに残る |
| MCI-P0-08 | P0 | offline制限 | negative | offline中の正式採番、病院枠予約、割当を止める |
| MCI-P0-09 | P1 | closure/report | positive/negative | 未完了搬送が残るincident終了を止める |
| MCI-P0-10 | P1 | TRAINING/LIVE分離 | negative | 訓練データがLIVE通知/集計へ混ざらない |

## 4. MCI-P0-01: 50名搬送 full path

既存 `MCI load test assigns 50 patients...` を維持し、P0実装後に次を追加する。

前提:

- 11隊: 本部機動第一、三鷹、下連雀、府中、小金井、田無、西東京、武蔵野、武蔵野デイタイム、府中大規模、調布。
- 2病院: 災害医療センター、東京医療センター。
- 傷病者: 赤10、黄15、緑25。

期待:

- incidentはLIVEで作成される。
- 本部機動第一が統括救急隊になる。
- 病院offerは色別capacity、reserved、confirmed、remaining、expiresAtを持つ。
- 50名すべてが `P-001` から `P-050` で採番される。
- 患者ごとにSTART/PAT version snapshotを持つ。
- 各搬送割当は病院の色別残枠を超えない。
- 全assignmentが `HANDOFF_COMPLETED` まで進む。
- hospital側で50名の患者番号、色、怪我詳細、搬送隊、引継完了statusを確認できる。
- auditにincident承認、病院offer、患者登録、搬送割当、搬送決定、引継完了が残る。

## 5. MCI-P0-02: 仮登録患者 review

前提:

- 非統括EMSがoffline/onlineどちらでも仮登録患者を送信できる。
- 仮登録は正式 `patient_no` を持たず、`provisional_patient_no` を持つ。

手順:

1. 非統括EMSが仮登録患者を3名送信する。
2. 統括EMSがreview inboxで3名を確認する。
3. 1名を承認し正式番号を採番する。
4. 1名を既存患者へ統合する。
5. 1名を理由付きで差戻す。

期待:

- 承認患者だけが `P-xxx` を持つ。
- 統合患者は新しい正式番号を増やさない。
- 差戻し患者は搬送割当対象に出ない。
- review actionはauditに残る。
- 非統括EMSにはreview結果通知が届く。

## 6. MCI-P0-03: 病院offer capacity lock

手順:

1. hospitalが赤1、黄1、緑1のofferを返す。
2. 統括EMSが緑2名を同じofferへ割り当てる。

期待:

- APIは `409 CAPACITY_EXCEEDED` を返す。
- どちらの患者も部分割当されない。
- offerのreserved/confirmedは変わらない。
- auditには失敗eventを残す場合でも、自由記載医療情報を複製しない。

追加手順:

1. 緑1名を割当し、搬送隊が搬送辞退する。
2. 枠が解放される。
3. 別の緑1名を再割当できる。

## 7. MCI-P0-04: offer expiry

手順:

1. hospitalが15分期限のofferを返す。
2. テスト用に期限切れ状態へ更新する。
3. 統括EMSが期限切れofferへ搬送割当を作る。

期待:

- APIは `409 OFFER_EXPIRED` を返す。
- UIは期限切れbadgeと再依頼導線を出す。
- dispatchは同病院へ再依頼できる。
- 期限切れofferはread-onlyとして履歴に残る。

## 8. MCI-P0-05: 統括救急隊交代

手順:

1. 本部機動第一を統括に指定する。
2. 三鷹が統括候補を申告する。
3. dispatchが三鷹へ統括交代を承認する。
4. 旧統括が患者登録/搬送割当APIを呼ぶ。
5. 新統括が患者登録/搬送割当APIを呼ぶ。

期待:

- 旧統括は `403 COMMANDER_REQUIRED`。
- 新統括は操作可能。
- 全参加隊画面に新統括が表示される。
- `triage_incident_command_transitions` とauditに交代履歴が残る。

## 9. MCI-P0-06: 搬送status chain

手順:

1. 統括EMSが搬送割当を送信する。
2. 搬送隊が搬送決定する。
3. 搬送隊が出発を押す。
4. 搬送隊またはhospitalが到着を記録する。
5. hospitalが引継完了を記録する。

期待:

- statusは順序通りに進む。
- `ARRIVED` 前の `HANDOFF_COMPLETED` は409。
- `TRANSPORT_DECIDED` 前の `DEPARTED` は409。
- hospital側一覧に到着予定、到着済み、引継完了が分かれて表示される。

## 10. MCI-P0-07: tag変更履歴

手順:

1. START/PATで黄色判定の患者を承認する。
2. 統括EMSが理由付きで赤へoverrideする。
3. もう一度黄色へ再評価する。

期待:

- 患者のcurrent tagは最新値になる。
- `triage_patient_tag_events` に旧tag、新tag、理由、actor、algorithm versionが残る。
- 病院へ搬送決定後に送られる患者情報は最新tagを含む。
- 理由なしoverrideは400。

## 11. MCI-P0-08: offline制限

手順:

1. 非統括EMSをoffline扱いにする。
2. 仮登録患者を作る。
3. 正式採番API、搬送割当API、統括交代APIを呼ぶ。

期待:

- 仮登録は同期待ちとして保持される。
- 正式採番、搬送割当、統括交代はoffline中は実行不可。
- online復帰後、仮登録がreview inboxへ入る。
- 重複候補がある場合、統括EMS側にmerge導線が出る。

## 12. MCI-P0-09: closure/report

手順:

1. 未完了搬送がある状態でincident closeを試す。
2. 全搬送を引継完了にする。
3. closure reviewを実行する。

期待:

- 未完了搬送が残る場合は409。
- 強制終了時は理由必須。
- 終了後は主要操作がread-onlyになる。
- reportに色別人数、病院別受入、隊別搬送、override理由が含まれる。

## 13. MCI-P0-10: TRAINING/LIVE分離

手順:

1. TRAINING modeでincidentを作る。
2. hospital requestとtransport assignmentを作る。
3. LIVE modeのhospital/dispatch/EMS一覧を確認する。

期待:

- TRAININGの通知/依頼/搬送はLIVE一覧へ出ない。
- TRAINING resetで訓練incident本体は消せる。
- audit eventはincident snapshot付きで残る。
- LIVE dataはreset対象にならない。

## 14. Playwright実装方針

- 既存 `e2e/tests/mci-triage-incident.spec.ts` はhappy pathと50名搬送を維持する。
- P0 negative/edge系は同一specが肥大化しすぎる場合、`e2e/tests/mci-triage-p0-safety.spec.ts` に分離する。
- seed helperはMCI50用ローカル関数から、必要に応じて `e2e/support/mci-test-data.ts` へ移す。
- assertionは件数完全一致より、対象incident code、患者番号、status、error code、audit eventの存在を優先する。
- selectorはUI実装後に `data-testid` を追加し、Playwrightはそれを優先する。
- API直叩きE2EとUI操作E2Eを混ぜる場合、本線の速度はAPI、画面責務の保証は最小UI操作に限定する。

## 15. 推奨実装順

1. 既存MCI50 specを壊さず維持する。
2. DB/API実装と同時に、capacity/expiry/commander/tag/statusのAPI negative E2Eを追加する。
3. UI実装後、dispatch/EMS/hospitalのStatus Railと主要button表示をfocused UI E2Eで追加する。
4. offline/closure/TRAININGは状態遷移が安定してから追加する。
5. 最後に `npm run test:e2e -- e2e/tests/mci-triage-incident.spec.ts` とP0 safety specをfocused runする。

## 16. 完了定義

- MCI-P0-01からMCI-P0-08までがE2Eで固定される。
- MCI-P0-09とMCI-P0-10はP1として、少なくとも設計とAPI negative testを持つ。
- E2E失敗時に、どのrole、どのincident、どの状態遷移で失敗したかが分かる。
- P0 APIの409/403/400がUIで扱える形の `{ message, code }` を返す。
- E2E用seedは通常seedや実データを破壊しない。
