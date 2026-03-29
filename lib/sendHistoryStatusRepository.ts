import type { PoolClient } from "pg";

import type { AuthenticatedUser } from "@/lib/authContext";
import { ensureAuditLogSchema } from "@/lib/auditLog";
import { db } from "@/lib/db";
import {
  formatDecisionReasonNote,
  isHospitalNotAcceptableReasonCode,
  isTransportDeclinedReasonCode,
  normalizeDecisionReasonText,
  requiresDecisionReasonText,
  type DecisionReasonCode,
} from "@/lib/decisionReasons";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import {
  canTransition,
  getStatusLabel,
  isHospitalRequestStatus,
  type HospitalRequestStatus,
} from "@/lib/hospitalRequestStatus";
import { createNotification } from "@/lib/notifications";

type TargetRow = {
  id: number;
  status: string;
  hospital_id: number;
  hospital_request_id: number;
  case_id: string;
  case_uid: string;
  from_team_id: number | null;
  case_team_id: number | null;
};

type RelatedTargetRow = {
  id: number;
  status: string;
  hospital_id: number;
};

type RequestRow = {
  request_id: string;
};

type DecisionReasonPayload = {
  reasonCode?: string | null;
  reasonText?: string | null;
};

type ValidatedReason = {
  reasonCode: DecisionReasonCode;
  reasonText: string | null;
};

async function createAuditLog(
  client: PoolClient,
  actor: AuthenticatedUser,
  targetId: number,
  beforeStatus: HospitalRequestStatus,
  afterStatus: HospitalRequestStatus,
  note?: string | null,
  reason?: ValidatedReason | null,
) {
  await client.query(
    `
      INSERT INTO audit_logs (
        actor_user_id,
        actor_role,
        action,
        target_type,
        target_id,
        before_json,
        after_json
      ) VALUES ($1, $2, $3, 'hospital_request_target', $4, $5::jsonb, $6::jsonb)
    `,
    [
      actor.id,
      actor.role,
      "cases.sendHistory.status.update",
      String(targetId),
      JSON.stringify({ status: beforeStatus, statusLabel: getStatusLabel(beforeStatus) }),
      JSON.stringify({
        status: afterStatus,
        statusLabel: getStatusLabel(afterStatus),
        note: note ?? null,
        reasonCode: reason?.reasonCode ?? null,
        reasonText: reason?.reasonText ?? null,
      }),
    ],
  );
}

async function createHospitalDecisionNotification(
  client: PoolClient,
  input: {
    hospitalId: number;
    caseId: string;
    caseUid: string;
    targetId: number;
    nextStatus: "TRANSPORT_DECIDED" | "TRANSPORT_DECLINED";
  },
) {
  await createNotification(
    {
      audienceRole: "HOSPITAL",
      hospitalId: input.hospitalId,
      kind: input.nextStatus === "TRANSPORT_DECIDED" ? "transport_decided" : "transport_declined",
      caseId: input.caseId,
      caseUid: input.caseUid,
      targetId: input.targetId,
      title: input.nextStatus === "TRANSPORT_DECIDED" ? "\u642c\u9001\u6c7a\u5b9a" : "\u642c\u9001\u8f9e\u9000",
      body:
        input.nextStatus === "TRANSPORT_DECIDED"
          ? `\u4e8b\u6848 ${input.caseId} \u306e\u642c\u9001\u5148\u304c\u6c7a\u5b9a\u3057\u307e\u3057\u305f\u3002`
          : `\u4e8b\u6848 ${input.caseId} \u3078\u306e\u642c\u9001\u304c\u8f9e\u9000\u3055\u308c\u307e\u3057\u305f\u3002`,
      menuKey: input.nextStatus === "TRANSPORT_DECIDED" ? "hospitals-patients" : "hospitals-declined",
    },
    client,
  );
}

