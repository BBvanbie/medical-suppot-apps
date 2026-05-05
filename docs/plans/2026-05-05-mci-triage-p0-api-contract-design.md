# 大規模災害トリアージ P0 API契約設計

作成日: 2026-05-05

## 目的

- 大規模災害TRIAGE P0の状態遷移を、実装前にAPI契約として固定する。
- 各APIについて、request/response、許可role、scope check、transaction、監査ログ、失敗条件を明確にする。
- 既存MCI happy pathと50名E2Eを壊さず、段階的にP0例外系を追加できる形にする。

## 参照

- 要件: [2026-05-05-mci-triage-p0-requirements-design.md](/C:/practice/medical-support-apps/docs/plans/2026-05-05-mci-triage-p0-requirements-design.md)
- DB draft: [2026-05-05-mci-triage-p0-db-design.md](/C:/practice/medical-support-apps/docs/plans/2026-05-05-mci-triage-p0-db-design.md)
- 既存実装: [2026-04-27-mci-triage-incident-command-implementation.md](/C:/practice/medical-support-apps/docs/plans/2026-04-27-mci-triage-incident-command-implementation.md)

## 共通APIルール

### Route handler責務

- `getAuthenticatedUser()` で認証する。
- roleの大枠をrouteで判定する。
- path/bodyのIDを数値としてparseし、不正値は `400` を返す。
- bodyはunknownとして受け、route内で最低限の型整形をする。
- scope、状態遷移、capacity、監査ログはrepository/service層でtransaction内に閉じる。

### Repository責務

- `incidentId`、`patientId`、`assignmentId`、`hospitalOfferId`、`targetTeamId` をbody値だけで信用しない。
- EMSは `triage_incident_teams.team_id` と `user.teamId` の参加scopeを確認する。
- 統括救急隊操作は `role = COMMANDER` と `incident.status = ACTIVE` を確認する。
- Hospitalは `user.hospitalId` と request/assignment の `hospital_id` が一致する場合だけ許可する。
- Dispatch/Adminは app mode `LIVE | TRAINING` が対象incidentと一致することを確認する。
- 正本更新、監査ログ、通知作成は同一transactionに入れる。

### Error response

既存UI互換のため `message` は必ず返す。新規P0 APIでは `code` も返す。

```json
{
  "message": "病院枠の有効期限が切れています。",
  "code": "MCI_OFFER_EXPIRED"
}
```

Status code:

| HTTP | 用途 |
| --- | --- |
| `400` | 入力形式不正、必須項目不足 |
| `401` | 未ログイン |
| `403` | role/scope違反 |
| `404` | 対象なし、または対象mode不一致 |
| `409` | 状態遷移不正、期限切れ、capacity超過、競合 |
| `500` | 想定外エラー |

### 共通エラーコード

| code | 意味 |
| --- | --- |
| `MCI_INCIDENT_NOT_ACTIVE` | インシデントがACTIVEではない |
| `MCI_SCOPE_FORBIDDEN` | 他隊/他院/他modeの対象 |
| `MCI_NOT_COMMANDER` | 統括救急隊権限がない |
| `MCI_PATIENT_NOT_CONFIRMED` | 正式採番前で搬送割当できない |
| `MCI_PATIENT_ALREADY_ASSIGNED` | 傷病者が既に有効な搬送割当に入っている |
| `MCI_OFFER_EXPIRED` | 病院枠の期限切れ |
| `MCI_OFFER_CAPACITY_EXCEEDED` | 色別受入可能人数超過 |
| `MCI_ASSIGNMENT_INVALID_TRANSITION` | 搬送status遷移が不正 |
| `MCI_ALGORITHM_VERSION_MISSING` | LIVEで承認済みSTART/PAT版がない |
| `MCI_CLOSE_BLOCKED` | 未完了項目があり通常終了できない |

## 互換維持方針

