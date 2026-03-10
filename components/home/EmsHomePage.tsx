import { HomeDashboard } from "@/components/home/HomeDashboard";
import { getEmsOperator } from "@/lib/emsOperator";

export async function EmsHomePage() {
  const operator = await getEmsOperator();

  return <HomeDashboard operatorName={operator.name} operatorCode={operator.code} />;
}
