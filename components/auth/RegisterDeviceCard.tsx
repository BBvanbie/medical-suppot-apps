"use client";

import { FormEvent, useEffect, useState } from "react";

import { ensureClientDeviceKey } from "@/components/shared/securityDeviceKey";
import { secureSignOut } from "@/lib/secureSignOut";

type DeviceStatus = {
  role: string;
  username: string;
  deviceFingerprint: string;
  deviceTrusted: boolean;
  deviceEnforcementRequired: boolean;
  deviceName: string | null;
};

function getPostRegistrationLoginPath(role: string) {
  if (role === "EMS") return "/paramedics";
  if (role === "HOSPITAL") return "/hospitals/requests";
  return "/";
}

export function RegisterDeviceCard() {
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [registrationCode, setRegistrationCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const deviceKey = ensureClientDeviceKey();
    void fetch("/api/security/device-status", {
      headers: {
        "x-device-key": deviceKey,
      },
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("failed");
        return (await response.json()) as DeviceStatus;
      })
      .then((data) => {
        setStatus(data);
        if (data.deviceTrusted) {
          setMessage(`この端末は「${data.deviceName ?? "登録済み端末"}」として登録されています。`);
        }
      })
      .catch(() => {
        setError("端末状態の確認に失敗しました。");
      });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const deviceKey = ensureClientDeviceKey();
      const response = await fetch("/api/security/device-register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-device-key": deviceKey,
        },
        body: JSON.stringify({
          registrationCode: registrationCode.trim().toUpperCase(),
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { message?: string; deviceName?: string };
      if (!response.ok) {
        setError(payload.message ?? "端末登録に失敗しました。");
        return;
      }

      const nextPath = getPostRegistrationLoginPath(status?.role ?? "");
      setMessage(`端末「${payload.deviceName ?? "この端末"}」を登録しました。再ログイン画面へ移動します。`);
      setStatus((current) =>
        current
          ? { ...current, deviceTrusted: true, deviceName: payload.deviceName ?? current.deviceName }
          : current,
      );
      window.setTimeout(() => {
        void secureSignOut({ callbackUrl: `/login?callbackUrl=${encodeURIComponent(nextPath)}` });
      }, 800);
    } catch {
      setError("端末登録中に通信エラーが発生しました。");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isTrusted = status?.deviceTrusted === true;

  return (
    <section className="content-card content-card--spacious w-full max-w-md">
      <p className="portal-eyebrow portal-eyebrow--ems">DEVICE REGISTRATION</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">端末登録</h1>
      <p className="mt-2 text-sm leading-7 text-slate-600">
        管理者から受け取った登録コードを入力して、この端末を正式端末として登録します。
      </p>

      {status ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
          <p>アカウント: {status.username}</p>
          <p>ロール: {status.role}</p>
          <p>端末識別: {status.deviceFingerprint}</p>
          <p>登録状態: {isTrusted ? "登録済み" : status.deviceEnforcementRequired ? "登録必須" : "未要求"}</p>
        </div>
      ) : null}

      {message ? <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      {!isTrusted ? (
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-800" htmlFor="registration-code">
              登録コード
            </label>
            <input
              id="registration-code"
              data-testid="device-registration-code"
              value={registrationCode}
              onChange={(event) => setRegistrationCode(event.target.value.toUpperCase())}
              placeholder="ABCD-1234"
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
            />
          </div>
          <button
            type="submit"
            data-testid="device-registration-submit"
            disabled={isSubmitting}
            className="h-11 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "登録中..." : "端末を登録"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
