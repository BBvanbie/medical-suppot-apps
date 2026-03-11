"use client";

import { startTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type AutoRefreshOnIntervalProps = {
  intervalMs?: number;
};

export function AutoRefreshOnInterval({ intervalMs = 10000 }: AutoRefreshOnIntervalProps) {
  const router = useRouter();
  const refreshingRef = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      startTransition(() => {
        router.refresh();
        window.setTimeout(() => {
          refreshingRef.current = false;
        }, 1200);
      });
    }, intervalMs);

    return () => {
      window.clearInterval(timer);
      refreshingRef.current = false;
    };
  }, [intervalMs, router]);

  return null;
}
