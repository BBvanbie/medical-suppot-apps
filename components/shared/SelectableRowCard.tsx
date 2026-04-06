"use client";

import type { ReactNode } from "react";

type SelectableRowCardProps = {
  selected: boolean;
  onSelect?: () => void;
  children: ReactNode;
  className?: string;
};

export function SelectableRowCard({
  selected,
  onSelect,
  children,
  className,
}: SelectableRowCardProps) {
  const Component = onSelect ? "button" : "div";

  return (
    <Component
      type={onSelect ? "button" : undefined}
      onClick={onSelect}
      className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${
        selected
          ? "border-orange-200 bg-orange-50/70"
          : "border-slate-200 bg-slate-50/70 hover:border-orange-200 hover:bg-orange-50/40"
      } ${className ?? ""}`.trim()}
    >
      {children}
    </Component>
  );
}
