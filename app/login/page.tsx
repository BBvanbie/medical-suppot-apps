import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { getDefaultPathForRole, isAppRole, normalizeCallbackUrl } from "@/lib/auth";

type LoginPageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [session, params] = await Promise.all([auth(), searchParams]);

  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role && isAppRole(role)) {
    redirect(getDefaultPathForRole(role));
  }

  const callbackUrl = normalizeCallbackUrl(params.callbackUrl);

  return (
    <main className="dashboard-shell app-screen-canvas flex items-center justify-center">
      <section className="content-card content-card--spacious w-full max-w-md">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-teal)]">EMS PORTAL</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">緊急搬送支援システム</h1>
        <p className="mt-2 text-sm leading-7 text-slate-600">アカウント情報を入力して業務ポータルへログインしてください。</p>
        <div className="mt-6">
          <LoginForm callbackUrl={callbackUrl} />
        </div>
      </section>
    </main>
  );
}
