import { db } from "@/lib/db";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";

export type HospitalHomeMetrics = {
  totalRequests: number;
  acceptableCount: number;
  notAcceptableCount: number;
  pendingCount: number;
  transportDecidedCount: number;
  averageResponseMinutes: number | null;
};

type MetricsRow = {
  total_requests: number;
  acceptable_count: number;
  not_acceptable_count: number;
  pending_count: number;
  transport_decided_count: number;
  average_response_minutes: number | null;
};

export async function getHospitalHomeMetrics(hospitalId: number): Promise<HospitalHomeMetrics> {
  await ensureHospitalRequestTables();

  const result = await db.query<MetricsRow>(
    `
      SELECT
        COUNT(*)::int AS total_requests,
        COUNT(*) FILTER (WHERE latest_response.to_status = 'ACCEPTABLE')::int AS acceptable_count,
        COUNT(*) FILTER (WHERE latest_response.to_status = 'NOT_ACCEPTABLE')::int AS not_acceptable_count,
        COUNT(*) FILTER (
          WHERE latest_response.to_status IS NULL OR latest_response.to_status = 'NEGOTIATING'
        )::int AS pending_count,
        COUNT(*) FILTER (WHERE t.status = 'TRANSPORT_DECIDED')::int AS transport_decided_count,
        AVG(EXTRACT(EPOCH FROM (t.responded_at - r.sent_at)) / 60.0) AS average_response_minutes
      FROM hospital_request_targets t
      JOIN hospital_requests r ON r.id = t.hospital_request_id
      LEFT JOIN LATERAL (
        SELECT e.to_status
        FROM hospital_request_events e
        WHERE e.target_id = t.id
          AND e.event_type = 'hospital_response'
        ORDER BY e.acted_at DESC, e.id DESC
        LIMIT 1
      ) latest_response ON TRUE
      WHERE t.hospital_id = $1
    `,
    [hospitalId],
  );

  const row = result.rows[0];
  return {
    totalRequests: row?.total_requests ?? 0,
    acceptableCount: row?.acceptable_count ?? 0,
    notAcceptableCount: row?.not_acceptable_count ?? 0,
    pendingCount: row?.pending_count ?? 0,
    transportDecidedCount: row?.transport_decided_count ?? 0,
    averageResponseMinutes:
      row?.average_response_minutes == null ? null : Number(row.average_response_minutes),
  };
}
