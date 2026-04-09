import { SettingReadOnlyBadge } from "@/components/settings/SettingReadOnlyBadge";
import { SettingSection } from "@/components/settings/SettingSection";

type ReadOnlySettingsSectionProps = {
  title: string;
  description: string;
  items: Array<{ label: string; value: string }>;
  tone?: "ems" | "hospital" | "admin";
};

const itemToneClassMap = {
  ems: "border-blue-100/80 bg-blue-50/30",
  hospital: "border-emerald-100/80 bg-emerald-50/30",
  admin: "border-orange-100/80 bg-orange-50/30",
} as const;

export function ReadOnlySettingsSection({ title, description, items, tone = "admin" }: ReadOnlySettingsSectionProps) {
  return (
    <SettingSection title={title} description={description} tone={tone}>
      <div className="mb-4 flex justify-end">
        <SettingReadOnlyBadge />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className={["rounded-2xl border px-4 py-4", itemToneClassMap[tone]].join(" ")}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
            <p className="mt-2 break-words text-base font-semibold text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>
    </SettingSection>
  );
}
