"use client";

import { useState } from "react";

type PortalShellFrameProps = {
  sidebar: (props: { isOpen: boolean; onToggle: () => void }) => React.ReactNode;
  children: React.ReactNode;
};

export function PortalShellFrame({ sidebar, children }: PortalShellFrameProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="dashboard-shell h-screen overflow-hidden bg-[var(--dashboard-bg)] text-slate-900" style={{ backgroundImage: "none" }}>
      <div className="flex h-full">
        {sidebar({
          isOpen: isSidebarOpen,
          onToggle: () => setIsSidebarOpen((value) => !value),
        })}
        <main className="min-w-0 flex-1 overflow-auto px-4 py-6 sm:px-5 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
