import { createHash } from "crypto";

import { db } from "@/lib/db";
import { rethrowSchemaEnsureError } from "@/lib/schemaEnsure";

export type SystemMonitorSeverity = "info" | "warning" | "error";
export type SystemMonitorCategory =
  | "api_failure"
  | "rate_limit"
  | "notification_failure"
  | "security_signal"
  | "backup_failure"
  | "backup_success";

let ensured = false;
let attempted = false;
let ensurePromise: Promise<void> | null = null;

export async function ensureSystemMonitorSchema() {
  if (ensured) return;
  if (ensurePromise) return ensurePromise;
  if (attempted) return;

  ensurePromise = (async () => {
    attempted = true;

    try {
      await db.query(`
    CREATE TABLE IF NOT EXISTS system_monitor_events (
      id BIGSERIAL PRIMARY KEY,
      category TEXT NOT NULL,
      severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error')),
      source TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata_json JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_system_monitor_events_category_created
      ON system_monitor_events(category, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_system_monitor_events_source_created
      ON system_monitor_events(source, created_at DESC);

    CREATE TABLE IF NOT EXISTS backup_run_reports (
      id BIGSERIAL PRIMARY KEY,
      backup_type TEXT NOT NULL DEFAULT 'postgres',
      status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      retention_days INTEGER,
      details_json JSONB,
      reported_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_backup_run_reports_created
      ON backup_run_reports(created_at DESC);
  `);
      ensured = true;
    } catch (error) {
      attempted = false;
      rethrowSchemaEnsureError("ensureSystemMonitorSchema", error);
    } finally {
      ensurePromise = null;
    }
  })();

  return ensurePromise;
}

export async function recordSystemMonitorEvent(input: {
  category: SystemMonitorCategory;
  severity: SystemMonitorSeverity;
  source: string;
  message: string;
  metadata?: unknown;
}) {
  await ensureSystemMonitorSchema();
  await db.query(
    `
      INSERT INTO system_monitor_events (category, severity, source, message, metadata_json)
      VALUES ($1, $2, $3, $4, $5::jsonb)
    `,
    [
      input.category,
      input.severity,
      input.source,
      input.message,
      input.metadata == null ? null : JSON.stringify(input.metadata),
    ],
  );
}

export async function recordApiFailureEvent(source: string, error: unknown, metadata?: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "unknown error");
  await recordSystemMonitorEvent({
    category: "api_failure",
    severity: "error",
    source,
    message,
    metadata,
  }).catch(() => undefined);
}

export async function recordNotificationFailureEvent(source: string, error: unknown, metadata?: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "unknown error");
  await recordSystemMonitorEvent({
    category: "notification_failure",
    severity: "error",
    source,
    message,
    metadata,
  }).catch(() => undefined);
}

export async function recordSecuritySignalEvent(input: {
  source: string;
  message: string;
  severity?: SystemMonitorSeverity;
  metadata?: unknown;
}) {
  await recordSystemMonitorEvent({
    category: "security_signal",
    severity: input.severity ?? "warning",
    source: input.source,
    message: input.message,
    metadata: input.metadata,
  }).catch(() => undefined);
}

export async function recordBackupRunReport(input: {
  status: "success" | "failure";
  startedAt?: string | null;
  completedAt?: string | null;
  retentionDays?: number | null;
  details?: unknown;
  reportedByUserId?: number | null;
}) {
  await ensureSystemMonitorSchema();

  await db.query(
    `
      INSERT INTO backup_run_reports (
        backup_type,
        status,
        started_at,
        completed_at,
        retention_days,
        details_json,
        reported_by_user_id
      ) VALUES ('postgres', $1, $2, $3, $4, $5::jsonb, $6)
    `,
    [
      input.status,
      input.startedAt ?? null,
      input.completedAt ?? null,
      input.retentionDays ?? 14,
      input.details == null ? null : JSON.stringify(input.details),
      input.reportedByUserId ?? null,
    ],
  );

  await recordSystemMonitorEvent({
    category: input.status === "failure" ? "backup_failure" : "backup_success",
    severity: input.status === "failure" ? "error" : "info",
    source: "backup.run",
    message: input.status === "failure" ? "バックアップ失敗が報告されました。" : "バックアップ成功が報告されました。",
    metadata: {
      startedAt: input.startedAt ?? null,
      completedAt: input.completedAt ?? null,
      retentionDays: input.retentionDays ?? 14,
    },
  }).catch(() => undefined);
}

export function resolveClientIpAddress(request: Request | { headers?: Headers | null } | null | undefined) {
  const headers = request?.headers;
  if (!headers) return "unknown";

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const [first] = forwarded.split(",");
    if (first?.trim()) return first.trim();
  }

  const realIp = headers.get("x-real-ip");
  if (realIp?.trim()) return realIp.trim();
  return "unknown";
}

export function hashMonitorValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
