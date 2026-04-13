import { SettingReadOnlyBadge } from "@/components/settings/SettingReadOnlyBadge";
import { SettingSection } from "@/components/settings/SettingSection";

type ReadOnlySettingsSectionProps = {
  title: string;
  description: string;
  items: Array<{ label: string; value: string }>;
  tone?: "ems" | "hospital" | "admin";
};

const itemToneClassMap = {
  ems: "border-blue-100/80",
  hospital: "border-emerald-100/80",
  admin: "border-orange-100/80",
} as const;

export function ReadOnlySettingsSection({ title, description, items, tone = "admin" }: ReadOnlySettingsSectionProps) {
  return (
    <SettingSection title={title} description={description} tone={tone}>
      <div className="mb-4 flex justify-end">
        <SettingReadOnlyBadge />
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        {items.map((item) => (
          <div key={item.label} className={["grid gap-2 border-b px-4 py-4 last:border-b-0 md:grid-cols-[180px_minmax(0,1fr)] md:items-center", itemToneClassMap[tone]].join(" ")}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
            <p className="break-words text-sm font-semibold text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>
    </SettingSection>
  );
}
