import { Suspense } from "react";

import { TransferRequestCompletedPage } from "@/components/hospitals/TransferRequestCompletedPage";

export default function HospitalTransferCompletedRoutePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">読込中...</div>}>
      <TransferRequestCompletedPage />
    </Suspense>
  );
}
