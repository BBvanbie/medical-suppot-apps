type SettingCardProps = {
  children: React.ReactNode;
  className?: string;
};

export function SettingCard({ children, className = "" }: SettingCardProps) {
  return (
    <div className={`rounded-3xl border bg-white p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)] ${className}`.trim()}>
      {children}
    </div>
  );
}
