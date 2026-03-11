"use client";

type InlineSpinnerProps = {
  className?: string;
};

export function InlineSpinner({ className = "" }: InlineSpinnerProps) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`.trim()}
      aria-hidden="true"
    />
  );
}
