"use client";

import { useEmsDisplayProfile } from "@/components/ems/useEmsDisplayProfile";
import { Sidebar } from "@/components/home/Sidebar";
import { PortalShellFrame } from "@/components/shared/PortalShellFrame";

type EmsPortalShellProps = {
  children: React.ReactNode;
  operatorName: string;
  operatorCode: string;
};

export function EmsPortalShell({ children, operatorName, operatorCode }: EmsPortalShellProps) {
  const displayProfile = useEmsDisplayProfile();

  return (
    <PortalShellFrame
      shellClassName="ems-viewport-shell"
      mainClassName="ems-viewport-main"
      shellProps={{
        "data-ems-scale": displayProfile.scale,
        "data-ems-density": displayProfile.density,
      }}
      sidebar={({ isOpen, onToggle }) => (
        <Sidebar isOpen={isOpen} onToggle={onToggle} operatorName={operatorName} operatorCode={operatorCode} />
      )}
    >
      {children}
    </PortalShellFrame>
  );
}
