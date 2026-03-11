import { DashboardPageSkeleton } from "@/components/shared/loading";

export default function Loading() {
  return <DashboardPageSkeleton summaryCount={4} panelCount={3} />;
}
