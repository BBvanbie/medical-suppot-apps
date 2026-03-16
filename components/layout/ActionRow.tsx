import type { ReactNode } from "react";

type ActionRowProps = {
  children: ReactNode;
  align?: "start" | "center" | "end" | "between";
  className?: string;
};

const alignClassMap = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
} as const;

export function ActionRow({ children, align = "end", className = "" }: ActionRowProps) {
  return <div className={["action-row", alignClassMap[align], className].filter(Boolean).join(" ")}>{children}</div>;
}
