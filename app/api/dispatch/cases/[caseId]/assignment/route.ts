import { NextResponse } from "next/server";
import type { PoolClient } from "pg";

import { getAuthenticatedUser } from "@/lib/authContext";
import { pickPatientSummaryFromCasePayload } from "@/lib/casePatientSummary";
import { ensureCasesColumns } from "@/lib/casesSchema";
import { db } from "@/lib/db";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import { createNotification } from "@/lib/notifications";

type AssignmentRequest = {
  sourceTargetId?: unknown;
  targetCaseIds?: unknown;
};

type CaseRow = {
  case_id: string;
  case_uid: string;
  team_id: number | null;
  mode: "LIVE" | "TRAINING";
  address: string | null;
  aware_date: string | null;
  case_payload: unknown;
};

type SourceTargetRow = {
  target_id: number;
  hospital_id: number;
  hospital_name: string;
  source_case_uid: string;
  source_address: string | null;
  source_aware_date: string | null;
  selected_departments: string[] | null;
  accepted_capacity: number | null;
  patient_summary: Record<string, unknown> | null;
};

type ExistingTargetRow = {
  id: number;
};

type DispatchSelectionFlow = "TRIAGE" | "CRITICAL_CARE";

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function isTriageDispatchReport(casePayload: unknown): boolean {
  const payload = asObject(casePayload);
  const summary = asObject(payload.summary);
  return summary.triageDispatchReport === true || summary.triageWorkflow === "DISPATCH_COORDINATED";
}

function isCriticalCareDispatchSelection(casePayload: unknown): boolean {
  const payload = asObject(casePayload);
  const summary = asObject(payload.summary);
  const request = asObject(summary.dispatchSelectionRequest);
  return request.flow === "CRITICAL_CARE" || request.status === "REQUESTED";
}

function getSourceFlow(patientSummary: Record<string, unknown> | null): DispatchSelectionFlow | null {
  if (patientSummary?.triageDispatchManaged === true || patientSummary?.operationalMode === "TRIAGE") return "TRIAGE";
  if (patientSummary?.dispatchSelectionManaged === true || patientSummary?.dispatchSelectionType === "CRITICAL_CARE") return "CRITICAL_CARE";
  return null;
}

function normalizeComparableText(value: string | null | undefined) {
  return String(value ?? "").replace(/\s+/g, "").trim();
}

function normalizeDateKey(value: string | null | undefined) {
  return String(value ?? "").trim();
}

function normalizeTargetCaseIds(value: unknown, fallbackCaseId: string): string[] {
  const rawValues = Array.isArray(value) ? value : [fallbackCaseId];
  return Array.from(new Set(rawValues.map((item) => String(item).trim()).filter(Boolean)));
}

function readDispatchAssignmentSource(casePayload: unknown): string | null {
  const payload = asObject(casePayload);
  const summary = asObject(payload.summary);
  const assignment = asObject(summary.dispatchAssignment);
  const sourceTargetId = String(assignment.sourceTargetId ?? "").trim();
  return sourceTargetId || null;
}

async function getTargetCaseForUpdate(client: PoolClient, input: { caseId: string; mode: "LIVE" | "TRAINING" }) {
  const res = await client.query<CaseRow>(
    `
      SELECT case_id, case_uid, team_id, mode, address, aware_date::text AS aware_date, case_payload
      FROM cases
      WHERE case_id = $1
        AND mode = $2
      FOR UPDATE
      LIMIT 1
    `,
    [input.caseId, input.mode],
  );
  return res.rows[0] ?? null;
}

async function getSourceTarget(client: PoolClient, input: { sourceTargetId: number; mode: "LIVE" | "TRAINING" }) {
  const res = await client.query<SourceTargetRow>(
    `
      SELECT
        t.id AS target_id,
        t.hospital_id,
        h.name AS hospital_name,
        r.case_uid AS source_case_uid,
        source_case.address AS source_address,
        source_case.aware_date::text AS source_aware_date,
        COALESCE(t.selected_departments, '[]'::jsonb)::jsonb AS selected_departments,
        t.accepted_capacity,
        COALESCE(r.patient_summary, '{}'::jsonb)::jsonb AS patient_summary
      FROM hospital_request_targets t
      JOIN hospital_requests r ON r.id = t.hospital_request_id
      JOIN hospitals h ON h.id = t.hospital_id
      LEFT JOIN cases source_case ON source_case.case_uid = r.case_uid
      WHERE t.id = $1
        AND t.status = 'ACCEPTABLE'
        AND r.mode = $2
        AND (
          COALESCE(r.patient_summary->>'triageDispatchManaged', '') = 'true'
          OR COALESCE(r.patient_summary->>'dispatchSelectionManaged', '') = 'true'
        )
      LIMIT 1
    `,
    [input.sourceTargetId, input.mode],
  );
  return res.rows[0] ?? null;
}

