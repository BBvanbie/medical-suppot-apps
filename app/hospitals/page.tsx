import Link from "next/link";
import { redirect } from "next/navigation";

import { HospitalHomeKpiSection } from "@/components/hospitals/HospitalHomeKpiSection";
import { HospitalPortalShell } from "@/components/hospitals/HospitalPortalShell";
import { getAuthenticatedUser } from "@/lib/authContext";
import { getHospitalHomeMetrics } from "@/lib/hospitalHomeMetrics";
import { hospitalNavItems } from "@/lib/hospitalNavItems";
import { getHospitalOperator } from "@/lib/hospitalOperator";
import { getHospitalDashboardSettings } from "@/lib/hospitalSettingsRepository";
import { ensureHospitalSettingsSchema } from "@/lib/hospitalSettingsSchema";

export default async function HospitalsPage() {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "HOSPITAL" || !user.hospitalId) {
    redirect("/");
  }

  await ensureHospitalSettingsSchema();

  const [operator, metrics, dashboardSettings] = await Promise.all([
    getHospitalOperator(),
    getHospitalHomeMetrics(user.hospitalId),
    getHospitalDashboardSettings(user.hospitalId),
  ]);

  return (
    <HospitalPortalShell hospitalName={operator.name} hospitalCode={operator.code}>
      <div className="w-full min-w-0">
        <header className="mb-5">
          <p className="portal-eyebrow portal-eyebrow--hospital">HOSPITAL PORTAL</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{"\u75c5\u9662\u30db\u30fc\u30e0"}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {"\u53d7\u5165\u5bfe\u5fdc\u306e\u5c0e\u7dda\u3068 KPI \u3092\u307e\u3068\u3081\u3066\u78ba\u8a8d\u3067\u304d\u307e\u3059\u3002"}
          </p>
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          {hospitalNavItems.filter((item) => item.href != "/hospitals").map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.22)] transition hover:border-emerald-200 hover:shadow-[0_24px_44px_-28px_rgba(5,150,105,0.3)]"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-100">
                  <item.icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-600">MENU</p>
                  <h2 className="mt-1 text-sm font-bold leading-5 text-slate-900">{item.label}</h2>
                </div>
              </div>
            </Link>
          ))}
        </section>

        <HospitalHomeKpiSection
          metrics={metrics}
          initialResponseTargetMinutes={dashboardSettings.responseTargetMinutes}
        />
      </div>
    </HospitalPortalShell>
  );
}
