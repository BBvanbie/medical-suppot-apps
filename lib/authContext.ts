import { auth } from "@/auth";
import { db } from "@/lib/db";

export type AuthenticatedUser = {
  id: number;
  username: string;
  role: "EMS" | "HOSPITAL" | "ADMIN";
  teamId: number | null;
  hospitalId: number | null;
};

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const session = await auth();
  const sessionUser = session?.user as { id?: string; username?: string; role?: string } | undefined;
  if (!sessionUser?.id || !sessionUser.username || !sessionUser.role) return null;

  const res = await db.query<{
    id: number;
    username: string;
    role: "EMS" | "HOSPITAL" | "ADMIN";
    team_id: number | null;
    hospital_id: number | null;
  }>(
    `
      SELECT id, username, role, team_id, hospital_id
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
  };
}

