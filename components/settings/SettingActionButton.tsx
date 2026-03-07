import type { ButtonHTMLAttributes } from "react";

type SettingActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "secondary" | "danger";
};

const toneClassMap: Record<NonNullable<SettingActionButtonProps["tone"]>, string> = {
  primary: "border-amber-600 bg-amber-600 text-white hover:bg-amber-700",
  secondary: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  danger: "border-rose-600 bg-rose-600 text-white hover:bg-rose-700",
};

export function SettingActionButton({ className = "", tone = "primary", type = "button", ...props }: SettingActionButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex h-11 items-center justify-center rounded-2xl border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${toneClassMap[tone]} ${className}`.trim()}
      {...props}
    />
  );
}
