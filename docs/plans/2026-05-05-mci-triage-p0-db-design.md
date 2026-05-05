# 大規模災害トリアージ P0 DB migration draft / repository影響表

作成日: 2026-05-05

## 目的

- [2026-05-05-mci-triage-p0-requirements-design.md](/C:/practice/medical-support-apps/docs/plans/2026-05-05-mci-triage-p0-requirements-design.md) を、次フェーズで実装可能なDB変更案へ落とす。
- この文書はdraftであり、`scripts/` 配下の適用対象migrationではない。
- 実装に入る場合は、ここをレビューしてから `scripts/migration_YYYYMMDD_NNNN_mci_triage_p0.sql` と repository/API/UI/E2E へ分解する。

## 現状整理

- 既存migrationは `scripts/migration_20260427_0020_mci_triage_incidents.sql`。
- 既存 `triage_incidents.mode` は `LIVE | TRAINING`。P0では訓練用の新規列を追加せず、この列を継続利用する。
- 既存 `triage_incidents.status` は `PENDING_APPROVAL | ACTIVE | CLOSED`。P0でもstatus値は増やさず、終了レビュー/強制終了は補助列で表現する。
- 既存 `triage_patients.patient_no` は `NOT NULL` かつ `UNIQUE (incident_id, patient_no)`。仮登録では正式番号前の保存が必要なため、ここが最大のmigration注意点になる。
- 既存 `triage_transport_assignments.status` は `DRAFT | SENT_TO_TEAM | TRANSPORT_DECIDED | TRANSPORT_DECLINED | ARRIVED`。P0では `ARRIVED` を `ARRIVED_HOSPITAL` へ寄せ、後続状態を追加する。
- 監査ログはTRAININGリセット後も残す方針なので、`triage_audit_events` は `triage_incidents ON DELETE CASCADE` にしない。

## Draft SQL

このSQLは方針確認用。実適用前に開発DBでconstraint名、既存データ、cleanup順を確認する。