- 既存 `POST /api/ems/mci-incidents/[incidentId]/patients` は、統括救急隊の即時正式採番APIとして残す。
- 既存 `POST /api/ems/mci-incidents/[incidentId]/transport-assignments` は、統括救急隊の割当送信APIとして残す。
- 既存 `PATCH /api/ems/mci-transport-assignments/[assignmentId]/decision` は、`status = TRANSPORT_DECIDED` の互換shortcutとして残す。
- P0では新規APIを追加し、既存APIは内部的に新しいserviceへ寄せる。

## API契約

### 1. EMS 統括交代申請

`POST /api/ems/mci-incidents/[incidentId]/command-transition-requests`

許可:

| role | 条件 |
| --- | --- |
| EMS | 対象incident参加隊。`toTeamId` が自隊、または自隊が現統括救急隊の場合のみ他隊を指定可。 |

Request:

```json
{
  "toTeamId": 12,
  "reason": "現統括隊が搬送に出るため交代申請"
}
```

Response:

```json
{
  "ok": true,
  "transition": {
    "id": 1001,
    "incidentId": 55,
    "fromTeamId": 10,
    "toTeamId": 12,
    "transitionType": "REQUESTED",
    "reason": "現統括隊が搬送に出るため交代申請"
  }
}
```

Repository/transaction:

- incident、現command team、申請元team、toTeamを確認する。
- `triage_incident_command_transitions` に `REQUESTED` を作成する。
- `COMMAND_TRANSITION_REQUESTED` を監査ログに残す。
- dispatchへ重要通知を作成する。

失敗条件:

- toTeamがincident参加隊ではない: `403 MCI_SCOPE_FORBIDDEN`
- ACTIVEでない: `409 MCI_INCIDENT_NOT_ACTIVE`
- reasonなし: `400`

### 2. Dispatch 統括交代承認/却下/強制交代

`POST /api/dispatch/mci-incidents/[incidentId]/command-transitions`

許可:

| role | 条件 |
| --- | --- |
| DISPATCH | 対象incidentと同じmode |
| ADMIN | 対象incidentと同じmode |

Request:

```json
{
  "action": "APPROVE",
  "transitionId": 1001,
  "reason": "交代を承認"
}
```

強制交代:

```json
{
  "action": "FORCE",
  "toTeamId": 12,
  "reason": "現統括隊が10分以上無応答"
}
```

Response:

```json
{
  "ok": true,
  "incident": {
    "id": 55,
    "commandTeamId": 12,
    "teams": []
  }
}
```

Repository/transaction:

- incident rowと `triage_incident_teams` を `FOR UPDATE` でlockする。
- 旧COMMANDERをTRANSPORTまたはCREATORへ戻し、新teamをCOMMANDERにする。
- transitionを `APPROVED` / `REJECTED` / `FORCED` として記録する。
- 全参加隊へ統括変更通知を作成する。
- `COMMANDER_CHANGED` または `COMMANDER_CHANGE_REJECTED` を監査ログに残す。

失敗条件:

- toTeamが参加隊でない: `403 MCI_SCOPE_FORBIDDEN`
- transitionが解決済み: `409 MCI_ASSIGNMENT_INVALID_TRANSITION`
- FORCEでreasonなし: `400`

### 3. EMS 傷病者仮登録

`POST /api/ems/mci-incidents/[incidentId]/patients/provisional`

許可:

| role | 条件 |
| --- | --- |
| EMS | 対象incident参加隊。COMMANDER以外も可。 |

Request:

```json
{
  "clientRequestId": "offline-safe-id-001",
  "startAssessment": {
    "walking": "NO",
    "respiration": "FAST",
    "perfusion": "RADIAL_ABSENT",
    "mentalStatus": "CANNOT_FOLLOW"
  },
  "patAssessment": {
    "priority": "RED",
    "findings": ["頭部外傷"]
  },
  "injuryDetails": "頭部挫創、出血あり"
}
```

Response:

```json
{
  "ok": true,
  "patient": {
    "id": 3001,
    "patientNo": null,
    "provisionalPatientNo": "TMP-三鷹-001",
    "registrationStatus": "PENDING_COMMAND_REVIEW",
    "currentTag": "RED"
  }
}
```

