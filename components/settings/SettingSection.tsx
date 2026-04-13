import { PageSection } from "@/components/layout/PageSection";

type SettingSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  tone?: "ems" | "hospital" | "admin" | "dispatch";
};

const toneCardClassMap = {
  ems: "border-blue-100/80 bg-white shadow-none",
  hospital: "border-emerald-100/80 bg-white shadow-none",
  admin: "border-orange-100/80 bg-white shadow-none",
  dispatch: "border-amber-100/80 bg-white shadow-none",
} as const;

export function SettingSection({ title, description, children, tone = "admin" }: SettingSectionProps) {
  return <PageSection title={title} description={description} cardClassName={toneCardClassMap[tone]}>{children}</PageSection>;
}
