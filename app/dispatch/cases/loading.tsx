import { DispatchWorkbenchSkeleton } from "@/components/role/RoleLoading";

export default function Loading() {
  return <DispatchWorkbenchSkeleton metricCount={3} panelCount={2} />;
}