Repository/transaction:

- incident参加scopeを確認する。
- 承認済みSTART/PAT版で自動判定する。LIVEで承認版がない場合は拒否する。
- `triage_patients.patient_no = NULL`、`provisional_patient_no` ありで保存する。
- 初回 `triage_patient_tag_events` を作成する。
- `PATIENT_PROVISIONAL_CREATED` を監査ログに残す。
- 統括救急隊へレビュー通知を作成する。

失敗条件:

- 参加隊ではない: `403 MCI_SCOPE_FORBIDDEN`
- LIVEで承認済み判定版なし: `409 MCI_ALGORITHM_VERSION_MISSING`
- injuryDetailsが長すぎる: `400`

### 4. EMS 統括救急隊 傷病者レビュー

`PATCH /api/ems/mci-incidents/[incidentId]/patients/[patientId]/review`

許可:

| role | 条件 |
| --- | --- |
| EMS | 対象incidentのCOMMANDER |
| DISPATCH/Admin | 例外補正APIを別途用意する場合のみ可 |

Request approve:

```json
{
  "action": "APPROVE",
  "reason": "内容確認済み"
}
```

Request merge:

```json
{
  "action": "MERGE",
  "mergedIntoPatientId": 3002,
  "reason": "同一傷病者の重複登録"
}
```

Request return:

```json
{
  "action": "RETURN",
  "reason": "外傷詳細が不足"
}
```

Response:

```json
{
  "ok": true,
  "patient": {
    "id": 3001,
    "patientNo": "P-001",
    "registrationStatus": "CONFIRMED"
  }
}
```

Repository/transaction:

- incident、patient、COMMANDER権限を `FOR UPDATE` で確認する。
- `APPROVE` は `pg_advisory_xact_lock('mci-patient-no:{incidentId}')` を取得して `P-001` 採番する。
- `MERGE` は統合先が同一incidentかつ `CONFIRMED` であることを確認する。
- `RETURN` は `returned_reason` 必須。
- `CANCEL` は未割当患者のみ許可する。
- `PATIENT_REVIEWED` / `PATIENT_APPROVED` / `PATIENT_MERGED` / `PATIENT_RETURNED` を監査ログに残す。

失敗条件:

- COMMANDERでない: `403 MCI_NOT_COMMANDER`
- 既にCONFIRMED/MERGED/CANCELLED: `409`
- merge先が同一incidentでない: `403 MCI_SCOPE_FORBIDDEN`
- 割当済みpatientを取消: `409 MCI_PATIENT_ALREADY_ASSIGNED`

### 5. EMS 統括救急隊 色変更/再トリアージ

`POST /api/ems/mci-incidents/[incidentId]/patients/[patientId]/tag-events`

許可:

| role | 条件 |
| --- | --- |
| EMS | 対象incidentのCOMMANDER |

Request auto/retriage:

```json
{
  "changeSource": "RETRIAGE",
  "startAssessment": {},
  "patAssessment": {},
  "injuryDetails": "再評価後、呼吸状態悪化"
}
```

Request manual override:

```json
{
  "changeSource": "MANUAL_OVERRIDE",
  "manualTag": "RED",
  "overrideReason": "現場判断で搬送優先度を上げる"
}
```

Response:

```json
{
  "ok": true,
  "patient": {
    "id": 3001,
    "currentTag": "RED",
    "startTag": "YELLOW",
    "patTag": "RED"
  },
  "event": {
    "id": 9001,
    "previousTag": "YELLOW",
    "nextTag": "RED"
  }
}
```

Repository/transaction:

- patientをlockし、`CONFIRMED` または `PENDING_COMMAND_REVIEW` のみ変更可とする。
- START/PAT版を保存し、patientの `start_algorithm_version_id` / `pat_algorithm_version_id` を更新する。
- `MANUAL_OVERRIDE` は `overrideReason` 必須。
- 割当済みpatientの色変更時は、割当先offerのcapacity再検証を行う。超過する場合は変更を止めるか、統括救急隊に再割当を促す。初期実装では止める。
- `PATIENT_TAG_CHANGED` を監査ログに残す。

