import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authContext";
import { authorizeCaseEditAccess, resolveCaseByAnyId } from "@/lib/caseAccess";
import { pickPatientSummaryFromCasePayload } from "@/lib/casePatientSummary";
import { ensureCasesColumns } from "@/lib/casesSchema";
import { getCriticalCareDispatchDepartments } from "@/lib/criticalCareSelection";
import { db } from "@/lib/db";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import { consumeRateLimit } from "@/lib/rateLimit";
import { recordApiFailureEvent } from "@/lib/systemMonitor";

type RequestHospital = {
  hospitalId?: unknown;
  hospitalName?: unknown;
  departments?: unknown;
  distanceKm?: unknown;
};

type DispatchSelectionItem = {
  requestId?: unknown;
  sentAt?: unknown;
  selectedDepartments?: unknown;
  searchMode?: unknown;
  hospitals?: unknown;
  patientSummary?: unknown;
};

type PostBody = {
  caseRef?: unknown;
  caseId?: unknown;
  item?: DispatchSelectionItem;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => String(item).trim()).filter(Boolean)));
}

function normalizeHospitals(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is RequestHospital => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    .map((hospital) => ({
      hospitalId: Number(hospital.hospitalId),
      hospitalName: String(hospital.hospitalName ?? "").trim(),
      departments: asStringArray(hospital.departments),
      distanceKm: Number.isFinite(Number(hospital.distanceKm)) ? Number(hospital.distanceKm) : null,
    }))
    .filter((hospital) => hospital.hospitalName || Number.isFinite(hospital.hospitalId));
}

function normalizeSentAt(value: unknown) {
  const date = new Date(typeof value === "string" ? value : "");
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function createFallbackRequestId(caseUid: string) {
  return `dispatch-selection-${caseUid}-${Date.now()}`;
}

export async function POST(req: Request) {
  try {
    await Promise.all([ensureCasesColumns(), ensureHospitalRequestTables()]);

    const user = await getAuthenticatedUser();
    const body = ((await req.json().catch(() => ({}))) ?? {}) as PostBody;
    const caseRef = String(body.caseRef ?? body.caseId ?? "").trim();
    const item = body.item ?? {};
    if (!caseRef) {
      return NextResponse.json({ message: "caseRef is required. caseId is accepted for backward compatibility." }, { status: 400 });
    }

    const access = await authorizeCaseEditAccess(user, caseRef);
    if (!access.ok) {
      return NextResponse.json({ message: access.message }, { status: access.status });
    }
    const actor = user!;
    const rateLimit = await consumeRateLimit({
      policyName: "critical_update",
      routeKey: "api.cases.dispatch-selection-requests.post",
      request: req,
      user: actor,
    });
    if (!rateLimit.ok) {
      return NextResponse.json(
        { message: `本部選定依頼の送信上限に達しました。${rateLimit.retryAfterSeconds} 秒後に再試行してください。` },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

    const resolvedCase = await resolveCaseByAnyId(access.context.caseUid);
    if (!resolvedCase) {
      return NextResponse.json({ message: "対象事案が見つかりません。" }, { status: 404 });
    }
    if (resolvedCase.mode !== actor.currentMode) {
      return NextResponse.json({ message: "対象事案が見つかりません。" }, { status: 404 });
    }

    const selectedDepartments = asStringArray(item.selectedDepartments);
    const criticalDepartments = getCriticalCareDispatchDepartments(selectedDepartments);
    if (criticalDepartments.length === 0) {
      return NextResponse.json({ message: "救命またはCCUの選定科目を含む場合のみ本部選定依頼を送信できます。" }, { status: 400 });
    }

    const prevPayload = asObject(resolvedCase.casePayload);
    const prevSummary = asObject(prevPayload.summary);
    const patientSummary = {
      ...pickPatientSummaryFromCasePayload(prevPayload),
      ...asObject(item.patientSummary),
      operationalMode: "STANDARD",
      dispatchManaged: true,
      dispatchSelectionManaged: true,
      dispatchSelectionType: "CRITICAL_CARE",
      dispatchSelectionStatus: "REQUESTED",
      requestedDepartments: selectedDepartments,
      criticalDepartments,
    };
    const sentAt = normalizeSentAt(item.sentAt);
    const requestId = String(item.requestId ?? "").trim() || createFallbackRequestId(resolvedCase.caseUid);
    const requestedHospitals = normalizeHospitals(item.hospitals);
    const dispatchSelectionRequest = {
      requestId,
      status: "REQUESTED",
      flow: "CRITICAL_CARE",
      selectedDepartments,
      criticalDepartments,
      searchMode: typeof item.searchMode === "string" ? item.searchMode : null,
      requestedHospitals,
      requestedAt: sentAt,
      requestedByTeamId: actor.teamId ?? null,
      requestedByUserId: actor.id,
    };
    const nextPayload = {
      ...prevPayload,
      summary: {
        ...prevSummary,
        dispatchSelectionRequest,
      },
    };

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      await client.query(
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
            case_id = EXCLUDED.case_id,
            case_uid = EXCLUDED.case_uid,
            mode = EXCLUDED.mode,
            patient_summary = EXCLUDED.patient_summary,
            from_team_id = EXCLUDED.from_team_id,
            created_by_user_id = EXCLUDED.created_by_user_id,
            sent_at = EXCLUDED.sent_at,
            updated_at = NOW()
        `,
        [
          requestId,
          resolvedCase.caseId,
          resolvedCase.caseUid,
          resolvedCase.mode,
          JSON.stringify(patientSummary),
          actor.teamId ?? resolvedCase.caseTeamId,
          actor.id,
          sentAt,
        ],
      );

      await client.query(
        `
          UPDATE cases
          SET case_payload = $2::jsonb,
              updated_at = NOW()
          WHERE case_uid = $1
        `,
        [resolvedCase.caseUid, JSON.stringify(nextPayload)],
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }

    return NextResponse.json({ ok: true, requestId, dispatchManaged: true });
  } catch (error) {
    console.error("POST /api/cases/dispatch-selection-requests failed", error);
    await recordApiFailureEvent("api.cases.dispatch-selection-requests.post", error);
    return NextResponse.json({ message: "本部選定依頼の送信に失敗しました。" }, { status: 500 });
  }
}
