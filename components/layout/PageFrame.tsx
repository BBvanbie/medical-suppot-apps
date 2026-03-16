import type { ReactNode } from "react";

type PageFrameProps = {
  children: ReactNode;
  width?: "form" | "default" | "wide" | "full";
  gap?: "sm" | "md" | "lg";
  className?: string;
};

const widthClassMap = {
  form: "page-frame--form",
  default: "page-frame--default",
  wide: "page-frame--wide",
  full: "page-frame--full",
} as const;

const gapClassMap = {
  sm: "page-stack--sm",
  md: "page-stack--md",
  lg: "page-stack--lg",
} as const;

export function PageFrame({ children, width = "default", gap = "lg", className = "" }: PageFrameProps) {
  return <div className={["page-frame", widthClassMap[width], "page-stack", gapClassMap[gap], className].filter(Boolean).join(" ")}>{children}</div>;
}
