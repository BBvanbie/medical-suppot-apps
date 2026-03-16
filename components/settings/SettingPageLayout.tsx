import { PageFrame } from "@/components/layout/PageFrame";

type SettingPageLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  tone?: "ems" | "hospital" | "admin";
};

const toneClassMap = {
  ems: "portal-eyebrow portal-eyebrow--ems",
  hospital: "portal-eyebrow portal-eyebrow--hospital",
  admin: "portal-eyebrow portal-eyebrow--admin",
} as const;

export function SettingPageLayout({
  eyebrow,
  title,
  description,
  children,
  tone = "admin",
}: SettingPageLayoutProps) {
  return (
    <PageFrame width="default" gap="lg">
      <header className="settings-density-card rounded-3xl border border-slate-200 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
        <div className="page-section-copy max-w-[56rem]">
          <p className={toneClassMap[tone]}>{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
        </div>
      </header>
      {children}
    </PageFrame>
  );
}
