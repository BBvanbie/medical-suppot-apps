import { db } from "@/lib/db";
import { ensureSecurityAuthSchema } from "@/lib/securityAuthSchema";
import { ensureSystemMonitorSchema } from "@/lib/systemMonitor";

export type AdminMonitoringEvent = {
  id: number;
  category: string;
  severity: "info" | "warning" | "error";
  source: string;
  message: string;
  createdAt: string;
};

export type AdminMonitoringTopSource = {
  source: string;
  total: number;
};

export type AdminMonitoringBackupStatus = {
  latestStatus: "success" | "failure" | "none";
  latestCompletedAt: string | null;
  failureCount14d: number;
  successCount14d: number;
};

export type AdminMonitoringData = {
  generatedAt: string;
  appUptimeLabel: string;
  dbStatus: "ok" | "error";
  dbCheckedAt: string | null;
  loginFailures15m: number;
  lockedUsers: number;
  apiFailures24h: number;
  notificationFailures24h: number;
  rateLimitHits1h: number;
  backup: AdminMonitoringBackupStatus;
  recentEvents: AdminMonitoringEvent[];
  topFailureSources: AdminMonitoringTopSource[];
  topRateLimitSources: AdminMonitoringTopSource[];
};

function formatUptime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (hours > 0) return `${hours}時間${minutes}分`;
  return `${minutes}分`;
}

export async function getAdminMonitoringData(): Promise<AdminMonitoringData> {
  await ensureSecurityAuthSchema();
  await ensureSystemMonitorSchema();

  const generatedAt = new Date().toISOString();
  const appUptimeLabel = formatUptime(process.uptime());

  let dbStatus: "ok" | "error" = "ok";
  let dbCheckedAt: string | null = null;
  try {
    const ping = await db.query<{ now: Date | string }>("SELECT NOW()::text AS now");
    dbCheckedAt = String(ping.rows[0]?.now ?? new Date().toISOString());
  } catch {
    dbStatus = "error";
  }

  const [loginFailuresRes, lockedUsersRes, monitorCountsRes, recentEventsRes, topFailureSourcesRes, topRateLimitSourcesRes, backupRes] =
    await Promise.all([
      db.query<{ count: string }>(
        `
          SELECT COUNT(*)::text AS count
          FROM login_attempts
          WHERE success = FALSE
            AND attempted_at >= NOW() - INTERVAL '15 minutes'
        `,
      ),
      db.query<{ count: string }>(
        `
          SELECT COUNT(*)::text AS count
          FROM users
          WHERE locked_until IS NOT NULL
            AND locked_until > NOW()
        `,
      ),
      db.query<{
        api_failures_24h: string;
        notification_failures_24h: string;
        rate_limit_hits_1h: string;
      }>(
        `
          SELECT
            COUNT(*) FILTER (
              WHERE category = 'api_failure'
                AND created_at >= NOW() - INTERVAL '24 hours'
            )::text AS api_failures_24h,
            COUNT(*) FILTER (
              WHERE category = 'notification_failure'
                AND created_at >= NOW() - INTERVAL '24 hours'
            )::text AS notification_failures_24h,
            COUNT(*) FILTER (
              WHERE category = 'rate_limit'
                AND created_at >= NOW() - INTERVAL '1 hour'
            )::text AS rate_limit_hits_1h
          FROM system_monitor_events
        `,
      ),
      db.query<{
        id: number;
        category: string;
        severity: "info" | "warning" | "error";
        source: string;
        message: string;
        created_at: string;
      }>(
        `
          SELECT id, category, severity, source, message, created_at::text AS created_at
          FROM system_monitor_events
          ORDER BY created_at DESC, id DESC
          LIMIT 12
        `,
      ),
      db.query<{ source: string; total: string }>(
        `
          SELECT source, COUNT(*)::text AS total
          FROM system_monitor_events
          WHERE category IN ('api_failure', 'notification_failure')
            AND created_at >= NOW() - INTERVAL '24 hours'
          GROUP BY source
          ORDER BY COUNT(*) DESC, source ASC
          LIMIT 5
        `,
      ),
      db.query<{ source: string; total: string }>(
        `
          SELECT source, COUNT(*)::text AS total
          FROM system_monitor_events
          WHERE category = 'rate_limit'
            AND created_at >= NOW() - INTERVAL '24 hours'
          GROUP BY source
          ORDER BY COUNT(*) DESC, source ASC
          LIMIT 5
        `,
      ),
      db.query<{
        latest_status: "success" | "failure" | null;
        latest_completed_at: string | null;
        failure_count_14d: string;
        success_count_14d: string;
      }>(
        `
          SELECT
            (
              SELECT status
              FROM backup_run_reports
              ORDER BY COALESCE(completed_at, created_at) DESC, id DESC
              LIMIT 1
            ) AS latest_status,
            (
              SELECT COALESCE(completed_at, created_at)::text
              FROM backup_run_reports
              ORDER BY COALESCE(completed_at, created_at) DESC, id DESC
              LIMIT 1
            ) AS latest_completed_at,
            COUNT(*) FILTER (
              WHERE status = 'failure'
                AND created_at >= NOW() - INTERVAL '14 days'
            )::text AS failure_count_14d,
            COUNT(*) FILTER (
              WHERE status = 'success'
                AND created_at >= NOW() - INTERVAL '14 days'
            )::text AS success_count_14d
          FROM backup_run_reports
        `,
      ),
    ]);

  const counts = monitorCountsRes.rows[0];
  const backup = backupRes.rows[0];

  return {
    generatedAt,
    appUptimeLabel,
    dbStatus,
    dbCheckedAt,
    loginFailures15m: Number(loginFailuresRes.rows[0]?.count ?? "0"),
    lockedUsers: Number(lockedUsersRes.rows[0]?.count ?? "0"),
    apiFailures24h: Number(counts?.api_failures_24h ?? "0"),
    notificationFailures24h: Number(counts?.notification_failures_24h ?? "0"),
    rateLimitHits1h: Number(counts?.rate_limit_hits_1h ?? "0"),
    backup: {
      latestStatus: backup?.latest_status ?? "none",
      latestCompletedAt: backup?.latest_completed_at ?? null,
      failureCount14d: Number(backup?.failure_count_14d ?? "0"),
      successCount14d: Number(backup?.success_count_14d ?? "0"),
    },
    recentEvents: recentEventsRes.rows.map((row) => ({
      id: row.id,
      category: row.category,
      severity: row.severity,
      source: row.source,
      message: row.message,
      createdAt: row.created_at,
    })),
    topFailureSources: topFailureSourcesRes.rows.map((row) => ({
      source: row.source,
      total: Number(row.total),
    })),
    topRateLimitSources: topRateLimitSourcesRes.rows.map((row) => ({
      source: row.source,
      total: Number(row.total),
    })),
  };
}