```sql
BEGIN;

-- 1. START/PAT algorithm versions
CREATE TABLE IF NOT EXISTS triage_algorithm_versions (
  id BIGSERIAL PRIMARY KEY,
  algorithm_type TEXT NOT NULL CHECK (algorithm_type IN ('START', 'PAT')),
  version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'APPROVED', 'RETIRED')),
  definition JSONB NOT NULL DEFAULT '{}'::jsonb,
  approved_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  effective_from TIMESTAMPTZ,
  retired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (algorithm_type, version)
);

CREATE INDEX IF NOT EXISTS idx_triage_algorithm_versions_type_status
  ON triage_algorithm_versions(algorithm_type, status, effective_from DESC, id DESC);

-- 2. Incident closure metadata. Keep existing status values.
ALTER TABLE triage_incidents
  ADD COLUMN IF NOT EXISTS closure_type TEXT CHECK (closure_type IN ('NORMAL', 'FORCED', 'CANCELLED')),
  ADD COLUMN IF NOT EXISTS closure_reason TEXT,
  ADD COLUMN IF NOT EXISTS closing_review_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_by_dispatch_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS force_closed_at TIMESTAMPTZ;

-- 3. Commander handover / forced transition history.
CREATE TABLE IF NOT EXISTS triage_incident_command_transitions (
  id BIGSERIAL PRIMARY KEY,
  incident_id BIGINT NOT NULL REFERENCES triage_incidents(id) ON DELETE CASCADE,
  from_team_id INTEGER REFERENCES emergency_teams(id) ON DELETE SET NULL,
  to_team_id INTEGER NOT NULL REFERENCES emergency_teams(id) ON DELETE RESTRICT,
  requested_by_team_id INTEGER REFERENCES emergency_teams(id) ON DELETE SET NULL,
  approved_by_dispatch_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  transition_type TEXT NOT NULL CHECK (transition_type IN ('REQUESTED', 'APPROVED', 'REJECTED', 'FORCED')),
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_triage_command_transitions_incident
  ON triage_incident_command_transitions(incident_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_triage_command_transitions_pending
  ON triage_incident_command_transitions(incident_id, transition_type, resolved_at)
  WHERE transition_type = 'REQUESTED' AND resolved_at IS NULL;

-- 4. Patient provisional registration and START/PAT version references.
ALTER TABLE triage_patients
  DROP CONSTRAINT IF EXISTS triage_patients_incident_id_patient_no_key;

ALTER TABLE triage_patients
  ALTER COLUMN patient_no DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS provisional_patient_no TEXT,
  ADD COLUMN IF NOT EXISTS merged_into_patient_id BIGINT REFERENCES triage_patients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS returned_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
  ADD COLUMN IF NOT EXISTS start_algorithm_version_id BIGINT REFERENCES triage_algorithm_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pat_algorithm_version_id BIGINT REFERENCES triage_algorithm_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS black_tag_handled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS black_tag_handled_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE triage_patients
  DROP CONSTRAINT IF EXISTS triage_patients_registration_status_check;

ALTER TABLE triage_patients
  ADD CONSTRAINT triage_patients_registration_status_check
  CHECK (registration_status IN ('DRAFT', 'PENDING_COMMAND_REVIEW', 'CONFIRMED', 'MERGED', 'RETURNED', 'CANCELLED'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_triage_patients_incident_patient_no
  ON triage_patients(incident_id, patient_no)
  WHERE patient_no IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_triage_patients_incident_provisional
  ON triage_patients(incident_id, registration_status, provisional_patient_no, id)
  WHERE patient_no IS NULL;

CREATE INDEX IF NOT EXISTS idx_triage_patients_merged_into
  ON triage_patients(merged_into_patient_id)
  WHERE merged_into_patient_id IS NOT NULL;

-- 5. Patient tag change history.
CREATE TABLE IF NOT EXISTS triage_patient_tag_events (
  id BIGSERIAL PRIMARY KEY,
  patient_id BIGINT NOT NULL REFERENCES triage_patients(id) ON DELETE CASCADE,
  incident_id BIGINT NOT NULL REFERENCES triage_incidents(id) ON DELETE CASCADE,
  previous_tag TEXT CHECK (previous_tag IN ('RED', 'YELLOW', 'GREEN', 'BLACK')),
  next_tag TEXT NOT NULL CHECK (next_tag IN ('RED', 'YELLOW', 'GREEN', 'BLACK')),
  start_tag TEXT CHECK (start_tag IN ('RED', 'YELLOW', 'GREEN', 'BLACK')),
  pat_tag TEXT CHECK (pat_tag IN ('RED', 'YELLOW', 'GREEN', 'BLACK')),
  assessment_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_source TEXT NOT NULL CHECK (change_source IN ('AUTO_START', 'AUTO_PAT', 'MANUAL_OVERRIDE', 'RETRIAGE')),
  override_reason TEXT,
  start_algorithm_version_id BIGINT REFERENCES triage_algorithm_versions(id) ON DELETE SET NULL,
  pat_algorithm_version_id BIGINT REFERENCES triage_algorithm_versions(id) ON DELETE SET NULL,
  changed_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  changed_by_team_id INTEGER REFERENCES emergency_teams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_triage_patient_tag_events_patient
  ON triage_patient_tag_events(patient_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_triage_patient_tag_events_incident
  ON triage_patient_tag_events(incident_id, created_at DESC, id DESC);

-- 6. Hospital offer lifecycle.
ALTER TABLE triage_hospital_offers
  ADD COLUMN IF NOT EXISTS offer_status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (offer_status IN ('ACTIVE', 'EXPIRED', 'CANCELLED', 'EXHAUSTED', 'SUPERSEDED')),
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
  ADD COLUMN IF NOT EXISTS superseded_by_offer_id BIGINT REFERENCES triage_hospital_offers(id) ON DELETE SET NULL;

UPDATE triage_hospital_offers
SET expires_at = COALESCE(expires_at, responded_at + INTERVAL '15 minutes')
WHERE expires_at IS NULL;

ALTER TABLE triage_hospital_offers
  ALTER COLUMN expires_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_triage_hospital_offers_status_expires
  ON triage_hospital_offers(offer_status, expires_at, id);

-- 7. Transport assignment lifecycle.
UPDATE triage_transport_assignments
SET status = 'ARRIVED_HOSPITAL'
WHERE status = 'ARRIVED';

ALTER TABLE triage_transport_assignments
  DROP CONSTRAINT IF EXISTS triage_transport_assignments_status_check;

ALTER TABLE triage_transport_assignments
  ADD CONSTRAINT triage_transport_assignments_status_check
  CHECK (status IN (
    'DRAFT',
    'SENT_TO_TEAM',
    'TRANSPORT_DECIDED',
    'TRANSPORT_DECLINED',
    'DEPARTED_SCENE',
    'ARRIVED_HOSPITAL',
    'HANDOFF_COMPLETED',
    'COMPLETED',
    'CANCELLED'
  ));

ALTER TABLE triage_transport_assignments
  ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS decline_reason TEXT,
  ADD COLUMN IF NOT EXISTS departed_scene_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS arrived_hospital_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS handoff_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hospital_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hospital_accepted_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hospital_handoff_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hospital_handoff_completed_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
  ADD COLUMN IF NOT EXISTS last_status_updated_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_status_updated_by_team_id INTEGER REFERENCES emergency_teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_triage_transport_assignments_status_age
  ON triage_transport_assignments(status, sent_at, updated_at DESC)
  WHERE status = 'SENT_TO_TEAM';

-- 8. Audit events. Preserve rows even when TRAINING data is reset.
CREATE TABLE IF NOT EXISTS triage_audit_events (
  id BIGSERIAL PRIMARY KEY,
  incident_id BIGINT REFERENCES triage_incidents(id) ON DELETE SET NULL,
  incident_code TEXT,
  mode TEXT NOT NULL CHECK (mode IN ('LIVE', 'TRAINING')),
  actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  actor_team_id INTEGER REFERENCES emergency_teams(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  before_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  after_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_triage_audit_events_incident_created
  ON triage_audit_events(incident_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_triage_audit_events_target
  ON triage_audit_events(target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_triage_audit_events_mode_created
  ON triage_audit_events(mode, created_at DESC, id DESC);

-- 9. Report generation metadata.
CREATE TABLE IF NOT EXISTS triage_incident_reports (
  id BIGSERIAL PRIMARY KEY,
  incident_id BIGINT NOT NULL REFERENCES triage_incidents(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('CSV', 'PDF')),
  report_status TEXT NOT NULL CHECK (report_status IN ('QUEUED', 'READY', 'FAILED')),
  storage_path TEXT,
  generated_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_triage_incident_reports_incident
  ON triage_incident_reports(incident_id, report_type, created_at DESC);

COMMIT;
```