async function countAssignmentsForSource(client: PoolClient, input: { sourceTargetId: number; mode: "LIVE" | "TRAINING"; excludingCaseUids: string[] }) {
  const res = await client.query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM cases
      WHERE mode = $2
        AND NOT (case_uid = ANY($3::text[]))
        AND case_payload->'summary'->'dispatchAssignment'->>'sourceTargetId' = $1::text
    `,
    [String(input.sourceTargetId), input.mode, input.excludingCaseUids],
  );
  return Number(res.rows[0]?.count ?? 0);
}

async function ensureAcceptedTargetForCase(
  client: PoolClient,
  input: {
    caseRow: CaseRow;
    source: SourceTargetRow;
    actorId: number;
  },
) {
  if (input.caseRow.case_uid === input.source.source_case_uid) {
    return input.source.target_id;
  }

  const existingRes = await client.query<ExistingTargetRow>(
    `
      SELECT t.id
      FROM hospital_request_targets t
      JOIN hospital_requests r ON r.id = t.hospital_request_id
      WHERE r.case_uid = $1
        AND t.hospital_id = $2
        AND t.status = 'ACCEPTABLE'
        AND COALESCE(r.patient_summary->>'triageDispatchManaged', '') = 'true'
        AND COALESCE(r.patient_summary->>'dispatchFanoutSourceTargetId', '') = $3::text
      LIMIT 1
    `,
    [input.caseRow.case_uid, input.source.hospital_id, String(input.source.target_id)],
  );
  if (existingRes.rows[0]) return existingRes.rows[0].id;

  const patientSummary = {
    ...pickPatientSummaryFromCasePayload(input.caseRow.case_payload),
    operationalMode: "TRIAGE",
    triage: true,
    isTriageRequest: true,
    dispatchManaged: true,
    triageDispatchManaged: true,
    dispatchFanoutSourceTargetId: input.source.target_id,
  };
  const now = new Date().toISOString();
  const requestRes = await client.query<{ id: number }>(
    `
      INSERT INTO hospital_requests (
        request_id,
        case_id,
        case_uid,
        mode,
        patient_summary,
        from_team_id,
        created_by_user_id,
        first_sent_at,
        sent_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $8, NOW())
      ON CONFLICT (request_id)
      DO UPDATE SET
        patient_summary = EXCLUDED.patient_summary,
        from_team_id = EXCLUDED.from_team_id,
        updated_at = NOW()
      RETURNING id
    `,
    [
      `triage-dispatch-fanout-${input.caseRow.case_uid}-${input.source.target_id}`,
      input.caseRow.case_id,
      input.caseRow.case_uid,
      input.caseRow.mode,
      JSON.stringify(patientSummary),
      input.caseRow.team_id,
      input.actorId,
      now,
    ],
  );

  const requestId = requestRes.rows[0]?.id;
  if (!requestId) throw new Error("failed to create dispatch fanout request");

  const targetRes = await client.query<{ id: number }>(
    `
      INSERT INTO hospital_request_targets (
        hospital_request_id,
        hospital_id,
        status,
        selected_departments,
        accepted_capacity,
        responded_at,
        updated_by_user_id,
        updated_at
      ) VALUES ($1, $2, 'ACCEPTABLE', $3::jsonb, $4, NOW(), $5, NOW())
      ON CONFLICT (hospital_request_id, hospital_id)
      DO UPDATE SET
        status = 'ACCEPTABLE',
        selected_departments = EXCLUDED.selected_departments,
        accepted_capacity = EXCLUDED.accepted_capacity,
        responded_at = COALESCE(hospital_request_targets.responded_at, NOW()),
        updated_by_user_id = EXCLUDED.updated_by_user_id,
        updated_at = NOW()
      RETURNING id
    `,
    [
      requestId,
      input.source.hospital_id,
      JSON.stringify(input.source.selected_departments ?? []),
      input.source.accepted_capacity,
      input.actorId,
    ],
  );

  const targetId = targetRes.rows[0]?.id;
  if (!targetId) throw new Error("failed to create dispatch fanout target");

  await client.query(
    `
      INSERT INTO hospital_request_events (
        target_id,
        event_type,
        from_status,
        to_status,
        acted_by_user_id,
        note,
        acted_at
      ) VALUES ($1, 'dispatch_fanout', NULL, 'ACCEPTABLE', $2, $3, NOW())
    `,
    [
      targetId,
      input.actorId,
      input.source.accepted_capacity != null
        ? `dispatchが受入可能病院をEMSへ送信: ${input.source.hospital_name} / ${input.source.accepted_capacity}名`
        : `dispatchが受入可能病院をEMSへ送信: ${input.source.hospital_name}`,
    ],
  );

  return targetId;
}

async function assignCaseToSource(
  client: PoolClient,
  input: {
    caseRow: CaseRow;
    source: SourceTargetRow;
    sourceTargetId: number;
    sourceFlow: DispatchSelectionFlow;
    actorId: number;
    actorUsername: string;
  },
) {
  const targetId = await ensureAcceptedTargetForCase(client, {
    caseRow: input.caseRow,
    source: input.source,
    actorId: input.actorId,
  });

  const note =
    input.sourceFlow === "TRIAGE"
      ? input.source.accepted_capacity != null
        ? `TRIAGE受入可能 ${input.source.accepted_capacity}名。搬送決定を押下してください。`
        : "TRIAGE受入可能。搬送決定を押下してください。"
      : "本部選定結果: 受入可能。搬送決定を押下してください。";

  await client.query(
    `
      UPDATE cases
      SET
        destination = $2::text,
        case_payload = jsonb_set(
          COALESCE(case_payload, '{}'::jsonb),
          '{summary,dispatchAssignment}',
          jsonb_build_object(
            'destination', $2::text,
            'note', $3::text,
            'sourceTargetId', $4::text,
            'targetId', $5::bigint,
            'acceptedCapacity', $6::int,
            'assignedBy', $7::text,
            'flow', $8::text,
            'assignedAt', NOW()
          ),
          true
        ),
        updated_at = NOW()
      WHERE case_uid = $1
    `,
    [
      input.caseRow.case_uid,
      input.source.hospital_name,
      note,
      String(input.sourceTargetId),
      targetId,
      input.source.accepted_capacity,
      input.actorUsername,
      input.sourceFlow,
    ],
  );

  if (input.caseRow.team_id) {
    await createNotification(
      {
        audienceRole: "EMS",
        mode: input.caseRow.mode,
        teamId: input.caseRow.team_id,
        kind: input.sourceFlow === "TRIAGE" ? "dispatch_triage_assignment" : "dispatch_selection_assignment",
        caseId: input.caseRow.case_id,
        caseUid: input.caseRow.case_uid,
        targetId,
        title: input.sourceFlow === "TRIAGE" ? "本部から受入可能病院" : "本部選定結果",
        body: `${input.source.hospital_name} / ${note}`,
        menuKey: "cases-list",
        tabKey: "selection-history",
        dedupeKey: `dispatch-assignment:${input.caseRow.case_uid}:${input.sourceTargetId}:${input.sourceFlow}`,
      },
      client,
    );
  }

  return { caseId: input.caseRow.case_id, destination: input.source.hospital_name, targetId };
}

export async function PATCH(req: Request, context: { params: Promise<{ caseId: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user || (user.role !== "DISPATCH" && user.role !== "ADMIN")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { caseId } = await context.params;
  const body = (await req.json().catch(() => ({}))) as AssignmentRequest;
  const sourceTargetId = Number(body.sourceTargetId);
  const targetCaseIds = normalizeTargetCaseIds(body.targetCaseIds, caseId);

  if (!caseId.trim()) {
    return NextResponse.json({ message: "事案IDが不正です。" }, { status: 400 });
  }
  if (!Number.isInteger(sourceTargetId) || sourceTargetId < 1) {
    return NextResponse.json({ message: "受入可能になった病院を選択してください。" }, { status: 400 });
  }
  if (targetCaseIds.length === 0) {
    return NextResponse.json({ message: "送信先EMSを選択してください。" }, { status: 400 });
  }
  if (targetCaseIds.length > 30) {
    return NextResponse.json({ message: "一度に送信できるEMSは30隊までです。" }, { status: 400 });
  }

  await ensureCasesColumns();
  await ensureHospitalRequestTables();

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`triage-dispatch-source:${sourceTargetId}`]);

    const source = await getSourceTarget(client, { sourceTargetId, mode: user.currentMode });

    if (!source) {
      await client.query("ROLLBACK");
      return NextResponse.json({ message: "受入可能な本部管理の病院応答が見つかりません。" }, { status: 404 });
    }
    const sourceFlow = getSourceFlow(source.patient_summary);
    if (!sourceFlow) {
      await client.query("ROLLBACK");
      return NextResponse.json({ message: "本部管理の病院応答ではありません。" }, { status: 400 });
    }
    if (sourceFlow === "CRITICAL_CARE" && targetCaseIds.some((targetCaseId) => targetCaseId !== caseId)) {
      await client.query("ROLLBACK");
      return NextResponse.json({ message: "通常の救命・CCU選定結果は依頼元EMSにのみ送信できます。" }, { status: 400 });
    }

    const caseRows: CaseRow[] = [];
    for (const targetCaseId of targetCaseIds) {
      const caseRow = await getTargetCaseForUpdate(client, { caseId: targetCaseId, mode: user.currentMode });
      if (!caseRow) {
        await client.query("ROLLBACK");
        return NextResponse.json({ message: `対象事案が見つかりません: ${targetCaseId}` }, { status: 404 });
      }
      if (sourceFlow === "TRIAGE" && !isTriageDispatchReport(caseRow.case_payload)) {
        await client.query("ROLLBACK");
        return NextResponse.json({ message: `TRIAGE本部報告以外には送信できません: ${caseRow.case_id}` }, { status: 400 });
      }
      if (sourceFlow === "CRITICAL_CARE" && !isCriticalCareDispatchSelection(caseRow.case_payload)) {
        await client.query("ROLLBACK");
        return NextResponse.json({ message: `救命・CCUの本部選定依頼以外には送信できません: ${caseRow.case_id}` }, { status: 400 });
      }
      caseRows.push(caseRow);
    }

    if (sourceFlow === "TRIAGE") {
      const sourceAddress = normalizeComparableText(source.source_address);
      const sourceDate = normalizeDateKey(source.source_aware_date);
      for (const caseRow of caseRows) {
        const targetAddress = normalizeComparableText(caseRow.address);
        const targetDate = normalizeDateKey(caseRow.aware_date);
        if (source.source_case_uid !== caseRow.case_uid && (!sourceAddress || !targetAddress || !sourceDate || !targetDate)) {
          await client.query("ROLLBACK");
          return NextResponse.json({ message: "現場住所または覚知日が未設定のTRIAGE本部報告は複数EMS送信できません。" }, { status: 400 });
        }
        if ((sourceAddress && targetAddress && sourceAddress !== targetAddress) || (sourceDate && targetDate && sourceDate !== targetDate)) {
          await client.query("ROLLBACK");
          return NextResponse.json({ message: "同一現場・同一覚知日のTRIAGE本部報告にのみ送信できます。" }, { status: 400 });
        }
      }
    }

    const caseUids = caseRows.map((row) => row.case_uid);
    const casesNeedingAssignment = caseRows.filter((row) => readDispatchAssignmentSource(row.case_payload) !== String(sourceTargetId));
    const assignedCount = await countAssignmentsForSource(client, {
      sourceTargetId,
      mode: user.currentMode,
      excludingCaseUids: caseUids,
    });
    if (source.accepted_capacity != null && assignedCount + casesNeedingAssignment.length > source.accepted_capacity) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { message: `受入可能人数 ${source.accepted_capacity}名を超えてEMSへ送信できません。` },
        { status: 409 },
      );
    }

    const assignments = [];
    for (const caseRow of caseRows) {
      assignments.push(await assignCaseToSource(client, {
        caseRow,
        source,
        sourceTargetId,
        sourceFlow,
        actorId: user.id,
        actorUsername: user.username,
      }));
    }

    await client.query("COMMIT");
    return NextResponse.json({ ok: true, assignments });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("PATCH /api/dispatch/cases/[caseId]/assignment failed", error);
    return NextResponse.json({ message: "EMSへの受入可能病院送信に失敗しました。" }, { status: 500 });
  } finally {
    client.release();
  }
}
