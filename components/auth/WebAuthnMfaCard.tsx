"use client";

import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { HOSPITAL_MFA_TEMPORARY_NOTE, isMfaTemporarilyDisabledForRole } from "@/lib/mfaPolicy";

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

function getWebAuthnClientErrorMessage(cause: unknown, action: "register" | "authenticate") {
  const name = cause instanceof Error ? cause.name : "";
  const detail = cause instanceof Error && cause.message ? ` (${cause.message})` : "";

  if (name === "NotAllowedError") {
    if (action === "authenticate") {
      return "このブラウザに、この localhost で登録したパスキーが見つからないか、確認がタイムアウトしました。登録済みの端末・ブラウザプロファイルで開き直してください。端末変更時は ADMIN に MFA 再登録を依頼してください。";
    }

    return "MFA 登録が完了しませんでした。OS やブラウザの確認を閉じた場合は、もう一度登録してください。localhost のパスキーがない表示が続く場合は、この端末で新しいパスキーを作成できる設定を確認してください。";
  }

  if (name === "InvalidStateError") {
    return "この端末には同じアカウントの MFA credential が既に登録されている可能性があります。登録済みなら MFA 確認に進み、端末変更時は ADMIN に再登録を依頼してください。";
  }

  if (name === "SecurityError") {
    return "WebAuthn を利用できない接続元です。localhost または HTTPS の正しい URL で開き直してください。";
  }

  return action === "register" ? `MFA 登録中にエラーが発生しました。${detail}` : `MFA 認証中にエラーが発生しました。${detail}`;
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
      setError(getWebAuthnClientErrorMessage(cause, "register"));
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
      setError(getWebAuthnClientErrorMessage(cause, "authenticate"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const isSetup = mode === "setup";
  const isTemporarilyDisabledHospital = status?.role === "HOSPITAL" && status && isMfaTemporarilyDisabledForRole(status.role) && !status.mfaRequired;

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
      {isTemporarilyDisabledHospital ? (
        <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-800">
          {HOSPITAL_MFA_TEMPORARY_NOTE}
        </p>
      ) : null}
      {!isSetup ? (
        <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-800">
          MFA は登録時と同じ接続元、端末、ブラウザプロファイルのパスキーで確認します。localhost のパスキーがない場合は、
          登録済み環境で開き直すか、ADMIN に MFA 再登録を依頼してください。
        </p>
      ) : null}

      {status ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
          <p>アカウント: {status.username}</p>
          <p>ロール: {status.role}</p>
          <p>MFA: {status.mfaEnrolled ? "登録済み" : "未登録"}</p>
        </div>
      ) : null}

      {message ? <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      {isTemporarilyDisabledHospital ? (
        <button
          type="button"
          onClick={() => {
            if (!status) return;
            router.replace(getSafeCallbackUrl(callbackUrl, status.role));
            router.refresh();
          }}
          className="mt-6 h-11 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          業務画面へ戻る
        </button>
      ) : isSetup ? (
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