失敗条件:

- overrideReasonなし: `400`
- 色変更で既存割当のcapacity超過: `409 MCI_OFFER_CAPACITY_EXCEEDED`

### 6. Dispatch 病院受入依頼

既存 `POST /api/dispatch/mci-incidents/[incidentId]/hospital-requests`

P0追加:

- responseに `offerStatus`、`expiresAt`、`remainingCounts` を含められるようにする。
- 送信時に `HOSPITAL_REQUEST_SENT` を監査ログに残す。
- 同一病院へ再依頼する場合は既存requestを更新するか、新規requestにするかを実装前に固定する。推奨は既存request更新 + offer更新履歴はauditで残す。

### 7. Hospital 受入回答/枠更新/取消

既存 `PATCH /api/hospitals/mci-requests/[requestId]`

許可:

| role | 条件 |
| --- | --- |
| HOSPITAL | 自院requestのみ |

Request acceptable:

```json
{
  "decision": "ACCEPTABLE",
  "capacities": { "red": 3, "yellow": 6, "green": 20, "black": 0 },
  "expiresInMinutes": 15,
  "notes": "MCI枠として受入可能"
}
```

Request not acceptable:

```json
{
  "decision": "NOT_ACCEPTABLE",
  "notes": "対応困難"
}
```

Request cancel:

```json
{
  "decision": "CANCEL_OFFER",
  "reason": "院内受入枠が埋まった"
}
```

Response:

```json
{
  "ok": true,
  "row": {
    "id": 2001,
    "status": "ACCEPTABLE",
    "offer": {
      "id": 501,
      "red": 3,
      "yellow": 6,
      "green": 20,
      "black": 0,
      "offerStatus": "ACTIVE",
      "expiresAt": "2026-05-05T10:15:00.000Z"
    }
  }
}
```

Repository/transaction:

- requestとhospital_idをlockする。
- `expiresInMinutes` はserver側で `1..60` に丸め、未指定は15分。
- `CANCEL_OFFER` は未確定予約がある場合でも即時取消を記録し、dispatch/統括へcritical通知を出す。既存割当の自動取消はしない。
- `HOSPITAL_OFFER_ACCEPTED` / `HOSPITAL_OFFER_UPDATED` / `HOSPITAL_OFFER_CANCELLED` を監査ログに残す。

失敗条件:

- 自院requestでない: `403 MCI_SCOPE_FORBIDDEN`
- ACCEPTABLEで合計capacity 0: `400`
- 既にincident終了: `409 MCI_INCIDENT_NOT_ACTIVE`

### 8. Dispatch 病院枠再確認依頼

`POST /api/dispatch/mci-incidents/[incidentId]/hospital-offers/[offerId]/refresh`

許可:

| role | 条件 |
| --- | --- |
| DISPATCH/Admin | 対象incidentと同じmode |

Request:

```json
{
  "message": "受入枠の再確認をお願いします。"
}
```

Response:

```json
{
  "ok": true,
  "notifiedHospitalId": 20
}
```

Repository/transaction:

- offerとincidentを確認する。
- hospitalへ再確認通知を作成する。
- `HOSPITAL_OFFER_REFRESH_REQUESTED` を監査ログに残す。
- offerの状態は病院が再回答するまで変更しない。

### 9. EMS 統括救急隊 搬送割当

既存 `POST /api/ems/mci-incidents/[incidentId]/transport-assignments`

P0 request互換:

```json
{
  "targetTeamId": 12,
  "hospitalOfferId": 501,
  "patientIds": [3001, 3002, 3003]
}
```

P0 response追加:

```json
{
  "ok": true,
  "assignment": {
    "id": 8001,
    "status": "SENT_TO_TEAM",
    "reservedCounts": { "red": 1, "yellow": 0, "green": 2, "black": 0 },
    "expiresAt": "2026-05-05T10:15:00.000Z"
  }
}
```

