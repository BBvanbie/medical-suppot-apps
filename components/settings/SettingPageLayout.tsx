import { PageFrame } from "@/components/layout/PageFrame";

type SettingPageLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  tone?: "ems" | "hospital" | "admin" | "dispatch";
  operationTone?: "standard" | "triage";
  sectionLabel?: string;
  heroNote?: string;
  width?: "form" | "default" | "wide" | "full";
};

const toneClassMap = {
  ems: {
    eyebrow: "portal-eyebrow portal-eyebrow--ems",
    shell: "border-blue-100/80 bg-blue-50/40",
    panel: "border-blue-100/80 bg-white shadow-none",
    badge: "border-blue-200/80 bg-blue-50 text-blue-700",
  },
  hospital: {
    eyebrow: "portal-eyebrow portal-eyebrow--hospital",
    shell: "border-emerald-100/80 bg-emerald-50/40",
    panel: "border-emerald-100/80 bg-white shadow-none",
    badge: "border-emerald-200/80 bg-emerald-50 text-emerald-700",
  },
  admin: {
    eyebrow: "portal-eyebrow portal-eyebrow--admin",
    shell: "border-orange-100/80 bg-orange-50/40",
    panel: "border-orange-100/80 bg-white shadow-none",
    badge: "border-orange-200/80 bg-orange-50 text-orange-700",
  },
  dispatch: {
    eyebrow: "text-[11px] font-semibold tracking-[0.22em] text-amber-600",
    shell: "border-amber-100/80 bg-amber-50/40",
    panel: "border-amber-100/80 bg-white shadow-none",
    badge: "border-amber-200/80 bg-amber-50 text-amber-700",
  },
} as const;

export function SettingPageLayout({
  eyebrow,
  title,
  description,
  children,
  tone = "admin",
  operationTone = "standard",
  sectionLabel,
  heroNote,
  width = "default",
}: SettingPageLayoutProps) {
  const toneClasses = toneClassMap[tone];
  const isEmsTriage = tone === "ems" && operationTone === "triage";

  return (
    <PageFrame width={width} gap="lg">
      <header
        className={[
          "ems-settings-hero ds-panel-surface ds-panel-surface--hero overflow-hidden px-5 py-4 xl:px-6 xl:py-5",
          isEmsTriage ? "border-rose-200/80 bg-white text-slate-900" : toneClasses.shell,
        ].join(" ")}
      >
        <div className="page-hero-grid">
          <div className="page-hero-copy">
            <p className={["ems-settings-eyebrow", isEmsTriage ? "text-[11px] font-semibold tracking-[0.22em] text-rose-700" : toneClasses.eyebrow].join(" ")}>{eyebrow}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="ems-settings-title page-hero-title mt-0">{title}</h1>
              {sectionLabel ? (
                <span className={["inline-flex rounded-full border px-3 py-1 text-xs font-semibold", toneClasses.badge].join(" ")}>
                  {sectionLabel}
                </span>
              ) : null}
            </div>
            <p className={["ems-settings-description page-hero-description", isEmsTriage ? "text-rose-900" : ""].filter(Boolean).join(" ")}>{description}</p>
          </div>
          <div className={["ems-settings-aside page-hero-aside", isEmsTriage ? "border-rose-200 bg-rose-50 text-rose-900" : toneClasses.panel].join(" ")}>
            <p className={["ems-settings-kicker page-hero-kicker", isEmsTriage ? "text-rose-700" : ""].filter(Boolean).join(" ")}>SETTINGS WORKBENCH</p>
            <div className="page-hero-chip-row">
              <span className={["inline-flex rounded-full border px-3 py-1 text-xs font-semibold", toneClasses.badge].join(" ")}>
                設定トップと同じ header 文法
              </span>
              {sectionLabel ? (
                <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                  {sectionLabel}
                </span>
              ) : (
                <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                  即時保存 / 閲覧専用を明示
                </span>
              )}
            </div>
            <p className="page-hero-note">
              {heroNote ?? "設定トップと同じ視線順で、確認対象と操作対象を近接配置します。"}
            </p>
          </div>
        </div>
      </header>
      {children}
    </PageFrame>
  );
}
