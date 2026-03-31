import { DashboardPageSkeleton } from "@/components/shared/loading";

export default function Loading() {
  return <DashboardPageSkeleton summaryCount={8} panelCount={5} />;
}
