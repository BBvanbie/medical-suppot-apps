"use client";

import { useState } from "react";

type PortalShellFrameProps = {
  sidebar: (props: { isOpen: boolean; onToggle: () => void }) => React.ReactNode;
  children: React.ReactNode;
  banner?: React.ReactNode;
  shellClassName?: string;
  mainClassName?: string;
  shellProps?: React.HTMLAttributes<HTMLDivElement> & Record<string, string | undefined>;
};

export function PortalShellFrame({
  sidebar,
  children,
  banner,
  shellClassName = "",
  mainClassName = "",
  shellProps,
}: PortalShellFrameProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { className: shellPropsClassName, ...restShellProps } = shellProps ?? {};

  return (
    <div
      className={[
        "dashboard-shell h-screen overflow-hidden bg-[var(--dashboard-bg)] text-slate-900",
        shellPropsClassName,
        shellClassName,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ backgroundImage: "none" }}
      {...restShellProps}
    >
      {banner}
      <div className="flex h-full">
        {sidebar({
          isOpen: isSidebarOpen,
          onToggle: () => setIsSidebarOpen((value) => !value),
        })}
        <main className={["app-shell-main min-w-0 flex-1 overflow-auto", mainClassName].filter(Boolean).join(" ")}>{children}</main>
      </div>
    </div>
  );
}
