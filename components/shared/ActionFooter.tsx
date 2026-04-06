"use client";

import type { ReactNode } from "react";

type ActionFooterProps = {
  leading: ReactNode;
  actions: ReactNode;
  className?: string;
};

export function ActionFooter({ leading, actions, className }: ActionFooterProps) {
  return (
    <div className={`ds-muted-panel flex items-center justify-between gap-4 rounded-2xl px-4 py-4 ${className ?? ""}`.trim()}>
      <div className="min-h-10">{leading}</div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>
    </div>
  );
}
