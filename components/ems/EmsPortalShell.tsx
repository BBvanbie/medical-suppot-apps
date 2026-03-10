"use client";

import { Sidebar } from "@/components/home/Sidebar";
import { PortalShellFrame } from "@/components/shared/PortalShellFrame";

type EmsPortalShellProps = {
  children: React.ReactNode;
  operatorName: string;
  operatorCode: string;
};

export function EmsPortalShell({ children, operatorName, operatorCode }: EmsPortalShellProps) {
  return (
    <PortalShellFrame
      sidebar={({ isOpen, onToggle }) => (
        <Sidebar isOpen={isOpen} onToggle={onToggle} operatorName={operatorName} operatorCode={operatorCode} />
      )}
    >
      {children}
    </PortalShellFrame>
  );
}
