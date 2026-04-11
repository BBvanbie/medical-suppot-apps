import { auth } from "@/auth";
import { WebAuthnMfaCard } from "@/components/auth/WebAuthnMfaCard";

export default async function MfaVerifyPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const session = await auth();
  const params = await searchParams;
  const displayName = session?.user?.name ?? "利用者";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-lg">
        <p className="mb-4 text-center text-sm font-semibold text-slate-500">{displayName}</p>
        <WebAuthnMfaCard mode="verify" callbackUrl={params.callbackUrl} />
      </div>
    </main>
  );
}
