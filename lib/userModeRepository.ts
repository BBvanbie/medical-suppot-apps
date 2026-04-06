import type { AppMode } from "@/lib/appMode";
import { db } from "@/lib/db";

export async function getUserMode(userId: number): Promise<AppMode> {
  const result = await db.query<{ current_mode: AppMode | null }>(
    `
      SELECT current_mode
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId],
  );

  return result.rows[0]?.current_mode ?? "LIVE";
}

export async function updateUserMode(userId: number, mode: AppMode): Promise<AppMode> {
  const result = await db.query<{ current_mode: AppMode }>(
    `
      UPDATE users
      SET current_mode = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING current_mode
    `,
    [userId, mode],
  );

  return result.rows[0]?.current_mode ?? mode;
}
