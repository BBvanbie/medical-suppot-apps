import { SkeletonBlock, SkeletonLine } from "@/components/shared/loading";

export default function Loading() {
  return (
    <main className="dashboard-shell flex min-h-screen items-center justify-center px-4 py-8">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 ds-shadow-modal-deep">
        <div className="space-y-3">
          <SkeletonLine className="h-4 w-28" />
          <SkeletonLine className="h-8 w-56" />
          <SkeletonLine className="w-72" />
        </div>
        <div className="mt-6 space-y-4">
          <SkeletonBlock className="h-12" />
          <SkeletonBlock className="h-12" />
          <SkeletonBlock className="h-11" />
        </div>
      </section>
    </main>
  );
}
