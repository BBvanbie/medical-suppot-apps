"use client";

import { HospitalSidebar } from "@/components/hospitals/HospitalSidebar";
import { PortalShellFrame } from "@/components/shared/PortalShellFrame";
import { TrainingModeBanner } from "@/components/shared/TrainingModeBanner";
import type { AppMode } from "@/lib/appMode";

type HospitalPortalShellProps = {
  children: React.ReactNode;
  hospitalName: string;
  hospitalCode: string;
  currentMode?: AppMode;
};

export function HospitalPortalShell({ children, hospitalName, hospitalCode, currentMode = "LIVE" }: HospitalPortalShellProps) {
  return (
    <PortalShellFrame
      mainClassName="ds-bg-gradient-hospital-shell"
      banner={<TrainingModeBanner mode={currentMode} />}
      sidebar={({ isOpen, onToggle }) => (
        <HospitalSidebar isOpen={isOpen} onToggle={onToggle} hospitalName={hospitalName} hospitalCode={hospitalCode} />
      )}
    >
      {children}
    </PortalShellFrame>
  );
}
