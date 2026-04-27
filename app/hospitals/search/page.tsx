import { Suspense } from "react";
import { notFound } from "next/navigation";

import { HospitalSearchPage } from "@/components/hospitals/HospitalSearchPage";
import { getAuthenticatedUser } from "@/lib/authContext";
import { db } from "@/lib/db";
import { getEmsOperator } from "@/lib/emsOperator";
import { getEmsOperationalMode } from "@/lib/emsSettingsRepository";

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
  const [departmentRes, municipalityRes, hospitalRes, user, operator] = await Promise.all([
    db.query<DepartmentRow>("SELECT id, name, short_name FROM medical_departments ORDER BY id ASC"),
    db.query<MunicipalityRow>(
      "SELECT DISTINCT municipality FROM hospitals WHERE municipality IS NOT NULL AND municipality <> '' ORDER BY municipality ASC",
    ),
    db.query<HospitalRow>("SELECT name FROM hospitals ORDER BY name ASC"),
    getAuthenticatedUser(),
    getEmsOperator(),
  ]);
  if (user?.role !== "EMS") notFound();
  const operationalMode = await getEmsOperationalMode(user.id);

  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">読込中...</div>}>
      <HospitalSearchPage
        operatorName={operator.name}
        operatorCode={operator.code}
        operationalMode={operationalMode}
        departments={departmentRes.rows.map((row: DepartmentRow) => ({
          id: row.id,
          name: row.name,
          shortName: row.short_name,
        }))}
        municipalities={municipalityRes.rows.map((row: MunicipalityRow) => row.municipality)}
        hospitals={hospitalRes.rows.map((row: HospitalRow) => row.name)}
      />
    </Suspense>
  );
}
