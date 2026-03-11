"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoadingLabel } from "@/components/shared/loading/LoadingLabel";

type LoadingButtonVariant = "primary" | "secondary" | "danger";

type LoadingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingLabel?: string;
  variant?: LoadingButtonVariant;
  children: ReactNode;
};

const VARIANT_CLASS_NAMES: Record<LoadingButtonVariant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300",
  secondary:
    "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 disabled:opacity-60",
  danger: "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300",
};

export function LoadingButton({
  loading = false,
  loadingLabel = "処理中...",
  variant = "primary",
  disabled,
  className = "",
  children,
  ...props
}: LoadingButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      type="button"
      {...props}
      disabled={isDisabled}
      className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed ${VARIANT_CLASS_NAMES[variant]} ${className}`.trim()}
    >
      {loading ? <LoadingLabel label={loadingLabel} /> : children}
    </button>
  );
}
