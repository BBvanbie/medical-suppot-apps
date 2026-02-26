import { notFound } from "next/navigation";
import { HospitalPortalShell } from "@/components/hospitals/HospitalPortalShell";
import { HospitalRequestDetail } from "@/components/hospitals/HospitalRequestDetail";
import { getAuthenticatedUser } from "@/lib/authContext";
import { getHospitalOperator } from "@/lib/hospitalOperator";
import { ensureHospitalRequestTables } from "@/lib/hospitalRequestSchema";
import { getHospitalRequestDetail, markHospitalRequestAsRead } from "@/lib/hospitalRequestRepository";

type Params = {
  params: Promise<{ targetId: string }>;
};

async function loadDetail(targetId: number, userHospitalId: number, userId: number) {
  await ensureHospitalRequestTables();
  const detail = await getHospitalRequestDetail(targetId);
  if (!detail || detail.hospitalId !== userHospitalId) return null;

  if (detail.status === "UNREAD") {
    const changed = await markHospitalRequestAsRead(targetId, userId);
    if (changed) {
      detail.status = "READ";
      detail.statusLabel = "既読";
    }
  }

  return detail;
}

export default async function HospitalRequestDetailPage({ params }: Params) {
  const { targetId: rawTargetId } = await params;
  const targetId = Number(rawTargetId);
  if (!Number.isFinite(targetId)) notFound();

  const [user, operator] = await Promise.all([getAuthenticatedUser(), getHospitalOperator()]);
  if (!user || user.role !== "HOSPITAL" || !user.hospitalId) notFound();

  const detail = await loadDetail(targetId, user.hospitalId, user.id);
  if (!detail) notFound();

  return (
    <HospitalPortalShell hospitalName={operator.name} hospitalCode={operator.code}>
      <div className="mx-auto w-full max-w-[1320px]">
        <HospitalRequestDetail detail={detail} />
      </div>
    </HospitalPortalShell>
  );
}
