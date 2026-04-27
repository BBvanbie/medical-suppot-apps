import { notFound } from "next/navigation";

import { CaseSearchPageContent } from "@/components/cases/CaseSearchPageContent";
import { EmsPortalShell } from "@/components/ems/EmsPortalShell";
import { getAuthenticatedUser } from "@/lib/authContext";
import { getEmsOperator } from "@/lib/emsOperator";
import { getEmsOperationalMode } from "@/lib/emsSettingsRepository";

export default async function CaseSelectionRequestsPage() {
  const [operator, user] = await Promise.all([getEmsOperator(), getAuthenticatedUser()]);
  if (user?.role !== "EMS") notFound();
  const operationalMode = await getEmsOperationalMode(user.id);

  return (
    <EmsPortalShell operatorName={operator.name} operatorCode={operator.code} currentMode={user.currentMode} operationalMode={operationalMode}>
      <CaseSearchPageContent operationalMode={operationalMode} listScope="selectionRequests" />
    </EmsPortalShell>
  );
}
