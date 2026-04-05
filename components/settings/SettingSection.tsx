import { PageSection } from "@/components/layout/PageSection";

type SettingSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  tone?: "ems" | "hospital" | "admin";
};

const toneCardClassMap = {
  ems: "border-blue-100/80 bg-white shadow-[0_18px_40px_-32px_rgba(15,23,42,0.22)]",
  hospital: "border-emerald-100/80 bg-white shadow-[0_18px_40px_-32px_rgba(15,23,42,0.22)]",
  admin: "border-orange-100/80 bg-white shadow-[0_18px_40px_-32px_rgba(15,23,42,0.22)]",
} as const;

export function SettingSection({ title, description, children, tone = "admin" }: SettingSectionProps) {
  return <PageSection title={title} description={description} cardClassName={toneCardClassMap[tone]}>{children}</PageSection>;
}
