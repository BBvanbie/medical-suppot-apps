import { SettingCard } from "@/components/settings/SettingCard";

type SettingSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function SettingSection({ title, description, children }: SettingSectionProps) {
  return (
    <SettingCard className="border-slate-200 bg-white">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {children}
    </SettingCard>
  );
}
