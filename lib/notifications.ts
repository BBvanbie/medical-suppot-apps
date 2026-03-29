import { db } from "@/lib/db";
import type { AuthenticatedUser } from "@/lib/authContext";

export type NotificationAudienceRole = "EMS" | "HOSPITAL";

export type NotificationPayload = {
  audienceRole: NotificationAudienceRole;
  teamId?: number | null;
  hospitalId?: number | null;
  targetUserId?: number | null;
  kind: string;
  caseId?: string | null;
  caseUid?: string | null;
  targetId?: number | null;
  title: string;
  body: string;
  menuKey?: string | null;
  tabKey?: string | null;
};

export type NotificationItem = {
  id: number;
  kind: string;
  caseId: string | null;
  caseUid: string | null;
  targetId: number | null;
  title: string;
  body: string;
  menuKey: string | null;
  tabKey: string | null;
  createdAt: string;
  isRead: boolean;
};

type Queryable = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number | null }>;
};

type NotificationRow = {
  id: number;
  kind: string;
  case_id: string | null;
  case_uid: string | null;
  target_id: number | null;
  title: string;
  body: string;
  menu_key: string | null;
  tab_key: string | null;
  created_at: string;
  is_read: boolean;
};

function toNotificationItem(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    kind: row.kind,
    caseId: row.case_id,
    caseUid: row.case_uid,
    targetId: row.target_id,
    title: row.title,
    body: row.body,
    menuKey: row.menu_key,
    tabKey: row.tab_key,
    createdAt: row.created_at,
    isRead: row.is_read,
  };
}

export async function createNotification(payload: NotificationPayload, executor: Queryable = db): Promise<void> {
  await executor.query(
    `
      INSERT INTO notifications (
        audience_role,
        team_id,
        hospital_id,
        target_user_id,
        kind,
        case_id,
        case_uid,
        target_id,
        title,
        body,
        menu_key,
        tab_key,
        is_read,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, FALSE, NOW())
    `,
    [
      payload.audienceRole,
      payload.teamId ?? null,
      payload.hospitalId ?? null,
      payload.targetUserId ?? null,
      payload.kind,
      payload.caseId ?? null,
      payload.caseUid ?? null,
      payload.targetId ?? null,
      payload.title,
      payload.body,
      payload.menuKey ?? null,
      payload.tabKey ?? null,
    ],
  );
}

export async function listNotificationsForUser(
  user: AuthenticatedUser,
  limit = 30,
): Promise<{
  items: NotificationItem[];
  unreadCount: number;
  unreadMenuKeys: string[];
  unreadTabKeys: string[];
}> {
  const maxLimit = Math.min(Math.max(limit, 1), 100);

  const scopeRes = await db.query<{
    unread_count: string;
    unread_menu_keys: string[] | null;
    unread_tab_keys: string[] | null;
  }>(
    `
      SELECT
        COUNT(*) FILTER (WHERE is_read = FALSE)::text AS unread_count,
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT CASE WHEN is_read = FALSE THEN menu_key END), NULL) AS unread_menu_keys,
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT CASE WHEN is_read = FALSE THEN tab_key END), NULL) AS unread_tab_keys
      FROM notifications
      WHERE (
        (target_user_id IS NOT NULL AND target_user_id = $1)
        OR (
          target_user_id IS NULL
          AND audience_role = $2
          AND (
            ($2 = 'EMS' AND team_id IS NOT DISTINCT FROM $3)
            OR ($2 = 'HOSPITAL' AND hospital_id IS NOT DISTINCT FROM $4)
          )
        )
      )
    `,
    [user.id, user.role, user.teamId, user.hospitalId],
  );

  const listRes = await db.query<NotificationRow>(
    `
      SELECT
        id,
        kind,
        case_id,
        case_uid,
        target_id,
        title,
        body,
        menu_key,
        tab_key,
        created_at::text AS created_at,
        is_read
      FROM notifications
      WHERE (
        (target_user_id IS NOT NULL AND target_user_id = $1)
        OR (
          target_user_id IS NULL
          AND audience_role = $2
          AND (
            ($2 = 'EMS' AND team_id IS NOT DISTINCT FROM $3)
            OR ($2 = 'HOSPITAL' AND hospital_id IS NOT DISTINCT FROM $4)
          )
        )
      )
      ORDER BY created_at DESC, id DESC
      LIMIT $5
    `,
    [user.id, user.role, user.teamId, user.hospitalId, maxLimit],
  );

  const scopeRow = scopeRes.rows[0];
  return {
    items: listRes.rows.map(toNotificationItem),
    unreadCount: Number(scopeRow?.unread_count ?? 0),
    unreadMenuKeys: scopeRow?.unread_menu_keys ?? [],
    unreadTabKeys: scopeRow?.unread_tab_keys ?? [],
  };
}

export async function markNotificationsRead(
  user: AuthenticatedUser,
  opts: { ids?: number[]; menuKey?: string | null; tabKey?: string | null; all?: boolean },
): Promise<number> {
  const ids = Array.isArray(opts.ids)
    ? opts.ids
        .map((v) => Number(v))
        .filter((v) => Number.isFinite(v))
    : [];

  const filters: string[] = [];
  const values: unknown[] = [user.id, user.role, user.teamId, user.hospitalId];

  if (ids.length > 0) {
    values.push(ids);
    filters.push(`id = ANY($${values.length}::bigint[])`);
  }

  if (opts.menuKey) {
    values.push(opts.menuKey);
    filters.push(`menu_key = $${values.length}`);
  }

  if (opts.tabKey) {
    values.push(opts.tabKey);
    filters.push(`tab_key = $${values.length}`);
  }

  if (!opts.all && filters.length === 0) {
    return 0;
  }

  const whereExtra = filters.length > 0 ? `AND (${filters.join(" AND ")})` : "";

  const res = await db.query(
    `
      UPDATE notifications
      SET is_read = TRUE,
          read_at = NOW()
      WHERE is_read = FALSE
        AND (
          (target_user_id IS NOT NULL AND target_user_id = $1)
          OR (
            target_user_id IS NULL
            AND audience_role = $2
            AND (
              ($2 = 'EMS' AND team_id IS NOT DISTINCT FROM $3)
              OR ($2 = 'HOSPITAL' AND hospital_id IS NOT DISTINCT FROM $4)
            )
          )
        )
        ${whereExtra}
    `,
    values,
  );

  return res.rowCount ?? 0;
}
