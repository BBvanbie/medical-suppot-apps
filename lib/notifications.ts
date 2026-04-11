import type { AppMode } from "@/lib/appMode";
import type { AuthenticatedUser } from "@/lib/authContext";
import { db } from "@/lib/db";
import {
  CONSULT_STALLED_CRITICAL_MINUTES,
  CONSULT_STALLED_WARNING_MINUTES,
  SELECTION_STALLED_CRITICAL_MINUTES,
  SELECTION_STALLED_WARNING_MINUTES,
  listConsultStalledCandidates,
  listSelectionStalledCandidates,
} from "@/lib/operationalAlerts";
import { recordNotificationFailureEvent } from "@/lib/systemMonitor";

export type NotificationAudienceRole = "EMS" | "HOSPITAL";
export type NotificationSeverity = "info" | "warning" | "critical";

export type NotificationPayload = {
  audienceRole: NotificationAudienceRole;
  mode?: AppMode;
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
  severity?: NotificationSeverity;
  dedupeKey?: string | null;
  expiresAt?: string | null;
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
  severity: NotificationSeverity;
  dedupeKey: string | null;
  expiresAt: string | null;
  ackedAt: string | null;
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
  severity: NotificationSeverity;
  dedupe_key: string | null;
  expires_at: string | null;
  acked_at: string | null;
  created_at: string;
  is_read: boolean;
};

type NotificationOpsOptions = {
  ids?: number[];
  menuKey?: string | null;
  tabKey?: string | null;
  all?: boolean;
  ack?: boolean;
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
    severity: row.severity,
    dedupeKey: row.dedupe_key,
    expiresAt: row.expires_at,
    ackedAt: row.acked_at,
    createdAt: row.created_at,
    isRead: row.is_read,
  };
}

function getNotificationScopeWhere(startIndex = 1) {
  return `
    (
      (target_user_id IS NOT NULL AND target_user_id = $${startIndex})
      OR (
        target_user_id IS NULL
        AND audience_role = $${startIndex + 1}
        AND (
          ($${startIndex + 1} = 'EMS' AND team_id IS NOT DISTINCT FROM $${startIndex + 2})
          OR ($${startIndex + 1} = 'HOSPITAL' AND hospital_id IS NOT DISTINCT FROM $${startIndex + 3})
        )
      )
    )
  `;
}

function getNotificationModeWhere(index: number) {
  return `mode = $${index}`;
}

async function getEmsRepeatEnabled(userId: number): Promise<boolean> {
  const res = await db.query<{ notify_repeat: boolean | null }>(
    `
      SELECT notify_repeat
      FROM ems_user_settings
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId],
  );
  return res.rows[0]?.notify_repeat ?? true;
}

async function getHospitalNotificationOps(hospitalId: number): Promise<{
  notifyRepeat: boolean;
  notifyReplyDelay: boolean;
  replyDelayMinutes: number;
}> {
  const res = await db.query<{
    notify_repeat: boolean | null;
    notify_reply_delay: boolean | null;
    reply_delay_minutes: number | null;
  }>(
    `
      SELECT notify_repeat, notify_reply_delay, reply_delay_minutes
      FROM hospital_settings
      WHERE hospital_id = $1
      LIMIT 1
    `,
    [hospitalId],
  );

  return {
    notifyRepeat: res.rows[0]?.notify_repeat ?? false,
    notifyReplyDelay: res.rows[0]?.notify_reply_delay ?? true,
    replyDelayMinutes: res.rows[0]?.reply_delay_minutes ?? 10,
  };
}

async function queryNotificationDedupeCandidate(payload: NotificationPayload, executor: Queryable) {
  if (!payload.dedupeKey) return null;

  const res = await executor.query(
    `
      SELECT id, is_read, acked_at
      FROM notifications
      WHERE dedupe_key = $1
        AND mode = $2
        AND audience_role = $3
        AND team_id IS NOT DISTINCT FROM $4
        AND hospital_id IS NOT DISTINCT FROM $5
        AND target_user_id IS NOT DISTINCT FROM $6
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `,
    [
      payload.dedupeKey,
      payload.mode ?? "LIVE",
      payload.audienceRole,
      payload.teamId ?? null,
      payload.hospitalId ?? null,
      payload.targetUserId ?? null,
    ],
  );

  return (res.rows[0] ?? null) as { id: number; is_read: boolean; acked_at: string | null } | null;
}

async function materializeEmsRepeatNotifications(user: AuthenticatedUser) {
  if (user.role !== "EMS" || !user.teamId) return;
  if (!(await getEmsRepeatEnabled(user.id))) return;

  const res = await db.query<NotificationRow>(
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
        severity,
        dedupe_key,
        expires_at::text AS expires_at,
        acked_at::text AS acked_at,
        created_at::text AS created_at,
        is_read
      FROM notifications
      WHERE ${getNotificationScopeWhere()}
        AND ${getNotificationModeWhere(5)}
        AND is_read = FALSE
        AND kind IN ('consult_status_changed', 'hospital_status_changed')
        AND created_at <= NOW() - INTERVAL '5 minutes'
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC, id DESC
      LIMIT 20
    `,
    [user.id, user.role, user.teamId, user.hospitalId, user.currentMode],
  );

  for (const row of res.rows) {
    const ageMinutes = Math.max(5, Math.floor((Date.now() - new Date(row.created_at).getTime()) / 60_000));
    const bucket = Math.floor(ageMinutes / 5);
    await createNotification({
      audienceRole: "EMS",
      targetUserId: user.id,
      teamId: user.teamId,
        kind: "unread_repeat",
        mode: user.currentMode,
        caseId: row.case_id,
      caseUid: row.case_uid,
      targetId: row.target_id,
      title: "未確認通知の再通知",
      body: `${row.title} が未確認のままです。内容を確認してください。`,
      menuKey: row.menu_key,
      tabKey: row.tab_key,
      severity: "warning",
      dedupeKey: `ems-repeat:${row.id}:${bucket}`,
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    });
  }
}

