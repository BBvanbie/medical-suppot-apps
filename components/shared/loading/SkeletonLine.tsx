"use client";

type SkeletonLineProps = {
  className?: string;
};

export function SkeletonLine({ className = "" }: SkeletonLineProps) {
  return <div className={`h-4 ds-skeleton-line ${className}`.trim()} aria-hidden="true" />;
}
