import { HomeDashboard } from "@/components/home/HomeDashboard";
import { auth } from "@/auth";
import { ensureCasesColumns } from "@/lib/casesSchema";
import { db } from "@/lib/db";

type CaseRow = {
  case_id: string;
  division: string;
  aware_date: string;
  aware_time: string;
  address: string;
  patient_name: string;
  age: number;
  destination: string | null;
};

export default async function Home() {
  const [session] = await Promise.all([auth(), ensureCasesColumns()]);

  const user = session?.user as
    | {
        id?: string;
        username?: string;
        displayName?: string;
      }
    | undefined;

  const res = await db.query<CaseRow>(
    `
    SELECT case_id, division, aware_date, aware_time, address, patient_name, age, destination
    FROM cases
    ORDER BY updated_at DESC, id DESC
    LIMIT 200
    `,
  );

  const rows = res.rows.map((row: CaseRow) => ({
    caseId: row.case_id,
    division: row.division,
    awareDate: row.aware_date,
    awareTime: row.aware_time,
    address: row.address,
    name: row.patient_name,
    age: row.age,
    destination: row.destination,
  }));

  let operatorName = user?.displayName || user?.username || "救急隊";
  let operatorCode = user?.username || "-";

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
    if (team?.team_name) operatorName = team.team_name;
    if (team?.team_code) operatorCode = team.team_code;
  }

  return <HomeDashboard rows={rows} operatorName={operatorName} operatorCode={operatorCode} />;
}
