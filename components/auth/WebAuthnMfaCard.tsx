"use client";

import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type MfaStatus = {
  role: string;
  username: string;
  mfaRequired: boolean;
  mfaEnrolled: boolean;
};

type WebAuthnMfaCardProps = {
  mode: "setup" | "verify";
  callbackUrl?: string | null;
};

function getPostMfaPath(role: string) {
  if (role === "EMS") return "/paramedics";
  if (role === "HOSPITAL") return "/hospitals/requests";
  if (role === "ADMIN") return "/admin";
  if (role === "DISPATCH") return "/dispatch";
  return "/";
}

function getSafeCallbackUrl(callbackUrl: string | null | undefined, role: string) {
  if (callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//")) {
    return callbackUrl;
  }
  return getPostMfaPath(role);
}

export function WebAuthnMfaCard({ mode, callbackUrl }: WebAuthnMfaCardProps) {
  const router = useRouter();
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [credentialName, setCredentialName] = useState("この端末");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void fetch("/api/security/mfa/status", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("failed");
        return (await response.json()) as MfaStatus;
      })
      .then(setStatus)
      .catch(() => setError("MFA 状態の確認に失敗しました。再ログインしてやり直してください。"));
  }, []);

  async function handleSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!status) return;
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const optionsResponse = await fetch("/api/security/mfa/register/options", { method: "POST" });
      const options = await optionsResponse.json();
      if (!optionsResponse.ok) {
        setError(options.message ?? "MFA 登録の準備に失敗しました。");
        return;
      }

      const registration = await startRegistration(options);
      const verifyResponse = await fetch("/api/security/mfa/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: registration, credentialName }),
      });
      const payload = await verifyResponse.json().catch(() => ({}));
      if (!verifyResponse.ok) {
        setError(payload.message ?? "MFA 登録に失敗しました。");
        return;
      }

      setMessage("MFA 登録が完了しました。業務画面へ移動します。");
      window.setTimeout(() => {
        router.replace(getSafeCallbackUrl(callbackUrl, status.role));
        router.refresh();
      }, 700);
    } catch (cause) {
      const name = cause instanceof Error ? cause.name : "";
      const detail = cause instanceof Error && cause.message ? ` (${cause.message})` : "";
      setError(name === "NotAllowedError" ? "MFA 登録がキャンセルされました。" : `MFA 登録中にエラーが発生しました。${detail}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerify() {
    if (!status) return;
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const optionsResponse = await fetch("/api/security/mfa/authenticate/options", { method: "POST" });
      const options = await optionsResponse.json();
      if (!optionsResponse.ok) {
        setError(options.message ?? "MFA 認証の準備に失敗しました。");
        return;
      }

      const authentication = await startAuthentication(options);
      const verifyResponse = await fetch("/api/security/mfa/authenticate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: authentication }),
      });
      const payload = await verifyResponse.json().catch(() => ({}));
      if (!verifyResponse.ok) {
        setError(payload.message ?? "MFA 認証に失敗しました。");
        return;
      }

      setMessage("MFA 認証が完了しました。業務画面へ移動します。");
      window.setTimeout(() => {
        router.replace(getSafeCallbackUrl(callbackUrl, status.role));
        router.refresh();
      }, 700);
    } catch (cause) {
      const name = cause instanceof Error ? cause.name : "";
      const detail = cause instanceof Error && cause.message ? ` (${cause.message})` : "";
      setError(name === "NotAllowedError" ? "MFA 認証がキャンセルされました。" : `MFA 認証中にエラーが発生しました。${detail}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  const isSetup = mode === "setup";

  return (
    <section className="content-card content-card--spacious w-full max-w-lg">
      <p className="portal-eyebrow portal-eyebrow--ems">WEBAUTHN MFA</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
        {isSetup ? "MFA を登録" : "MFA で本人確認"}
      </h1>
      <p className="mt-2 text-sm leading-7 text-slate-600">
        {isSetup
          ? "この端末の生体認証、PIN、パスキーなどを使って MFA credential を登録します。"
          : "ログアウト後のログインでは、ID / パスワードに加えて WebAuthn MFA が必要です。"}
      </p>

      {status ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
          <p>アカウント: {status.username}</p>
          <p>ロール: {status.role}</p>
          <p>MFA: {status.mfaEnrolled ? "登録済み" : "未登録"}</p>
        </div>
      ) : null}

      {message ? <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      {isSetup ? (
        <form className="mt-6 space-y-4" onSubmit={handleSetup}>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-800" htmlFor="credential-name">
              登録名
            </label>
            <input
              id="credential-name"
              value={credentialName}
              onChange={(event) => setCredentialName(event.target.value)}
              placeholder="例: EMS iPad / 病院受付PC"
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !status}
            className="h-11 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "登録中..." : "MFA を登録"}
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => void handleVerify()}
          disabled={isSubmitting || !status}
          className="mt-6 h-11 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "確認中..." : "MFA で確認"}
        </button>
      )}
    </section>
  );
}
