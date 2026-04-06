import { notFound } from "next/navigation";

import { CaseFormPage } from "@/components/cases/CaseFormPage";
import { getAuthenticatedUser } from "@/lib/authContext";
import { getEmsOperator } from "@/lib/emsOperator";

export default async function NewCasePage() {
  const [operator, user] = await Promise.all([getEmsOperator(), getAuthenticatedUser()]);
  if (user?.role !== "EMS") notFound();
  return <CaseFormPage mode="create" operatorName={operator.name} operatorCode={operator.code} currentMode={user.currentMode} />;
}
