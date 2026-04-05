"use client";

import { DispatchSidebar } from "@/components/dispatch/DispatchSidebar";
import { PortalShellFrame } from "@/components/shared/PortalShellFrame";

type DispatchPortalShellProps = {
  children: React.ReactNode;
  operatorName: string;
  operatorCode: string;
};

export function DispatchPortalShell({ children, operatorName, operatorCode }: DispatchPortalShellProps) {
  return (
    <PortalShellFrame
      mainClassName="bg-slate-50"
      sidebar={({ isOpen, onToggle }) => (
        <DispatchSidebar isOpen={isOpen} onToggle={onToggle} operatorName={operatorName} operatorCode={operatorCode} />
      )}
    >
      {children}
    </PortalShellFrame>
  );
}
