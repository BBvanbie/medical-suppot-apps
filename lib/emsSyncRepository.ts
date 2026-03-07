import { db } from "@/lib/db";

export type EmsSyncState = {
  connectionStatus: "online";
  lastSyncAt: string | null;
  lastRetryAt: string | null;
  lastSyncStatus: "idle" | "success" | "error";
  lastRetryStatus: "idle" | "success" | "error";
  pendingCount: number;
};

function formatDateTime(value: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function mapState(row?: {
  last_sync_at: Date | string | null;
  last_retry_at: Date | string | null;
  last_sync_status: "idle" | "success" | "error";
  last_retry_status: "idle" | "success" | "error";
  pending_count: number;
} | null): EmsSyncState {
  return {
    connectionStatus: "online",
    lastSyncAt: formatDateTime(row?.last_sync_at ?? null),
    lastRetryAt: formatDateTime(row?.last_retry_at ?? null),
    lastSyncStatus: row?.last_sync_status ?? "idle",
    lastRetryStatus: row?.last_retry_status ?? "idle",
    pendingCount: row?.pending_count ?? 0,
  };
}

async function ensureSyncRow(userId: number) {
  await db.query(
    `
      INSERT INTO ems_sync_state (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
    `,
    [userId],
  );
}

export async function getEmsSyncState(userId: number): Promise<EmsSyncState> {
  const result = await db.query<{
    last_sync_at: Date | string | null;
    last_retry_at: Date | string | null;
    last_sync_status: "idle" | "success" | "error";
    last_retry_status: "idle" | "success" | "error";
    pending_count: number;
  }>(
    `
      SELECT last_sync_at, last_retry_at, last_sync_status, last_retry_status, pending_count
      FROM ems_sync_state
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId],
  );

  return mapState(result.rows[0] ?? null);
}

export async function runEmsSync(userId: number): Promise<EmsSyncState> {
  await ensureSyncRow(userId);

  const result = await db.query<{
    last_sync_at: Date | string | null;
    last_retry_at: Date | string | null;
    last_sync_status: "idle" | "success" | "error";
    last_retry_status: "idle" | "success" | "error";
    pending_count: number;
  }>(
    `
      UPDATE ems_sync_state
      SET
        last_sync_at = NOW(),
        last_sync_status = 'success',
        updated_at = NOW()
      WHERE user_id = $1
      RETURNING last_sync_at, last_retry_at, last_sync_status, last_retry_status, pending_count
    `,
    [userId],
  );

  return mapState(result.rows[0] ?? null);
}

export async function retryEmsPending(userId: number): Promise<EmsSyncState> {
  await ensureSyncRow(userId);

  const result = await db.query<{
    last_sync_at: Date | string | null;
    last_retry_at: Date | string | null;
    last_sync_status: "idle" | "success" | "error";
    last_retry_status: "idle" | "success" | "error";
    pending_count: number;
  }>(
    `
      UPDATE ems_sync_state
      SET
        last_retry_at = NOW(),
        last_retry_status = 'success',
        pending_count = 0,
        updated_at = NOW()
      WHERE user_id = $1
      RETURNING last_sync_at, last_retry_at, last_sync_status, last_retry_status, pending_count
    `,
    [userId],
  );

  return mapState(result.rows[0] ?? null);
}
