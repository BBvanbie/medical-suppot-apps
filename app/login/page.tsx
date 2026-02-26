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
    <main className="dashboard-shell flex min-h-screen items-center justify-center px-4 py-8">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_30px_60px_-45px_rgba(15,23,42,0.45)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-teal)]">Authentication</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">救急搬送支援システム ログイン</h1>
        <p className="mt-2 text-sm text-slate-600">
          救急隊、病院、管理者アカウントでログインしてください。
        </p>
        <div className="mt-6">
          <LoginForm callbackUrl={callbackUrl} />
        </div>
      </section>
    </main>
  );
}
