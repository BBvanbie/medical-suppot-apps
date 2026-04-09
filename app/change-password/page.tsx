import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ChangePasswordCard } from "@/components/auth/ChangePasswordCard";
import { isAppRole } from "@/lib/auth";

export default async function ChangePasswordPage() {
  const session = await auth();
  const sessionUser = session?.user as
    | {
        role?: string;
        authExpired?: boolean;
        authInvalidated?: boolean;
        mustChangePassword?: boolean;
      }
    | undefined;

  const role = sessionUser?.role;
  if (!role || !isAppRole(role) || sessionUser?.authExpired || sessionUser?.authInvalidated) {
    redirect("/login");
  }

  return (
    <main className="dashboard-shell app-screen-canvas flex items-center justify-center">
      <ChangePasswordCard forced={Boolean(sessionUser?.mustChangePassword)} />
    </main>
  );
}
