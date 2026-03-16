import { ContentCard } from "@/components/layout/ContentCard";

type SettingCardProps = {
  children: React.ReactNode;
  className?: string;
};

export function SettingCard({ children, className = "" }: SettingCardProps) {
  return <ContentCard className={["settings-density-card", className].filter(Boolean).join(" ")}>{children}</ContentCard>;
}