async function materializeEmsSelectionStalledNotifications(user: AuthenticatedUser) {
  if (user.role !== "EMS" || !user.teamId) return;
  if (!(await getEmsRepeatEnabled(user.id))) return;

  const candidates = await listSelectionStalledCandidates(user.teamId, user.currentMode);
  const now = Date.now();
  for (const candidate of candidates) {
    const intervalMinutes =
      candidate.severity === "critical" ? SELECTION_STALLED_CRITICAL_MINUTES : SELECTION_STALLED_WARNING_MINUTES;
    const bucket = Math.floor(candidate.ageMinutes / intervalMinutes);
    await createNotification({
      audienceRole: "EMS",
      targetUserId: user.id,
      teamId: user.teamId,
      kind: "selection_stalled",
      mode: user.currentMode,
      caseId: candidate.caseId,
      caseUid: candidate.caseUid,
      title: candidate.severity === "critical" ? "搬送先選定の長時間停滞" : "搬送先選定の停滞",
      body: `事案 ${candidate.caseId} は ${candidate.ageMinutes} 分以上搬送決定がなく、選定が停滞しています。`,
      menuKey: "cases-list",
      severity: candidate.severity,
      dedupeKey: `selection-stalled:${candidate.caseUid}:${candidate.severity}:${bucket}`,
      expiresAt: new Date(now + intervalMinutes * 60_000).toISOString(),
    });
  }
}

async function materializeEmsConsultStalledNotifications(user: AuthenticatedUser) {
  if (user.role !== "EMS" || !user.teamId) return;
  if (!(await getEmsRepeatEnabled(user.id))) return;

  const candidates = await listConsultStalledCandidates(null, user.teamId, user.currentMode);
  const now = Date.now();
  for (const candidate of candidates) {
    const intervalMinutes =
      candidate.severity === "critical" ? CONSULT_STALLED_CRITICAL_MINUTES : CONSULT_STALLED_WARNING_MINUTES;
    const bucket = Math.floor(candidate.ageMinutes / intervalMinutes);
    await createNotification({
      audienceRole: "EMS",
      targetUserId: user.id,
      teamId: user.teamId,
      kind: "consult_stalled",
      mode: user.currentMode,
      caseId: candidate.caseId,
      caseUid: candidate.caseUid,
      targetId: candidate.targetId,
      title: candidate.severity === "critical" ? "要相談案件の長時間停滞" : "要相談案件の停滞",
      body: `事案 ${candidate.caseId} の要相談対応が ${candidate.ageMinutes} 分以上更新されていません。`,
      menuKey: "cases-list",
      severity: candidate.severity,
      dedupeKey: `ems-consult-stalled:${candidate.targetId}:${candidate.severity}:${bucket}`,
      expiresAt: new Date(now + intervalMinutes * 60_000).toISOString(),
    });
  }
}

