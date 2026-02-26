import { auth } from "@/auth";
import { db } from "@/lib/db";

type OperatorInfo = {
  name: string;
  code: string;
};

export async function getHospitalOperator(): Promise<OperatorInfo> {
  const session = await auth();
  const user = session?.user as
    | {
        id?: string;
        username?: string;
        displayName?: string;
      }
    | undefined;

  let name = user?.displayName || user?.username || "病院アカウント";
  let code = user?.username || "-";

  if (user?.id) {
    const result = await db.query<{
      source_no: number | null;
      name: string | null;
    }>(
      `
        SELECT h.source_no, h.name
        FROM users u
        LEFT JOIN hospitals h ON h.id = u.hospital_id
        WHERE u.id = $1
        LIMIT 1
      `,
      [Number(user.id)],
    );

    const row = result.rows[0];
    if (row?.name) name = row.name;
    if (row?.source_no != null) code = `H-${row.source_no}`;
  }

  return { name, code };
}
