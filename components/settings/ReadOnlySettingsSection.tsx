import { SettingReadOnlyBadge } from "@/components/settings/SettingReadOnlyBadge";
import { SettingSection } from "@/components/settings/SettingSection";

type ReadOnlySettingsSectionProps = {
  title: string;
  description: string;
  items: Array<{ label: string; value: string }>;
};

export function ReadOnlySettingsSection({ title, description, items }: ReadOnlySettingsSectionProps) {
  return (
    <SettingSection title={title} description={description}>
      <div className="mb-4 flex justify-end">
        <SettingReadOnlyBadge />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
            <p className="mt-2 text-base font-semibold text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>
    </SettingSection>
  );
}