async function materializeHospitalOperationalNotifications(user: AuthenticatedUser) {
  if (user.role !== "HOSPITAL" || !user.hospitalId) return;

  const ops = await getHospitalNotificationOps(user.hospitalId);
  if (!ops.notifyRepeat && !ops.notifyReplyDelay) return;

  const res = await db.query<{
    target_id: number;
    case_id: string;
    case_uid: string;
    status: string;
    sent_at: string;
  }>(
    `
      SELECT
        t.id AS target_id,
        r.case_id,
        r.case_uid,
        t.status,
        r.sent_at::text AS sent_at
      FROM hospital_request_targets t
      JOIN hospital_requests r ON r.id = t.hospital_request_id
      WHERE t.hospital_id = $1
        AND r.mode = $2
        AND t.status IN ('UNREAD', 'READ')
      ORDER BY r.sent_at ASC, t.id ASC
    `,
    [user.hospitalId, user.currentMode],
  );

  const now = Date.now();
  for (const row of res.rows) {
    const sentAtMs = new Date(row.sent_at).getTime();
    if (!Number.isFinite(sentAtMs)) continue;
    const ageMinutes = Math.floor((now - sentAtMs) / 60_000);

    if (ops.notifyRepeat && ageMinutes >= 5) {
      const repeatBucket = Math.floor(ageMinutes / 5);
      await createNotification({
        audienceRole: "HOSPITAL",
        targetUserId: user.id,
        hospitalId: user.hospitalId,
        kind: "request_repeat",
        mode: user.currentMode,
        caseId: row.case_id,
        caseUid: row.case_uid,
        targetId: row.target_id,
        title: "未確認要請の再通知",
        body: `事案 ${row.case_id} の受入要請が未確認です。対応状況を確認してください。`,
        menuKey: "hospitals-requests",
        severity: "warning",
        dedupeKey: `request-repeat:${row.target_id}:${repeatBucket}`,
        expiresAt: new Date(now + 5 * 60_000).toISOString(),
      });
    }

    if (ops.notifyReplyDelay && ageMinutes >= ops.replyDelayMinutes) {
      const delayBucket = Math.floor(ageMinutes / ops.replyDelayMinutes);
      await createNotification({
        audienceRole: "HOSPITAL",
        targetUserId: user.id,
        hospitalId: user.hospitalId,
        kind: "reply_delay",
        mode: user.currentMode,
        caseId: row.case_id,
        caseUid: row.case_uid,
        targetId: row.target_id,
        title: "返信遅延エスカレーション",
        body: `事案 ${row.case_id} の受入要請が ${ops.replyDelayMinutes} 分以上未応答です。優先して確認してください。`,
        menuKey: "hospitals-requests",
        severity: "critical",
        dedupeKey: `reply-delay:${row.target_id}:${delayBucket}`,
        expiresAt: new Date(now + ops.replyDelayMinutes * 60_000).toISOString(),
      });
    }
  }

  if (ops.notifyReplyDelay) {
    const consultCandidates = await listConsultStalledCandidates(user.hospitalId, null, user.currentMode);
    for (const candidate of consultCandidates) {
      const intervalMinutes =
        candidate.severity === "critical" ? CONSULT_STALLED_CRITICAL_MINUTES : CONSULT_STALLED_WARNING_MINUTES;
      const bucket = Math.floor(candidate.ageMinutes / intervalMinutes);
      await createNotification({
        audienceRole: "HOSPITAL",
        targetUserId: user.id,
        hospitalId: user.hospitalId,
        kind: "consult_stalled",
        mode: user.currentMode,
        caseId: candidate.caseId,
        caseUid: candidate.caseUid,
        targetId: candidate.targetId,
        title: candidate.severity === "critical" ? "要相談案件の長時間停滞" : "要相談案件の停滞",
        body: `事案 ${candidate.caseId} の要相談対応が ${candidate.ageMinutes} 分以上更新されていません。`,
        menuKey: "hospitals-consults",
        severity: candidate.severity,
        dedupeKey: `consult-stalled:${candidate.targetId}:${candidate.severity}:${bucket}`,
        expiresAt: new Date(now + intervalMinutes * 60_000).toISOString(),
      });
    }
  }
}

