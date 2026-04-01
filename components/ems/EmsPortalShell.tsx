"use client";

import { OfflineProvider } from "@/components/offline/OfflineProvider";
import { OfflineStatusBanner } from "@/components/offline/OfflineStatusBanner";
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
    <OfflineProvider>
      <PortalShellFrame
        shellClassName="ems-viewport-shell"
        mainClassName="ems-viewport-main bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.1),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eff6ff_100%)]"
        shellProps={{
          "data-ems-scale": displayProfile.scale,
          "data-ems-density": displayProfile.density,
        }}
        banner={<OfflineStatusBanner compact />}
        sidebar={({ isOpen, onToggle }) => (
          <Sidebar isOpen={isOpen} onToggle={onToggle} operatorName={operatorName} operatorCode={operatorCode} />
        )}
      >
        {children}
      </PortalShellFrame>
    </OfflineProvider>
  );
}
