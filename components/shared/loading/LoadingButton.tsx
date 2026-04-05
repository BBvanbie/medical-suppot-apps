"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { BUTTON_BASE_CLASS, BUTTON_VARIANT_CLASS } from "@/components/shared/buttonStyles";
import { LoadingLabel } from "@/components/shared/loading/LoadingLabel";

type LoadingButtonVariant = "primary" | "secondary" | "danger";

type LoadingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingLabel?: string;
  variant?: LoadingButtonVariant;
  children: ReactNode;
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
      className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS[variant]} ${className}`.trim()}
    >
      {loading ? <LoadingLabel label={loadingLabel} /> : children}
    </button>
  );
}
