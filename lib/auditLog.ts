import type { AuthenticatedUser } from "@/lib/authContext";
import { db } from "@/lib/db";

let ensured = false;

export type AuditLogPayload = {
  actor?: AuthenticatedUser | null;
  action: string;
  targetType: string;
  targetId: string;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
};

type Queryable = {
  query: (text: string, values?: unknown[]) => Promise<{ rowCount: number | null; rows: unknown[] }>;
};

export async function ensureAuditLogSchema() {
  if (ensured) return;

  await db.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGSERIAL PRIMARY KEY,
      actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      actor_role TEXT NOT NULL,
      actor_team_id BIGINT REFERENCES emergency_teams(id) ON DELETE SET NULL,
      actor_hospital_id BIGINT REFERENCES hospitals(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      before_json JSONB,
      after_json JSONB,
      metadata_json JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE audit_logs
      ADD COLUMN IF NOT EXISTS actor_team_id BIGINT REFERENCES emergency_teams(id) ON DELETE SET NULL;

    ALTER TABLE audit_logs
      ADD COLUMN IF NOT EXISTS actor_hospital_id BIGINT REFERENCES hospitals(id) ON DELETE SET NULL;

    ALTER TABLE audit_logs
      ADD COLUMN IF NOT EXISTS metadata_json JSONB;

    CREATE INDEX IF NOT EXISTS idx_audit_logs_target
      ON audit_logs(target_type, target_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_audit_logs_actor
      ON audit_logs(actor_user_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_audit_logs_action
      ON audit_logs(action, created_at DESC);
  `);

  ensured = true;
}

export async function writeAuditLog(
  payload: AuditLogPayload,
  executor: Queryable = db,
): Promise<void> {
  await ensureAuditLogSchema();

  await executor.query(
    `
      INSERT INTO audit_logs (
        actor_user_id,
        actor_role,
        actor_team_id,
        actor_hospital_id,
        action,
        target_type,
        target_id,
        before_json,
        after_json,
        metadata_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb)
    `,
    [
      payload.actor?.id ?? null,
      payload.actor?.role ?? "SYSTEM",
      payload.actor?.teamId ?? null,
      payload.actor?.hospitalId ?? null,
      payload.action,
      payload.targetType,
      payload.targetId,
      payload.before == null ? null : JSON.stringify(payload.before),
      payload.after == null ? null : JSON.stringify(payload.after),
      payload.metadata == null ? null : JSON.stringify(payload.metadata),
    ],
  );
}

export async function writeForbiddenAccessAudit(
  input: {
    actor: AuthenticatedUser;
    targetType: string;
    targetId: string;
    message: string;
    metadata?: unknown;
  },
  executor: Queryable = db,
): Promise<void> {
  await writeAuditLog(
    {
      actor: input.actor,
      action: "forbidden_access_attempt",
      targetType: input.targetType,
      targetId: input.targetId,
      after: { message: input.message },
      metadata: input.metadata,
    },
    executor,
  );
}