function validateReason(nextStatus: HospitalRequestStatus, payload: DecisionReasonPayload): { ok: true; value: ValidatedReason | null } | { ok: false; message: string } {
  const reasonText = normalizeDecisionReasonText(payload.reasonText);

  if (nextStatus === "NOT_ACCEPTABLE") {
    if (!isHospitalNotAcceptableReasonCode(payload.reasonCode)) {
      return { ok: false, message: "\u53d7\u5165\u4e0d\u53ef\u7406\u7531\u3092\u9078\u629e\u3057\u3066\u304f\u3060\u3055\u3044\u3002" };
    }
    if (requiresDecisionReasonText(payload.reasonCode) && !reasonText) {
      return { ok: false, message: "\u9078\u629e\u3057\u305f\u53d7\u5165\u4e0d\u53ef\u7406\u7531\u306b\u306f\u88dc\u8db3\u5185\u5bb9\u306e\u5165\u529b\u304c\u5fc5\u8981\u3067\u3059\u3002" };
    }
    return { ok: true, value: { reasonCode: payload.reasonCode, reasonText } };
  }

  if (nextStatus === "TRANSPORT_DECLINED") {
    if (!isTransportDeclinedReasonCode(payload.reasonCode)) {
      return { ok: false, message: "\u642c\u9001\u8f9e\u9000\u7406\u7531\u3092\u9078\u629e\u3057\u3066\u304f\u3060\u3055\u3044\u3002" };
    }
    return { ok: true, value: { reasonCode: payload.reasonCode, reasonText } };
  }

  return { ok: true, value: null };
}

async function insertHospitalRequestEvent(
  client: PoolClient,
  input: {
    targetId: number;
    eventType: string;
    fromStatus: HospitalRequestStatus;
    toStatus: HospitalRequestStatus;
    actedByUserId: number;
    note?: string | null;
    reason?: ValidatedReason | null;
  },
) {
  await client.query(
    `
      INSERT INTO hospital_request_events (
        target_id,
        event_type,
        from_status,
        to_status,
        acted_by_user_id,
        note,
        reason_code,
        reason_text,
        acted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `,
    [
      input.targetId,
      input.eventType,
      input.fromStatus,
      input.toStatus,
      input.actedByUserId,
      input.note ?? null,
      input.reason?.reasonCode ?? null,
      input.reason?.reasonText ?? null,
    ],
  );
}

