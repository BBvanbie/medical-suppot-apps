type SettingReadOnlyBadgeProps = {
  children?: React.ReactNode;
};

export function SettingReadOnlyBadge({ children = "閲覧のみ" }: SettingReadOnlyBadgeProps) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{children}</span>;
}
