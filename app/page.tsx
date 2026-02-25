import { HomeDashboard } from "@/components/home/HomeDashboard";
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
  await ensureCasesColumns();
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

  return <HomeDashboard rows={rows} />;
}