export async function updateSendHistoryStatus(input: {
  targetId: number;
  nextStatus: HospitalRequestStatus;
  actor: AuthenticatedUser;
  note?: string | null;
  reasonCode?: string | null;
  reasonText?: string | null;
}) {
  await ensureHospitalRequestTables();
  await ensureAuditLogSchema();

  const targetRes = await db.query<TargetRow>(
    `
      SELECT
        t.id,
        t.status,
        t.hospital_id,
        t.hospital_request_id,
        r.case_id,
        r.case_uid,
        r.from_team_id,
        c.team_id AS case_team_id
      FROM hospital_request_targets t
      JOIN hospital_requests r ON r.id = t.hospital_request_id
      JOIN cases c ON c.case_uid = r.case_uid
      WHERE t.id = $1
      LIMIT 1
    `,
    [input.targetId],
  );
  const target = targetRes.rows[0];
  if (!target) {
    return { ok: false as const, status: 404, message: "Not found" };
  }

  if (!isHospitalRequestStatus(target.status)) {
    return { ok: false as const, status: 409, message: "Invalid current status" };
  }

  if (input.actor.role === "HOSPITAL") {
    if (!input.actor.hospitalId || target.hospital_id !== input.actor.hospitalId) {
      return { ok: false as const, status: 403, message: "Forbidden" };
    }
    if (!canTransition(target.status, input.nextStatus, "HOSPITAL")) {
      return { ok: false as const, status: 400, message: "Transition not allowed" };
    }
    if (input.nextStatus === "NEGOTIATING" && !String(input.note ?? "").trim()) {
      return { ok: false as const, status: 400, message: "Consult note is required." };
    }
  } else if (input.actor.role === "EMS") {
    if (
      !input.actor.teamId
      || !target.from_team_id
      || input.actor.teamId !== target.from_team_id
      || (target.case_team_id != null && input.actor.teamId !== target.case_team_id)
    ) {
      return { ok: false as const, status: 403, message: "\u81ea\u968a\u306e\u9001\u4fe1\u5c65\u6b74\u306e\u307f\u66f4\u65b0\u3067\u304d\u307e\u3059\u3002" };
    }
    if (!canTransition(target.status, input.nextStatus, "EMS")) {
      return { ok: false as const, status: 400, message: "Transition not allowed" };
    }
  } else {
    return { ok: false as const, status: 403, message: "Forbidden" };
  }

  const reasonValidation = validateReason(input.nextStatus, {
    reasonCode: input.reasonCode ?? null,
    reasonText: input.reasonText ?? null,
  });
  if (!reasonValidation.ok) {
    return { ok: false as const, status: 400, message: reasonValidation.message };
  }
  const validatedReason = reasonValidation.value;

  const requestRes = await db.query<RequestRow>(
    `
      SELECT request_id
      FROM hospital_requests
      WHERE id = $1
      LIMIT 1
    `,
    [target.hospital_request_id],
  );
  const requestRow = requestRes.rows[0];
  if (!requestRow) {
    return { ok: false as const, status: 404, message: "Not found" };
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    if (input.actor.role === "HOSPITAL") {
      await client.query(
        `
          UPDATE hospital_request_targets
          SET status = $2,
              responded_at = CASE
                WHEN $2 IN ('NEGOTIATING', 'ACCEPTABLE', 'NOT_ACCEPTABLE') THEN NOW()
                ELSE responded_at
              END,
              updated_by_user_id = $3,
              updated_at = NOW()
          WHERE id = $1
        `,
        [input.targetId, input.nextStatus, input.actor.id],
      );

      await insertHospitalRequestEvent(client, {
        targetId: input.targetId,
        eventType: "hospital_response",
        fromStatus: target.status,
        toStatus: input.nextStatus,
        actedByUserId: input.actor.id,
        note: input.note ?? null,
        reason: validatedReason,
      });

      if (input.nextStatus === "NOT_ACCEPTABLE") {
        await client.query(`DELETE FROM hospital_patients WHERE target_id = $1`, [input.targetId]);
      }

      if (target.from_team_id) {
        await createNotification(
          {
            audienceRole: "EMS",
            teamId: target.from_team_id,
            kind: input.nextStatus === "NEGOTIATING" ? "consult_status_changed" : "hospital_status_changed",
            caseId: target.case_id,
            caseUid: target.case_uid,
            targetId: target.id,
            title: input.nextStatus === "NEGOTIATING" ? "\u76f8\u8ac7\u5bfe\u5fdc\u3042\u308a" : "\u75c5\u9662\u5fdc\u7b54\u3042\u308a",
            body:
              input.nextStatus === "NEGOTIATING"
                ? `\u4e8b\u6848 ${target.case_id} \u306b\u75c5\u9662\u304b\u3089\u76f8\u8ac7\u30b3\u30e1\u30f3\u30c8\u304c\u5c4a\u304d\u307e\u3057\u305f\u3002`
                : `\u4e8b\u6848 ${target.case_id} \u306e\u75c5\u9662\u5fdc\u7b54\u30b9\u30c6\u30fc\u30bf\u30b9\u304c\u66f4\u65b0\u3055\u308c\u307e\u3057\u305f\u3002`,
            menuKey: "cases-list",
            tabKey: input.nextStatus === "NEGOTIATING" ? "consults" : "selection-history",
          },
          client,
        );
      }
    } else {
      await client.query(
        `
          UPDATE hospital_request_targets
          SET status = $2,
              decided_at = NOW(),
              updated_by_user_id = $3,
              updated_at = NOW()
          WHERE id = $1
        `,
        [input.targetId, input.nextStatus, input.actor.id],
      );

      await insertHospitalRequestEvent(client, {
        targetId: input.targetId,
        eventType: "paramedic_decision",
        fromStatus: target.status,
        toStatus: input.nextStatus,
        actedByUserId: input.actor.id,
        note: input.note ?? null,
        reason: validatedReason,
      });

      if (input.nextStatus === "TRANSPORT_DECIDED") {
        await client.query(
          `
            INSERT INTO hospital_patients (
              target_id,
              hospital_id,
              case_id,
              case_uid,
              request_id,
              status,
              updated_at
            ) VALUES ($1, $2, $3, $4, $5, 'TRANSPORT_DECIDED', NOW())
            ON CONFLICT (target_id)
            DO UPDATE SET
              case_id = EXCLUDED.case_id,
              case_uid = EXCLUDED.case_uid,
              request_id = EXCLUDED.request_id,
              status = EXCLUDED.status,
              updated_at = NOW()
          `,
          [input.targetId, target.hospital_id, target.case_id, target.case_uid, requestRow.request_id],
        );
      }

      await createHospitalDecisionNotification(client, {
        hospitalId: target.hospital_id,
        caseId: target.case_id,
        caseUid: target.case_uid,
        targetId: target.id,
        nextStatus: input.nextStatus as "TRANSPORT_DECIDED" | "TRANSPORT_DECLINED",
      });

      if (input.nextStatus === "TRANSPORT_DECIDED") {
        const autoDeclineReason: ValidatedReason = {
          reasonCode: "TRANSFERRED_TO_OTHER_HOSPITAL",
          reasonText: null,
        };

        const relatedTargetsRes = await client.query<RelatedTargetRow>(
          `
            SELECT
              t.id,
              t.status,
              t.hospital_id
            FROM hospital_request_targets t
            JOIN hospital_requests r ON r.id = t.hospital_request_id
            WHERE r.case_uid = $1
              AND t.id <> $2
              AND t.status NOT IN ('TRANSPORT_DECLINED', 'TRANSPORT_DECIDED')
          `,
          [target.case_uid, target.id],
        );

        for (const relatedTarget of relatedTargetsRes.rows) {
          if (!isHospitalRequestStatus(relatedTarget.status)) continue;

          await client.query(
            `
              UPDATE hospital_request_targets
              SET status = 'TRANSPORT_DECLINED',
                  decided_at = COALESCE(decided_at, NOW()),
                  updated_by_user_id = $2,
                  updated_at = NOW()
              WHERE id = $1
            `,
            [relatedTarget.id, input.actor.id],
          );

          await insertHospitalRequestEvent(client, {
            targetId: relatedTarget.id,
            eventType: "paramedic_decision",
            fromStatus: relatedTarget.status,
            toStatus: "TRANSPORT_DECLINED",
            actedByUserId: input.actor.id,
            note: null,
            reason: autoDeclineReason,
          });

          await client.query(`DELETE FROM hospital_patients WHERE target_id = $1`, [relatedTarget.id]);

          await createHospitalDecisionNotification(client, {
            hospitalId: relatedTarget.hospital_id,
            caseId: target.case_id,
            caseUid: target.case_uid,
            targetId: relatedTarget.id,
            nextStatus: "TRANSPORT_DECLINED",
          });

          await createAuditLog(
            client,
            input.actor,
            relatedTarget.id,
            relatedTarget.status,
            "TRANSPORT_DECLINED",
            formatDecisionReasonNote(autoDeclineReason),
            autoDeclineReason,
          );
        }
      }
    }

    await createAuditLog(
      client,
      input.actor,
      input.targetId,
      target.status,
      input.nextStatus,
      validatedReason ? formatDecisionReasonNote(validatedReason) : input.note,
      validatedReason,
    );
    await client.query("COMMIT");

    return {
      ok: true as const,
      status: input.nextStatus,
      statusLabel: getStatusLabel(input.nextStatus),
      targetId: input.targetId,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
