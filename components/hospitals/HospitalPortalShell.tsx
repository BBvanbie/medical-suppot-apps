"use client";

import { HospitalSidebar } from "@/components/hospitals/HospitalSidebar";
import { PortalShellFrame } from "@/components/shared/PortalShellFrame";

type HospitalPortalShellProps = {
  children: React.ReactNode;
  hospitalName: string;
  hospitalCode: string;
};

export function HospitalPortalShell({ children, hospitalName, hospitalCode }: HospitalPortalShellProps) {
  return (
    <PortalShellFrame
      sidebar={({ isOpen, onToggle }) => (
        <HospitalSidebar isOpen={isOpen} onToggle={onToggle} hospitalName={hospitalName} hospitalCode={hospitalCode} />
      )}
    >
      {children}
    </PortalShellFrame>
  );
}