Repository/transaction:

- incident、COMMANDER権限、targetTeam参加scope、offerをlockする。
- offerは `offer_status = ACTIVE` かつ `expires_at > NOW()` のみ許可する。
- patientは全て `CONFIRMED`、同一incident、未割当または無効割当のみ許可する。
- capacity計算は `TRANSPORT_DECLINED` / `CANCELLED` 以外のassignmentを消費済みとして扱う。
- assignment作成とpatient更新と監査ログを同一transactionにする。
- `TRANSPORT_ASSIGNMENT_SENT` と `HOSPITAL_OFFER_RESERVED` を監査ログに残す。

失敗条件:

- COMMANDERでない: `403 MCI_NOT_COMMANDER`
- offer期限切れ: `409 MCI_OFFER_EXPIRED`
- capacity超過: `409 MCI_OFFER_CAPACITY_EXCEEDED`
- patient未承認: `409 MCI_PATIENT_NOT_CONFIRMED`

### 10. EMS 搬送status更新

`PATCH /api/ems/mci-transport-assignments/[assignmentId]/status`

許可:

| role | 条件 |
| --- | --- |
| EMS | assignment.team_idが自隊 |

Request:

```json
{
  "nextStatus": "DEPARTED_SCENE",
  "reason": ""
}
```

Allowed transitions:

| from | to |
| --- | --- |
| `SENT_TO_TEAM` | `TRANSPORT_DECIDED`, `TRANSPORT_DECLINED` |
| `TRANSPORT_DECIDED` | `DEPARTED_SCENE` |
| `DEPARTED_SCENE` | `ARRIVED_HOSPITAL` |
| `ARRIVED_HOSPITAL` | `HANDOFF_COMPLETED` |
| `HANDOFF_COMPLETED` | `COMPLETED` 条件付き |

Response:

```json
{
  "ok": true,
  "assignment": {
    "id": 8001,
    "status": "DEPARTED_SCENE"
  }
}
```

Repository/transaction:

- assignmentをlockする。
- status遷移順を検証する。
- `TRANSPORT_DECLINED` はreason必須、病院枠仮消費を解放する。
- `TRANSPORT_DECIDED` は確定消費として扱い、病院へ搬送予定通知を作成する。
- `COMPLETED` はEMS側handoffと病院側handoffがそろった場合、またはdispatch例外補正のみ許可する。
- `TRANSPORT_STATUS_CHANGED` を監査ログに残す。

互換:

- 既存 `PATCH /api/ems/mci-transport-assignments/[assignmentId]/decision` は、このAPIへ内部委譲して `nextStatus = TRANSPORT_DECIDED` として扱う。

失敗条件:

- 自隊assignmentでない: `403 MCI_SCOPE_FORBIDDEN`
- 逆順/終端後更新: `409 MCI_ASSIGNMENT_INVALID_TRANSITION`
- decline reasonなし: `400`

### 11. Hospital 搬送予定の受入確認/引継完了

`PATCH /api/hospitals/mci-transport-assignments/[assignmentId]/handoff`

許可:

| role | 条件 |
| --- | --- |
| HOSPITAL | assignment.hospital_idが自院 |

Request:

```json
{
  "action": "ACCEPT_ARRIVAL",
  "notes": "救急外来で受入確認"
}
```

```json
{
  "action": "HANDOFF_COMPLETED",
  "notes": "患者引継完了"
}
```

Response:

```json
{
  "ok": true,
  "assignment": {
    "id": 8001,
    "status": "HANDOFF_COMPLETED",
    "hospitalAcceptedAt": "2026-05-05T10:30:00.000Z"
  }
}
```

Repository/transaction:

- hospital scopeを確認し、assignmentをlockする。
- `ACCEPT_ARRIVAL` は `TRANSPORT_DECIDED` 以降で許可する。
- `HANDOFF_COMPLETED` は `ARRIVED_HOSPITAL` 以降を推奨。ただし災害時は病院側が先に押す可能性があるため、EMS到着前の場合は `hospital_handoff_completed_at` のみ保存し、assignment statusはEMS到着後に進める。
- EMS側handoffと病院側handoffがそろったら `COMPLETED` へ進められる。
- `HOSPITAL_HANDOFF_UPDATED` を監査ログに残す。

### 12. Dispatch インシデント終了

`POST /api/dispatch/mci-incidents/[incidentId]/close`

許可:

| role | 条件 |
| --- | --- |
| DISPATCH/Admin | 対象incidentと同じmode |

Request normal:

```json
{
  "closureType": "NORMAL"
}
```

Request forced:

```json
{
  "closureType": "FORCED",
  "reason": "現場運用上、紙台帳へ移行したため"
}
```

Response blocked:

```json
{
  "ok": false,
  "code": "MCI_CLOSE_BLOCKED",
  "message": "未完了項目があるため終了できません。",
  "blockers": {
    "unresolvedPatients": 2,
    "activeAssignments": 1,
    "activeReservations": 1
  }
}
```

Response success:

```json
{
  "ok": true,
  "incident": {
    "id": 55,
    "status": "CLOSED",
    "closureType": "NORMAL"
  }
}
```

Repository/transaction:

- incidentをlockする。
- NORMALは全patientが `COMPLETED | CANCELLED | MERGED` または黒タグ処理済みであることを確認する。
- NORMALは `TRANSPORT_DECLINED | CANCELLED | COMPLETED` 以外のassignmentがないことを確認する。
- NORMALは `SENT_TO_TEAM` の仮消費枠がないことを確認する。
- FORCED/CANCELLEDはreason必須で、blockers snapshotを監査ログに残す。
- `INCIDENT_CLOSED` を監査ログに残す。

### 13. Dispatch/Admin 監査ログ閲覧

`GET /api/dispatch/mci-incidents/[incidentId]/audit-events?cursor=...&limit=50&targetType=patient`

許可:

| role | 条件 |
| --- | --- |
| DISPATCH/Admin | 対象incidentと同じmode |

Response:

```json
{
  "rows": [
    {
      "id": 1,
      "eventType": "PATIENT_TAG_CHANGED",
      "targetType": "patient",
      "targetId": "3001",
      "reason": "現場判断で搬送優先度を上げる",
      "createdAt": "2026-05-05T10:10:00.000Z"
    }
  ],
  "nextCursor": "1"
}
```

Notes:

- responseは自由記載医療情報を丸ごと返さない。
- patient/hospital/assignmentの詳細は正本APIから必要時に取得する。

### 14. Dispatch/Admin レポート生成

`POST /api/dispatch/mci-incidents/[incidentId]/reports`

許可:

| role | 条件 |
| --- | --- |
| DISPATCH/Admin | 対象incidentと同じmode |

Request:

```json
{
  "reportType": "CSV"
}
```

Response:

```json
{
  "ok": true,
  "report": {
    "id": 701,
    "reportType": "CSV",
    "reportStatus": "QUEUED"
  }
}
```

Repository/transaction:

- P0初期はCSV優先。PDFはmetadataを作れるが生成はP1でもよい。
- `REPORT_REQUESTED` を監査ログに残す。
- CLOSE前の生成はプレビュー扱いにするか、終了後限定にするかは実装前に選ぶ。推奨は終了後限定。

### 15. Admin START/PAT判定ロジック版

`POST /api/admin/triage-algorithm-versions`

`POST /api/admin/triage-algorithm-versions/[versionId]/approve`

`POST /api/admin/triage-algorithm-versions/[versionId]/retire`

許可:

| role | 条件 |
| --- | --- |
| ADMIN | 初期実装ではADMIN。将来 `MEDICAL_CONTROL` 権限へ分離可能にする。 |

Request create:

```json
{
  "algorithmType": "START",
  "version": "tokyo-start-2026-01",
  "definition": {}
}
```

Response:

```json
{
  "ok": true,
  "version": {
    "id": 11,
    "algorithmType": "START",
    "version": "tokyo-start-2026-01",
    "status": "DRAFT"
  }
}
```

Repository/transaction:

- `algorithm_type + version` uniqueを確認する。
- APPROVE時は `approved_by_user_id`、`approved_at`、`effective_from` を保存する。
- LIVEの自動判定では、`APPROVED` かつ有効期間内の最新versionだけを使う。
- `TRIAGE_ALGORITHM_APPROVED` を監査ログに残す。incidentに紐づかないため `incident_id = NULL`。

## 監査event一覧

| eventType | 発生API |
| --- | --- |
| `COMMAND_TRANSITION_REQUESTED` | EMS統括交代申請 |
| `COMMANDER_CHANGED` | Dispatch統括交代承認/強制交代 |
| `COMMANDER_CHANGE_REJECTED` | Dispatch統括交代却下 |
| `PATIENT_PROVISIONAL_CREATED` | EMS仮登録 |
| `PATIENT_APPROVED` | 統括レビューapprove |
| `PATIENT_MERGED` | 統括レビューmerge |
| `PATIENT_RETURNED` | 統括レビューreturn |
| `PATIENT_CANCELLED` | 統括レビューcancel |
| `PATIENT_TAG_CHANGED` | 色変更/再トリアージ |
| `HOSPITAL_REQUEST_SENT` | Dispatch病院受入依頼 |
| `HOSPITAL_OFFER_ACCEPTED` | Hospital受入可能 |
| `HOSPITAL_OFFER_UPDATED` | Hospital枠更新 |
| `HOSPITAL_OFFER_CANCELLED` | Hospital枠取消 |
| `HOSPITAL_OFFER_REFRESH_REQUESTED` | Dispatch再確認依頼 |
| `TRANSPORT_ASSIGNMENT_SENT` | 統括搬送割当 |
| `HOSPITAL_OFFER_RESERVED` | 病院枠仮消費 |
| `TRANSPORT_STATUS_CHANGED` | EMS搬送status更新 |
| `HOSPITAL_HANDOFF_UPDATED` | Hospital受入/引継 |
| `INCIDENT_CLOSED` | Dispatch終了 |
| `REPORT_REQUESTED` | レポート生成要求 |
| `TRIAGE_ALGORITHM_APPROVED` | 判定ロジック承認 |

## 実装順

1. `triage_audit_events` helperをrepositoryに追加する。
2. 状態遷移の共通guardを `lib/triageIncidentRepository.ts` に追加する。
3. hospital offer期限/capacity計算を `createMciTransportAssignment` に組み込む。
4. 既存 `decision` APIを汎用status APIに内部委譲する。
5. 仮登録、review、tag-events、command transition APIを追加する。
6. hospital handoff、close、audit-events、reports APIを追加する。
7. Admin algorithm version APIを追加する。
8. E2Eで失敗条件を固定する。

## 受入テスト追加

- 他隊が統括レビューAPIを叩くと `403 MCI_NOT_COMMANDER`。
- 他院がhandoff APIを叩くと `403 MCI_SCOPE_FORBIDDEN`。
- 期限切れofferで搬送割当すると `409 MCI_OFFER_EXPIRED`。
- capacity超過で搬送割当すると `409 MCI_OFFER_CAPACITY_EXCEEDED`。
- 未承認patientを搬送割当すると `409 MCI_PATIENT_NOT_CONFIRMED`。
- `SENT_TO_TEAM -> ARRIVED_HOSPITAL` の直行は `409 MCI_ASSIGNMENT_INVALID_TRANSITION`。
- `TRANSPORT_DECLINED` でreasonなしは `400`。
- 未完了患者が残る通常終了は `409 MCI_CLOSE_BLOCKED`。
- `MANUAL_OVERRIDE` でreasonなしは `400`。
- LIVEで承認済みSTART/PAT版なしの自動判定は `409 MCI_ALGORITHM_VERSION_MISSING`。
