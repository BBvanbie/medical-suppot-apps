"use client";

type SkeletonLineProps = {
  className?: string;
};

export function SkeletonLine({ className = "" }: SkeletonLineProps) {
  return <div className={`h-4 animate-pulse rounded-full bg-slate-200/80 ${className}`.trim()} aria-hidden="true" />;
}
