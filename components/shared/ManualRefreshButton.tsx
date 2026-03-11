"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

type ManualRefreshButtonProps = {
  label?: string;
  className?: string;
};

export function ManualRefreshButton({ label = "更新", className = "" }: ManualRefreshButtonProps) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    startTransition(() => {
      router.refresh();
      window.setTimeout(() => setRefreshing(false), 800);
    });
  };

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={refreshing}
      className={`inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 ${className}`.trim()}
    >
      {refreshing ? "更新中..." : label}
    </button>
  );
}
