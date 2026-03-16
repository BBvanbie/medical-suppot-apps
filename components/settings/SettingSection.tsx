import { PageSection } from "@/components/layout/PageSection";

type SettingSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function SettingSection({ title, description, children }: SettingSectionProps) {
  return <PageSection title={title} description={description} cardClassName="border-slate-200 bg-white">{children}</PageSection>;
}
