import { PageFrame } from "@/components/layout/PageFrame";

type SettingPageLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  tone?: "ems" | "hospital" | "admin";
};

const toneClassMap = {
  ems: {
    eyebrow: "portal-eyebrow portal-eyebrow--ems",
    shell: "border-blue-100/80 bg-blue-50/40",
    panel: "border-blue-100/80 bg-white shadow-[0_24px_54px_-40px_rgba(15,23,42,0.28)]",
    badge: "border-blue-200/80 bg-blue-50 text-blue-700",
  },
  hospital: {
    eyebrow: "portal-eyebrow portal-eyebrow--hospital",
    shell: "border-emerald-100/80 bg-emerald-50/40",
    panel: "border-emerald-100/80 bg-white shadow-[0_24px_54px_-40px_rgba(15,23,42,0.28)]",
    badge: "border-emerald-200/80 bg-emerald-50 text-emerald-700",
  },
  admin: {
    eyebrow: "portal-eyebrow portal-eyebrow--admin",
    shell: "border-orange-100/80 bg-orange-50/40",
    panel: "border-orange-100/80 bg-white shadow-[0_24px_54px_-40px_rgba(15,23,42,0.28)]",
    badge: "border-orange-200/80 bg-orange-50 text-orange-700",
  },
} as const;

export function SettingPageLayout({
  eyebrow,
  title,
  description,
  children,
  tone = "admin",
}: SettingPageLayoutProps) {
  const toneClasses = toneClassMap[tone];

  return (
    <PageFrame width="default" gap="lg">
      <header className={["overflow-hidden rounded-[30px] border px-6 py-5", toneClasses.shell].join(" ")}>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.75fr)] xl:items-end">
          <div className="page-section-copy max-w-[56rem]">
            <p className={toneClasses.eyebrow}>{eyebrow}</p>
            <h1 className="mt-2 text-[2rem] font-bold tracking-tight text-slate-900">{title}</h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
          </div>
          <div className={["rounded-[24px] border px-4 py-4", toneClasses.panel].join(" ")}>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-slate-500">SETTINGS WORKBENCH</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={["inline-flex rounded-full border px-3 py-1 text-xs font-semibold", toneClasses.badge].join(" ")}>一覧と詳細を近接表示</span>
              <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">即時保存 / 閲覧専用を明示</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">端末情報、通知、同期、表示条件を role ごとのアクセントで統一し、設定画面でも同じ視線順で確認できる構成に揃えます。</p>
          </div>
        </div>
      </header>
      {children}
    </PageFrame>
  );
}
