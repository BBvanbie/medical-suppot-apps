import { auth } from "@/auth";
import { db } from "@/lib/db";

type OperatorInfo = {
  name: string;
  code: string;
};

export async function getEmsOperator(): Promise<OperatorInfo> {
  const session = await auth();
  const user = session?.user as
    | {
        id?: string;
        username?: string;
        displayName?: string;
      }
    | undefined;

  let name = user?.displayName || user?.username || "救急隊";
  let code = user?.username || "-";

  if (user?.id) {
    const teamRes = await db.query<{
      team_code: string | null;
      team_name: string | null;
    }>(
      `
        SELECT et.team_code, et.team_name
        FROM users u
        LEFT JOIN emergency_teams et ON et.id = u.team_id
        WHERE u.id = $1
        LIMIT 1
      `,
      [Number(user.id)],
    );

    const team = teamRes.rows[0];
    if (team?.team_name) name = team.team_name;
    if (team?.team_code) code = team.team_code;
  }

  return { name, code };
}

