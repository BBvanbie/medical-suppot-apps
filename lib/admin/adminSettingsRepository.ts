import { db } from "@/lib/db";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import { getAdminMonitoringData } from "@/lib/admin/adminMonitoringRepository";
import { ensureSystemMonitorSchema } from "@/lib/systemMonitor";

export type AdminSystemSettingsSummary = Awaited<ReturnType<typeof getAdminMonitoringData>>;

export type AdminNotificationSettingsSummary = {
  totalCount: number;
  liveCount: number;
  trainingCount: number;
  unreadCount: number;
  emsAudienceCount: number;
  hospitalAudienceCount: number;
  targetedCount: number;
  notificationFailures24h: number;
  topKinds: Array<{ kind: string; total: number }>;
  topFailureSources: Array<{ source: string; total: number }>;
};

export type AdminMasterSettingsSummary = {
  hospitalCount: number;
  teamCount: number;
  departmentCount: number;
  hospitalDepartmentCount: number;
  departmentAvailabilityCount: number;
};

export async function getAdminSystemSettingsSummary(): Promise<AdminSystemSettingsSummary> {
  return getAdminMonitoringData();
}

export async function getAdminNotificationSettingsSummary(): Promise<AdminNotificationSettingsSummary> {
  await ensureHospitalRequestTables();
  await ensureSystemMonitorSchema();

  const [countsRes, topKindsRes, topFailureSourcesRes] = await Promise.all([
    db.query<{
      total_count: string;
      live_count: string;
      training_count: string;
      unread_count: string;
      ems_audience_count: string;
      hospital_audience_count: string;
      targeted_count: string;
      notification_failures_24h: string;
    }>(
      `
        SELECT
          COUNT(*)::text AS total_count,
          COUNT(*) FILTER (WHERE mode = 'LIVE')::text AS live_count,
          COUNT(*) FILTER (WHERE mode = 'TRAINING')::text AS training_count,
          COUNT(*) FILTER (WHERE is_read = FALSE)::text AS unread_count,
          COUNT(*) FILTER (WHERE audience_role = 'EMS')::text AS ems_audience_count,
          COUNT(*) FILTER (WHERE audience_role = 'HOSPITAL')::text AS hospital_audience_count,
          COUNT(*) FILTER (WHERE target_user_id IS NOT NULL)::text AS targeted_count,
          (
            SELECT COUNT(*)::text
            FROM system_monitor_events
            WHERE category = 'notification_failure'
              AND created_at >= NOW() - INTERVAL '24 hours'
          ) AS notification_failures_24h
        FROM notifications
      `,
    ),
    db.query<{ kind: string; total: string }>(
      `
        SELECT kind, COUNT(*)::text AS total
        FROM notifications
        GROUP BY kind
        ORDER BY COUNT(*) DESC, kind ASC
        LIMIT 5
      `,
    ),
    db.query<{ source: string; total: string }>(
      `
        SELECT source, COUNT(*)::text AS total
        FROM system_monitor_events
        WHERE category = 'notification_failure'
          AND created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY source
        ORDER BY COUNT(*) DESC, source ASC
        LIMIT 5
      `,
    ),
  ]);

  const counts = countsRes.rows[0];

  return {
    totalCount: Number(counts?.total_count ?? "0"),
    liveCount: Number(counts?.live_count ?? "0"),
    trainingCount: Number(counts?.training_count ?? "0"),
    unreadCount: Number(counts?.unread_count ?? "0"),
    emsAudienceCount: Number(counts?.ems_audience_count ?? "0"),
    hospitalAudienceCount: Number(counts?.hospital_audience_count ?? "0"),
    targetedCount: Number(counts?.targeted_count ?? "0"),
    notificationFailures24h: Number(counts?.notification_failures_24h ?? "0"),
    topKinds: topKindsRes.rows.map((row) => ({ kind: row.kind, total: Number(row.total) })),
    topFailureSources: topFailureSourcesRes.rows.map((row) => ({ source: row.source, total: Number(row.total) })),
  };
}

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db.query<{ exists: string | null }>(
    `SELECT to_regclass($1) AS exists`,
    [tableName],
  );
  return Boolean(result.rows[0]?.exists);
}

async function countRowsIfTableExists(tableName: string): Promise<number> {
  if (!(await tableExists(tableName))) return 0;
  const result = await db.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ${tableName}`);
  return Number(result.rows[0]?.count ?? "0");
}

export async function getAdminMasterSettingsSummary(): Promise<AdminMasterSettingsSummary> {
  const [hospitalCount, teamCount, departmentCount, hospitalDepartmentCount, departmentAvailabilityCount] = await Promise.all([
    countRowsIfTableExists("hospitals"),
    countRowsIfTableExists("emergency_teams"),
    countRowsIfTableExists("medical_departments"),
    countRowsIfTableExists("hospital_departments"),
    countRowsIfTableExists("hospital_department_availability"),
  ]);

  return {
    hospitalCount,
    teamCount,
    departmentCount,
    hospitalDepartmentCount,
    departmentAvailabilityCount,
  };
}
