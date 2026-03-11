"use client";

import { InlineSpinner } from "@/components/shared/loading/InlineSpinner";

type LoadingLabelProps = {
  label: string;
  className?: string;
};

export function LoadingLabel({ label, className = "" }: LoadingLabelProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`.trim()}>
      <InlineSpinner />
      <span>{label}</span>
    </span>
  );
}
