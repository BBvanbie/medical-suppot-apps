"use client";

type SkeletonCircleProps = {
  className?: string;
};

export function SkeletonCircle({ className = "" }: SkeletonCircleProps) {
  return <div className={`animate-pulse rounded-full bg-slate-200/80 ${className}`.trim()} aria-hidden="true" />;
}
