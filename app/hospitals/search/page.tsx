import { HospitalSearchPage } from "@/components/hospitals/HospitalSearchPage";
import { db } from "@/lib/db";

type DepartmentRow = {
  id: number;
  name: string;
  short_name: string;
};

type MunicipalityRow = {
  municipality: string;
};

type HospitalRow = {
  name: string;
};

export default async function HospitalSearchRoutePage() {
  const [departmentRes, municipalityRes, hospitalRes] = await Promise.all([
    db.query<DepartmentRow>("SELECT id, name, short_name FROM medical_departments ORDER BY id ASC"),
    db.query<MunicipalityRow>(
      "SELECT DISTINCT municipality FROM hospitals WHERE municipality IS NOT NULL AND municipality <> '' ORDER BY municipality ASC",
    ),
    db.query<HospitalRow>("SELECT name FROM hospitals ORDER BY name ASC"),
  ]);

  return (
    <HospitalSearchPage
      departments={departmentRes.rows.map((row: DepartmentRow) => ({
        id: row.id,
        name: row.name,
        shortName: row.short_name,
      }))}
      municipalities={municipalityRes.rows.map((row: MunicipalityRow) => row.municipality)}
      hospitals={hospitalRes.rows.map((row: HospitalRow) => row.name)}
    />
  );
}
