import type { ButtonHTMLAttributes } from "react";
import { BUTTON_BASE_CLASS, BUTTON_VARIANT_CLASS } from "@/components/shared/buttonStyles";

type SettingActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "secondary" | "danger";
};

export function SettingActionButton({ className = "", tone = "primary", type = "button", ...props }: SettingActionButtonProps) {
  return (
    <button
      type={type}
      className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS[tone]} ${className}`.trim()}
      {...props}
    />
  );
}
