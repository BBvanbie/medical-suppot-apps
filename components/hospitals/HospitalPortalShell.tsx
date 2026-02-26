"use client";

import { useState } from "react";
import { HospitalSidebar } from "@/components/hospitals/HospitalSidebar";

type HospitalPortalShellProps = {
  children: React.ReactNode;
  hospitalName: string;
  hospitalCode: string;
};

export function HospitalPortalShell({ children, hospitalName, hospitalCode }: HospitalPortalShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="dashboard-shell h-screen overflow-hidden bg-[var(--dashboard-bg)] text-slate-900" style={{ backgroundImage: "none" }}>
      <div className="flex h-full">
        <HospitalSidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen((value) => !value)}
          hospitalName={hospitalName}
          hospitalCode={hospitalCode}
        />
        <main className="min-w-0 flex-1 overflow-auto px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
