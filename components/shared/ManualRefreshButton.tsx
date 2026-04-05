"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { BUTTON_BASE_CLASS, BUTTON_VARIANT_CLASS } from "@/components/shared/buttonStyles";

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
      className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.secondary} ${className}`.trim()}
    >
      {refreshing ? "更新中..." : label}
    </button>
  );
}
