import { db } from "@/lib/db";
import type { AuthenticatedUser } from "@/lib/authContext";
import { hashMonitorValue, recordSystemMonitorEvent, resolveClientIpAddress } from "@/lib/systemMonitor";

let ensured = false;

export type RateLimitPolicyName =
  | "login"
  | "search_read"
  | "notifications_read"
  | "critical_update";

export const RATE_LIMIT_POLICIES: Record<
  RateLimitPolicyName,
  { limit: number; windowSeconds: number; label: string }
> = {
  login: { limit: 5, windowSeconds: 5 * 60, label: "ログイン" },
  search_read: { limit: 60, windowSeconds: 60, label: "検索" },
  notifications_read: { limit: 30, windowSeconds: 60, label: "通知取得" },
  critical_update: { limit: 30, windowSeconds: 60, label: "重要更新" },
};

async function ensureRateLimitSchema() {
  if (ensured) return;

  await db.query(`
    CREATE TABLE IF NOT EXISTS api_rate_limit_events (
      id BIGSERIAL PRIMARY KEY,
      policy_name TEXT NOT NULL,
      scope_key TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_api_rate_limit_events_scope_created
      ON api_rate_limit_events(policy_name, scope_key, created_at DESC);
  `);

  ensured = true;
}

export async function clearLoginRateLimitForUsername(username: string) {
  await ensureRateLimitSchema();
  await db.query(
    `
      DELETE FROM api_rate_limit_events
      WHERE policy_name = 'login'
        AND scope_key LIKE $1
    `,
    [`auth.login:username:${username}:%`],
  );
}

function getScopeKey(input: {
  request?: Request | null;
  user?: AuthenticatedUser | null;
  username?: string | null;
  routeKey: string;
}) {
  const parts = [input.routeKey];
  if (input.user?.id) {
    parts.push(`user:${input.user.id}`);
  } else if (input.username) {
    parts.push(`username:${input.username}`);
  }

  const ip = resolveClientIpAddress(input.request);
  parts.push(`ip:${hashMonitorValue(ip)}`);
  return parts.join(":");
}

export async function consumeRateLimit(input: {
  policyName: RateLimitPolicyName;
  routeKey: string;
  request?: Request | null;
  user?: AuthenticatedUser | null;
  username?: string | null;
  metadata?: unknown;
}) {
  await ensureRateLimitSchema();

  const policy = RATE_LIMIT_POLICIES[input.policyName];
  const scopeKey = getScopeKey(input);

  const countRes = await db.query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM api_rate_limit_events
      WHERE policy_name = $1
        AND scope_key = $2
        AND created_at >= NOW() - ($3::text || ' seconds')::interval
    `,
    [input.policyName, scopeKey, String(policy.windowSeconds)],
  );
  const currentCount = Number(countRes.rows[0]?.count ?? "0");
  if (currentCount >= policy.limit) {
    const latestRes = await db.query<{ created_at: Date | string }>(
      `
        SELECT created_at
        FROM api_rate_limit_events
        WHERE policy_name = $1
          AND scope_key = $2
          AND created_at >= NOW() - ($3::text || ' seconds')::interval
        ORDER BY created_at ASC
        LIMIT 1
      `,
      [input.policyName, scopeKey, String(policy.windowSeconds)],
    );
    const oldest = latestRes.rows[0]?.created_at ? new Date(latestRes.rows[0].created_at) : null;
    const retryAfterSeconds = oldest
      ? Math.max(1, Math.ceil((oldest.getTime() + policy.windowSeconds * 1000 - Date.now()) / 1000))
      : policy.windowSeconds;

    await recordSystemMonitorEvent({
      category: "rate_limit",
      severity: "warning",
      source: input.routeKey,
      message: `${policy.label} のレート制限に達しました。`,
      metadata: {
        policyName: input.policyName,
        scopeKey,
        retryAfterSeconds,
        ...((input.metadata as Record<string, unknown> | undefined) ?? {}),
      },
    }).catch(() => undefined);

    return {
      ok: false as const,
      limit: policy.limit,
      windowSeconds: policy.windowSeconds,
      retryAfterSeconds,
    };
  }

  await db.query(
    `
      INSERT INTO api_rate_limit_events (policy_name, scope_key)
      VALUES ($1, $2)
    `,
    [input.policyName, scopeKey],
  );

  return {
    ok: true as const,
    limit: policy.limit,
    windowSeconds: policy.windowSeconds,
    retryAfterSeconds: 0,
  };
}
