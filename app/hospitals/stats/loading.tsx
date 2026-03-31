import { DashboardPageSkeleton } from "@/components/shared/loading";

export default function Loading() {
  return <DashboardPageSkeleton summaryCount={6} panelCount={4} />;
}