## Migration notes

- `triage_patients.patient_no` nullable化後、repositoryの型は `patientNo: string | null` ではなく `displayPatientNo` を追加してUI崩れを防ぐ。
- 正式採番の採番SQLは `WHERE patient_no IS NOT NULL` を必ず入れる。仮番号の数字を `P-001` 採番に混ぜない。
- `idx_triage_patients_incident_tag` は `patient_no` nullable後も動くが、一覧ソートは `COALESCE(patient_no, provisional_patient_no)` に変更する。
- `ARRIVED` backfill後、既存E2Eと病院一覧は `ARRIVED_HOSPITAL` を到着扱いに更新する。
- `triage_audit_events` はTRAININGリセットで消さない。incident削除後も `incident_code` と `mode` で検索できるようにする。
- `triage_hospital_offers.expires_at SET NOT NULL` は、既存全行に `responded_at` がある前提。実適用前に `SELECT COUNT(*) FROM triage_hospital_offers WHERE responded_at IS NULL` を確認する。

## Repository影響表

| ファイル | 影響 | 必須変更 |
| --- | --- | --- |
| `lib/triageIncidentSchema.ts` | schema requirement | 新規テーブル、追加カラム、partial unique index、offer/status indexesを追加する。 |
| `lib/triageIncidentRepository.ts` | 中心実装 | patient_no nullable対応、仮登録/承認/統合/差戻し、色変更履歴、統括交代、枠期限、搬送status遷移、監査ログtransactionを追加する。 |
| `app/api/dispatch/cases/[caseId]/mci-incident/route.ts` | インシデント承認 | closure columnsは直接不要だが、incident mode/status互換を維持する。 |
| `app/api/dispatch/mci-incidents/[incidentId]/hospital-requests/route.ts` | 病院依頼 | offer期限、再確認、期限切れ表示用のレスポンス項目を追加する。 |
| `app/api/dispatch/mci-incidents/[incidentId]/triage-mode-requests/route.ts` | 通知 | 切替依頼の監査イベントを追加する。 |
| 新規 `app/api/dispatch/mci-incidents/[incidentId]/command-transitions/route.ts` | 統括交代 | dispatch承認/却下/強制交代、監査ログ、全隊通知を実装する。 |
| 新規 `app/api/dispatch/mci-incidents/[incidentId]/close/route.ts` | 終了処理 | 通常終了/強制終了、未完了check、理由必須、監査ログを実装する。 |
| 新規 `app/api/dispatch/mci-incidents/[incidentId]/audit-events/route.ts` | 監査閲覧 | dispatch/admin向けにincident単位監査ログを返す。 |
| `app/api/ems/mci-incidents/[incidentId]/patients/route.ts` | 患者登録 | 現行の統括即時採番APIと、各隊仮登録APIを分けるかactionで分岐する。 |
| 新規 `app/api/ems/mci-incidents/[incidentId]/patients/[patientId]/review/route.ts` | 仮登録レビュー | 統括救急隊の承認/統合/差戻し/取消を実装する。 |
| 新規 `app/api/ems/mci-incidents/[incidentId]/patients/[patientId]/tag-events/route.ts` | 色変更 | START/PAT再評価、理由付き上書き、tag event保存を実装する。 |
| `app/api/ems/mci-incidents/[incidentId]/transport-assignments/route.ts` | 搬送割当 | offer期限、仮消費、既存割当集計、expired/recheckエラーを追加する。 |
| `app/api/ems/mci-transport-assignments/[assignmentId]/decision/route.ts` | 搬送決定 | 後続の汎用status APIへ寄せる。互換のためdecision routeは残すかredirectする。 |
| 新規 `app/api/ems/mci-transport-assignments/[assignmentId]/status/route.ts` | 搬送status | 決定、辞退、出発、到着、引継完了、完了を状態遷移として検証する。 |
| `app/api/hospitals/mci-requests/[requestId]/route.ts` | 病院回答 | `expiresAt`、offer更新、取消、再回答時のSUPERSEDED処理を追加する。 |
| `app/api/hospitals/mci-transport-assignments/route.ts` | 病院搬送一覧 | `TRANSPORT_DECIDED` 以降のstatus表示と病院側確認項目を返す。 |
| 新規 `app/api/hospitals/mci-transport-assignments/[assignmentId]/handoff/route.ts` | 病院引継 | 自院assignment scopeで受入確認/引継完了を保存する。 |
| 新規 `app/api/admin/triage-algorithm-versions/*` | 医療統制 | START/PATロジック版の作成/承認/停止。初期はADMIN内権限で実装するか要確認。 |
| `components/dispatch/MciIncidentCommandPanel.tsx` | dispatch UI | 統括交代、offer期限、未応答、終了レビュー、監査導線を追加する。 |
| `components/ems/EmsMciIncidentPanel.tsx` | EMS UI | 仮登録、レビュー、正式採番、色変更履歴、後続搬送statusを追加する。 |
| `components/hospitals/HospitalMciRequestsPanel.tsx` | Hospital UI | offer期限、搬送予定、受入確認/引継完了を追加する。 |
| `e2e/tests/mci-triage-incident.spec.ts` | 回帰 | 既存50名happy pathに加え、仮登録、統合、期限切れ、辞退、到着、終了拒否を追加する。 |
| `e2e/global-setup.ts` | cleanup | 新規cascade対象テーブルと、保持対象の `triage_audit_events` を整理する。 |
| `components/admin/AdminTrainingResetForm.tsx` / admin reset API | TRAINING cleanup | auditは消さず、reports/storageは削除対象にするかを明文化して実装する。 |

## Verification plan

DB draftを実装する時は、最低限以下を実行する。

```powershell
npm run db:migrate
npm run db:verify
npm run check
npx.cmd playwright test e2e/tests/mci-triage-incident.spec.ts --reporter=line
```

追加で必要なSQL確認:

```sql
SELECT COUNT(*) FROM triage_hospital_offers WHERE responded_at IS NULL;
SELECT COUNT(*) FROM triage_patients WHERE patient_no IS NULL AND registration_status = 'CONFIRMED';
SELECT status, COUNT(*) FROM triage_transport_assignments GROUP BY status ORDER BY status;
```

## Open items before real migration

- `Admin/MC` を既存 `ADMIN` 内権限で始めるか、`MEDICAL_CONTROL` roleを追加するか。
- `triage_audit_events` をTRAINING reset後も永続保持する期間。現時点では削除しない方針。
- PDF report storageの実保存先。P0実装ではCSVを先行し、PDFはmetadataだけにするか再確認する。
- `offer.expires_at` の15分を固定値にするか、環境変数/設定値にするか。
