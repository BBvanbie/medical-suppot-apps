import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { RegisterDeviceCard } from "@/components/auth/RegisterDeviceCard";
import { isAppRole } from "@/lib/auth";

export default async function RegisterDevicePage() {
  const session = await auth();
  const sessionUser = session?.user as
    | {
        role?: string;
        authExpired?: boolean;
        authInvalidated?: boolean;
        deviceTrusted?: boolean;
        mustChangePassword?: boolean;
      }
    | undefined;

  const role = sessionUser?.role;
  if (!role || !isAppRole(role) || sessionUser?.authExpired || sessionUser?.authInvalidated) {
    redirect("/login");
  }

  if (role !== "EMS" && role !== "HOSPITAL") {
    redirect("/");
  }

  if (sessionUser?.deviceTrusted) {
    if (sessionUser?.mustChangePassword) {
      redirect("/change-password");
    }
    redirect("/");
  }

  return (
    <main className="dashboard-shell app-screen-canvas flex items-center justify-center">
      <RegisterDeviceCard />
    </main>
  );
}
