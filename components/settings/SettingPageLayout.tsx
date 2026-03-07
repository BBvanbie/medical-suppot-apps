type SettingPageLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function SettingPageLayout({ eyebrow, title, description, children }: SettingPageLayoutProps) {
  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
      </header>
      {children}
    </div>
  );
}
