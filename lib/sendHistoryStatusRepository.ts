import type { PoolClient } from "pg";

import type { AuthenticatedUser } from "@/lib/authContext";
import { db } from "@/lib/db";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import {
  canTransition,
  getStatusLabel,
  isHospitalRequestStatus,
  type HospitalRequestStatus,
} from "@/lib/hospitalRequestStatus";
import { createNotification } from "@/lib/notifications";
import { ensureAuditLogSchema } from "@/lib/auditLog";

type TargetRow = {
  id: number;
  status: string;
  hospital_id: number;
  hospital_request_id: number;
  case_id: string;
  from_team_id: number | null;
};

type RequestRow = {
  request_id: string;
};

async function createAuditLog(
  client: PoolClient,
  actor: AuthenticatedUser,
  targetId: number,
  beforeStatus: HospitalRequestStatus,
  afterStatus: HospitalRequestStatus,
  note?: string | null,
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
      JSON.stringify({ status: afterStatus, statusLabel: getStatusLabel(afterStatus), note: note ?? null }),
    ],
  );
}

export async function updateSendHistoryStatus(input: {
  targetId: number;
  nextStatus: HospitalRequestStatus;
  actor: AuthenticatedUser;
  note?: string | null;
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
        r.from_team_id
      FROM hospital_request_targets t
      JOIN hospital_requests r ON r.id = t.hospital_request_id
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
    if (!canTransition(target.status, input.nextStatus, "EMS")) {
      return { ok: false as const, status: 400, message: "Transition not allowed" };
    }
  } else {
    return { ok: false as const, status: 403, message: "Forbidden" };
  }

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
          ) VALUES ($1, 'hospital_response', $2, $3, $4, $5, NOW())
        `,
        [input.targetId, target.status, input.nextStatus, input.actor.id, input.note ?? null],
      );

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
            targetId: target.id,
            title: input.nextStatus === "NEGOTIATING" ? "要相談ステータス通知" : "病院ステータス更新通知",
            body:
              input.nextStatus === "NEGOTIATING"
                ? `事案 ${target.case_id} が要相談になりました。`
                : `事案 ${target.case_id} の病院ステータスが更新されました。`,
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
          ) VALUES ($1, 'paramedic_decision', $2, $3, $4, $5, NOW())
        `,
        [input.targetId, target.status, input.nextStatus, input.actor.id, input.note ?? null],
      );

      if (input.nextStatus === "TRANSPORT_DECIDED") {
        await client.query(
          `
            INSERT INTO hospital_patients (
              target_id,
              hospital_id,
              case_id,
              request_id,
              status,
              updated_at
            ) VALUES ($1, $2, $3, $4, 'TRANSPORT_DECIDED', NOW())
            ON CONFLICT (target_id)
            DO UPDATE SET
              status = EXCLUDED.status,
              updated_at = NOW()
          `,
          [input.targetId, target.hospital_id, target.case_id, requestRow.request_id],
        );
      }

      await createNotification(
        {
          audienceRole: "HOSPITAL",
          hospitalId: target.hospital_id,
          kind: input.nextStatus === "TRANSPORT_DECIDED" ? "transport_decided" : "transport_declined",
          caseId: target.case_id,
          targetId: target.id,
          title: input.nextStatus === "TRANSPORT_DECIDED" ? "搬送決定通知" : "搬送辞退通知",
          body:
            input.nextStatus === "TRANSPORT_DECIDED"
              ? `事案 ${target.case_id} が搬送決定になりました。`
              : `事案 ${target.case_id} が搬送辞退になりました。`,
          menuKey: input.nextStatus === "TRANSPORT_DECIDED" ? "hospitals-patients" : "hospitals-declined",
        },
        client,
      );
    }

    await createAuditLog(client, input.actor, input.targetId, target.status, input.nextStatus, input.note);
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
