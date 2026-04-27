import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { getDefaultPathForRole, isAppRole, normalizeCallbackUrl } from "@/lib/auth";
import { HOSPITAL_MFA_TEMPORARY_NOTE, isMfaTemporarilyDisabledForRole } from "@/lib/mfaPolicy";

type LoginPageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [session, params] = await Promise.all([auth(), searchParams]);
  const callbackUrl = normalizeCallbackUrl(params.callbackUrl);

  const sessionUser = session?.user as {
    role?: string;
    authExpired?: boolean;
    authInvalidated?: boolean;
    deviceTrusted?: boolean;
    deviceEnforcementRequired?: boolean;
    mfaEnrolled?: boolean;
    mfaRequired?: boolean;
    mfaVerified?: boolean;
    mustChangePassword?: boolean;
  } | undefined;
  const role = sessionUser?.role;
  if (role && isAppRole(role) && !sessionUser?.authExpired && !sessionUser?.authInvalidated) {
    if (sessionUser.mustChangePassword) {
      redirect("/change-password");
    }
    if (sessionUser.mfaRequired && !sessionUser.mfaEnrolled) {
      redirect(`/mfa/setup?callbackUrl=${encodeURIComponent(callbackUrl ?? getDefaultPathForRole(role))}`);
    }
    if (sessionUser.mfaRequired && sessionUser.mfaEnrolled && !sessionUser.mfaVerified) {
      redirect(`/mfa/verify?callbackUrl=${encodeURIComponent(callbackUrl ?? getDefaultPathForRole(role))}`);
    }
    if ((role === "EMS" || role === "HOSPITAL") && sessionUser.deviceEnforcementRequired && !sessionUser.deviceTrusted) {
      redirect("/register-device");
    }
    redirect(getDefaultPathForRole(role));
  }

  return (
    <main className="dashboard-shell app-screen-canvas flex items-center justify-center">
      <section className="content-card content-card--spacious w-full max-w-md">
        <p className="portal-eyebrow portal-eyebrow--ems">EMS PORTAL</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">緊急搬送支援システム</h1>
        <p className="mt-2 text-sm leading-7 text-slate-600">アカウント情報を入力して業務ポータルへログインしてください。</p>
        {isMfaTemporarilyDisabledForRole("HOSPITAL") ? (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800" data-testid="login-hospital-mfa-note">
            病院アカウント: {HOSPITAL_MFA_TEMPORARY_NOTE}
          </p>
        ) : null}
        <div className="mt-6">
          <LoginForm callbackUrl={callbackUrl} />
        </div>
      </section>
    </main>
  );
}
