import { redirect } from "next/navigation";

import { DispatchCaseBoard } from "@/components/dispatch/DispatchCaseBoard";
import { getAuthenticatedUser } from "@/lib/authContext";
import { listDispatchCases } from "@/lib/dispatch/dispatchRepository";
import { ensureDispatchSchema } from "@/lib/dispatch/dispatchSchema";

export default async function DispatchCasesPage() {
  const user = await getAuthenticatedUser();
  if (!user || (user.role !== "DISPATCH" && user.role !== "ADMIN")) {
    redirect("/");
  }

  await ensureDispatchSchema();
  const rows = await listDispatchCases(user.currentMode, "commandHistory");

  return <DispatchCaseBoard rows={rows} mode={user.currentMode} variant="commandHistory" />;
}