async function materializeOperationalNotifications(user: AuthenticatedUser) {
  await materializeEmsRepeatNotifications(user);
  await materializeEmsSelectionStalledNotifications(user);
  await materializeEmsConsultStalledNotifications(user);
  await materializeHospitalOperationalNotifications(user);
}

async function notificationTargetUserExists(userId: number, executor: Queryable): Promise<boolean> {
  const result = await executor.query(
    `
      SELECT 1
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId],
  );
  return result.rowCount === 1;
}

export async function createNotification(payload: NotificationPayload, executor: Queryable = db): Promise<void> {
  const severity = payload.severity ?? "info";
  const existing = await queryNotificationDedupeCandidate(payload, executor);

  if (existing) {
    return;
  }

  if (payload.targetUserId && !(await notificationTargetUserExists(payload.targetUserId, executor))) {
    await recordNotificationFailureEvent("notifications.create.skipped_missing_target_user", new Error("Notification target user no longer exists."), {
      audienceRole: payload.audienceRole,
      kind: payload.kind,
      caseId: payload.caseId ?? null,
      caseUid: payload.caseUid ?? null,
      targetId: payload.targetId ?? null,
      targetUserId: payload.targetUserId,
    });
    return;
  }

  try {
    await executor.query(
      `
        INSERT INTO notifications (
          audience_role,
          mode,
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
          severity,
          dedupe_key,
          expires_at,
          acked_at,
          is_read,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NULL, FALSE, NOW())
      `,
      [
        payload.audienceRole,
        payload.mode ?? "LIVE",
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
        severity,
        payload.dedupeKey ?? null,
        payload.expiresAt ?? null,
      ],
    );
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (payload.dedupeKey && code === "23505") {
      return;
    }
    await recordNotificationFailureEvent("notifications.create", error, {
      audienceRole: payload.audienceRole,
      kind: payload.kind,
      caseId: payload.caseId ?? null,
      caseUid: payload.caseUid ?? null,
      targetId: payload.targetId ?? null,
    });
    throw error;
  }
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
  await materializeOperationalNotifications(user);

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
      WHERE ${getNotificationScopeWhere()}
        AND ${getNotificationModeWhere(5)}
        AND (expires_at IS NULL OR expires_at > NOW())
    `,
    [user.id, user.role, user.teamId, user.hospitalId, user.currentMode],
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
        severity,
        dedupe_key,
        expires_at::text AS expires_at,
        acked_at::text AS acked_at,
        created_at::text AS created_at,
        is_read
      FROM notifications
      WHERE ${getNotificationScopeWhere()}
        AND ${getNotificationModeWhere(5)}
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC, id DESC
      LIMIT $6
    `,
    [user.id, user.role, user.teamId, user.hospitalId, user.currentMode, maxLimit],
  );

  const scopeRow = scopeRes.rows[0];
  return {
    items: listRes.rows.map(toNotificationItem),
    unreadCount: Number(scopeRow?.unread_count ?? 0),
    unreadMenuKeys: scopeRow?.unread_menu_keys ?? [],
    unreadTabKeys: scopeRow?.unread_tab_keys ?? [],
  };
}

export async function markNotificationsRead(user: AuthenticatedUser, opts: NotificationOpsOptions): Promise<number> {
  const ids = Array.isArray(opts.ids)
    ? opts.ids
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
    : [];

  const filters: string[] = [];
  const values: unknown[] = [user.id, user.role, user.teamId, user.hospitalId, user.currentMode, Boolean(opts.ack)];

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
          read_at = NOW(),
          acked_at = CASE
            WHEN $6::boolean = TRUE AND severity IN ('warning', 'critical') THEN COALESCE(acked_at, NOW())
            ELSE acked_at
          END
      WHERE is_read = FALSE
        AND ${getNotificationScopeWhere()}
        AND ${getNotificationModeWhere(5)}
        AND (expires_at IS NULL OR expires_at > NOW())
        ${whereExtra}
    `,
    values,
  );

  return res.rowCount ?? 0;
}
