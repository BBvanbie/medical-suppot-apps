import type { ReactNode } from "react";

type ContentCardProps = {
  children: ReactNode;
  density?: "compact" | "default" | "spacious";
  className?: string;
};

const densityClassMap = {
  compact: "content-card--compact",
  default: "content-card--default",
  spacious: "content-card--spacious",
} as const;

export function ContentCard({ children, density = "default", className = "" }: ContentCardProps) {
  return <div className={["content-card", densityClassMap[density], className].filter(Boolean).join(" ")}>{children}</div>;
}
