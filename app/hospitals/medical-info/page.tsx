import { redirect } from "next/navigation";

import { HospitalMedicalInfoPage } from "@/components/hospitals/HospitalMedicalInfoPage";
import { HospitalPortalShell } from "@/components/hospitals/HospitalPortalShell";
import { getAuthenticatedUser } from "@/lib/authContext";
import { listHospitalDepartmentAvailability } from "@/lib/hospitalDepartmentAvailabilityRepository";
import { getHospitalOperator } from "@/lib/hospitalOperator";

export default async function HospitalMedicalInfoRoutePage() {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "HOSPITAL" || !user.hospitalId) {
    redirect("/");
  }

  const [operator, items] = await Promise.all([
    getHospitalOperator(),
    listHospitalDepartmentAvailability(user.hospitalId),
  ]);

  return (
    <HospitalPortalShell hospitalName={operator.name} hospitalCode={operator.code} currentMode={user.currentMode}>
      <HospitalMedicalInfoPage
        initialItems={items.map((item) => ({
          departmentId: String(item.departmentId),
          departmentName: item.departmentName,
          departmentShortName: item.departmentShortName,
          isAvailable: item.isAvailable,
          updatedAt: item.updatedAt,
        }))}
      />
    </HospitalPortalShell>
  );
}
