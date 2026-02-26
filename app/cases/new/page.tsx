import { CaseFormPage } from "@/components/cases/CaseFormPage";
import { getEmsOperator } from "@/lib/emsOperator";

export default async function NewCasePage() {
  const operator = await getEmsOperator();
  return <CaseFormPage mode="create" operatorName={operator.name} operatorCode={operator.code} />;
}
