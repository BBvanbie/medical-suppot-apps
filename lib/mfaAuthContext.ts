import { auth } from "@/auth";
import type { AuthenticatedUser } from "@/lib/authContext";
import type { AppMode } from "@/lib/appMode";
import { db } from "@/lib/db";
import { ensureSecurityAuthSchema } from "@/lib/securityAuthSchema";
import { ensureUserModeSchema } from "@/lib/userModeSchema";

export async function getMfaPendingAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const session = await auth();
  const sessionUser = session?.user as {
    id?: string;
    username?: string;
    role?: string;
    authExpired?: boolean;
    authInvalidated?: boolean;
  } | undefined;
  if (!sessionUser?.id || !sessionUser.username || !sessionUser.role) return null;
  if (sessionUser.authExpired || sessionUser.authInvalidated) return null;

  await ensureSecurityAuthSchema();
  await ensureUserModeSchema();

  const res = await db.query<{
    id: number;
    username: string;
    role: "EMS" | "HOSPITAL" | "ADMIN" | "DISPATCH";
    team_id: number | null;
    hospital_id: number | null;
    current_mode: AppMode;
  }>(
    `
      SELECT id, username, role, team_id, hospital_id, current_mode
      FROM users
      WHERE id = $1
        AND is_active = TRUE
      LIMIT 1
    `,
    [Number(sessionUser.id)],
  );

  const row = res.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    teamId: row.team_id,
    hospitalId: row.hospital_id,
    currentMode: row.current_mode,
  };
}
