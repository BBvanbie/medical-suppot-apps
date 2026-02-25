import { Suspense } from "react";

import { TransferRequestConfirmPage } from "@/components/hospitals/TransferRequestConfirmPage";

export default function HospitalTransferConfirmRoutePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">読込中...</div>}>
      <TransferRequestConfirmPage />
    </Suspense>
  );
}
