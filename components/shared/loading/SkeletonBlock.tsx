"use client";

type SkeletonBlockProps = {
  className?: string;
};

export function SkeletonBlock({ className = "" }: SkeletonBlockProps) {
  return <div className={`ds-skeleton-block ${className}`.trim()} aria-hidden="true" />;
}
