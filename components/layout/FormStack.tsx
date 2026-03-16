import type { ReactNode } from "react";

type FormStackProps = {
  children: ReactNode;
  className?: string;
};

export function FormStack({ children, className = "" }: FormStackProps) {
  return <div className={["form-stack", className].filter(Boolean).join(" ")}>{children}</div>;
}
