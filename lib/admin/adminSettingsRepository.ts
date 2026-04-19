import { db } from "@/lib/db";
import { getAdminMonitoringData } from "@/lib/admin/adminMonitoringRepository";
import { columnExists, tableExists } from "@/lib/dbIntrospection";

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
  const [
    notificationsExists,
    monitorEventsExists,
    notificationModeExists,
    notificationIsReadExists,
    notificationAudienceRoleExists,
    notificationTargetUserExists,
    notificationKindExists,
  ] = await Promise.all([
    tableExists("notifications"),
    tableExists("system_monitor_events"),
    columnExists("notifications", "mode"),
    columnExists("notifications", "is_read"),
    columnExists("notifications", "audience_role"),
    columnExists("notifications", "target_user_id"),
    columnExists("notifications", "kind"),
  ]);

  const [countsRes, topKindsRes, topFailureSourcesRes] = await Promise.all([
    notificationsExists
      ? db.query<{
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
              ${notificationModeExists ? "COUNT(*) FILTER (WHERE mode = 'LIVE')::text" : "'0'::text"} AS live_count,
              ${notificationModeExists ? "COUNT(*) FILTER (WHERE mode = 'TRAINING')::text" : "'0'::text"} AS training_count,
              ${notificationIsReadExists ? "COUNT(*) FILTER (WHERE is_read = FALSE)::text" : "'0'::text"} AS unread_count,
              ${notificationAudienceRoleExists ? "COUNT(*) FILTER (WHERE audience_role = 'EMS')::text" : "'0'::text"} AS ems_audience_count,
              ${notificationAudienceRoleExists ? "COUNT(*) FILTER (WHERE audience_role = 'HOSPITAL')::text" : "'0'::text"} AS hospital_audience_count,
              ${notificationTargetUserExists ? "COUNT(*) FILTER (WHERE target_user_id IS NOT NULL)::text" : "'0'::text"} AS targeted_count,
              ${
                monitorEventsExists
                  ? `(
                      SELECT COUNT(*)::text
                      FROM system_monitor_events
                      WHERE category = 'notification_failure'
                        AND created_at >= NOW() - INTERVAL '24 hours'
                    )`
                  : "'0'::text"
              } AS notification_failures_24h
            FROM notifications
          `,
        )
      : Promise.resolve({
          rows: [
            {
              total_count: "0",
              live_count: "0",
              training_count: "0",
              unread_count: "0",
              ems_audience_count: "0",
              hospital_audience_count: "0",
              targeted_count: "0",
              notification_failures_24h: "0",
            },
          ],
        }),
    notificationsExists && notificationKindExists
      ? db.query<{ kind: string; total: string }>(
          `
            SELECT kind, COUNT(*)::text AS total
            FROM notifications
            GROUP BY kind
            ORDER BY COUNT(*) DESC, kind ASC
            LIMIT 5
          `,
        )
      : Promise.resolve({ rows: [] }),
    monitorEventsExists
      ? db.query<{ source: string; total: string }>(
          `
            SELECT source, COUNT(*)::text AS total
            FROM system_monitor_events
            WHERE category = 'notification_failure'
              AND created_at >= NOW() - INTERVAL '24 hours'
            GROUP BY source
            ORDER BY COUNT(*) DESC, source ASC
            LIMIT 5
          `,
        )
      : Promise.resolve({ rows: [] }),
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
