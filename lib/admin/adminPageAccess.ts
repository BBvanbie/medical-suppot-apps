import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/authContext";
import { authorizeAdminRoute, type AuthenticatedAdminUser } from "@/lib/routeAccess";

export async function requireAdminUser(): Promise<AuthenticatedAdminUser> {
  const access = authorizeAdminRoute(await getAuthenticatedUser());
  if (!access.ok) redirect("/login");
  return access.user;
}
