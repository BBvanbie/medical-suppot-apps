import type { AuthenticatedUser } from "@/lib/authContext";
import { db } from "@/lib/db";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import { ensureSystemMonitorSchema, recordSecuritySignalEvent } from "@/lib/systemMonitor";

const WINDOW_MINUTES = 15;
const BULK_SEND_REQUEST_THRESHOLD = 10;
const BULK_SEND_TARGET_THRESHOLD = 50;
const STATUS_UPDATE_THRESHOLD = 30;

async function hasRecentSignal(input: { source: string; signalType: string; userId: number }) {
  await ensureSystemMonitorSchema();
  const result = await db.query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM system_monitor_events
        WHERE category = 'security_signal'
          AND source = $1
          AND metadata_json ->> 'signalType' = $2
          AND metadata_json ->> 'userId' = $3
          AND created_at >= NOW() - ($4::text || ' minutes')::interval
      ) AS exists
    `,
    [input.source, input.signalType, String(input.userId), String(WINDOW_MINUTES)],
  );
  return Boolean(result.rows[0]?.exists);
}

export async function recordBulkHospitalRequestSendSignal(actor: AuthenticatedUser) {
  if (actor.role !== "EMS" && actor.role !== "DISPATCH" && actor.role !== "ADMIN") return;

  await ensureHospitalRequestTables();
  const result = await db.query<{ request_count: string; target_count: string }>(
    `
      SELECT
        COUNT(DISTINCT r.id)::text AS request_count,
        COUNT(t.id)::text AS target_count
      FROM hospital_requests r
      LEFT JOIN hospital_request_targets t ON t.hospital_request_id = r.id
      WHERE r.created_by_user_id = $1
        AND r.created_at >= NOW() - ($2::text || ' minutes')::interval
    `,
    [actor.id, String(WINDOW_MINUTES)],
  );

  const row = result.rows[0];
  const requestCount = Number(row?.request_count ?? "0");
  const targetCount = Number(row?.target_count ?? "0");
  if (requestCount < BULK_SEND_REQUEST_THRESHOLD && targetCount < BULK_SEND_TARGET_THRESHOLD) return;

  const signalType = "bulk_hospital_request_send";
  const source = "operations.bulk-send";
  if (await hasRecentSignal({ source, signalType, userId: actor.id })) return;

  await recordSecuritySignalEvent({
    source,
    message: "短時間に多数の受入要請送信を検知しました。",
    severity: "warning",
    metadata: {
      signalType,
      userId: actor.id,
      role: actor.role,
      teamId: actor.teamId,
      hospitalId: actor.hospitalId,
      requestCount,
      targetCount,
      windowMinutes: WINDOW_MINUTES,
      requestThreshold: BULK_SEND_REQUEST_THRESHOLD,
      targetThreshold: BULK_SEND_TARGET_THRESHOLD,
    },
  });
}

export async function recordBulkStatusUpdateSignal(actor: AuthenticatedUser) {
  if (actor.role !== "EMS" && actor.role !== "HOSPITAL") return;

  await ensureHospitalRequestTables();
  const result = await db.query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM hospital_request_events
      WHERE acted_by_user_id = $1
        AND event_type IN ('hospital_response', 'paramedic_decision', 'paramedic_consult_reply')
        AND acted_at >= NOW() - ($2::text || ' minutes')::interval
    `,
    [actor.id, String(WINDOW_MINUTES)],
  );

  const updateCount = Number(result.rows[0]?.count ?? "0");
  if (updateCount < STATUS_UPDATE_THRESHOLD) return;

  const signalType = "bulk_status_update";
  const source = "operations.status-update";
  if (await hasRecentSignal({ source, signalType, userId: actor.id })) return;

  await recordSecuritySignalEvent({
    source,
    message: "短時間に多数の受入要請ステータス更新を検知しました。",
    severity: "warning",
    metadata: {
      signalType,
      userId: actor.id,
      role: actor.role,
      teamId: actor.teamId,
      hospitalId: actor.hospitalId,
      updateCount,
      windowMinutes: WINDOW_MINUTES,
      updateThreshold: STATUS_UPDATE_THRESHOLD,
    },
  });
}
