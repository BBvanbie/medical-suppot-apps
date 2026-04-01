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
      mainClassName="bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.1),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#ecfdf5_100%)]"
      sidebar={({ isOpen, onToggle }) => (
        <HospitalSidebar isOpen={isOpen} onToggle={onToggle} hospitalName={hospitalName} hospitalCode={hospitalCode} />
      )}
    >
      {children}
    </PortalShellFrame>
  );
}
