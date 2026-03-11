import { DashboardPageSkeleton } from "@/components/shared/loading";

export default function Loading() {
  return <DashboardPageSkeleton summaryCount={3} panelCount={4} />;
}
