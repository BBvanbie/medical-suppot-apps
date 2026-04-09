"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { ensureClientDeviceKey } from "@/components/shared/securityDeviceKey";

const PIN_IDLE_MS = 3 * 60 * 60 * 1000;
const ACTIVITY_WRITE_INTERVAL_MS = 15 * 1000;

type PinStateResponse = {
  userId: number;
  role: string;
  hasPin: boolean;
  lockedUntil: string | null;
  deviceKey: string;
};

type SecuritySessionGateProps = {
  children: React.ReactNode;
};

function formatLockedUntil(value: string | null) {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat("ja-JP", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return null;
  }
}

export function SecuritySessionGate({ children }: SecuritySessionGateProps) {
  const [pinState, setPinState] = useState<PinStateResponse | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const deviceKeyRef = useRef<string | null>(null);
  const activityKey = useMemo(
    () => (pinState ? `security:last-activity:${pinState.userId}:${deviceKeyRef.current}` : null),
    [pinState],
  );

  useEffect(() => {
    const nextDeviceKey = ensureClientDeviceKey();
    deviceKeyRef.current = nextDeviceKey;

    void fetch("/api/security/pin", {
      headers: {
        "x-device-key": nextDeviceKey,
      },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("failed");
        const responseDeviceKey = response.headers.get("x-device-key");
        const data = (await response.json()) as PinStateResponse;
        if (responseDeviceKey) {
          deviceKeyRef.current = responseDeviceKey;
          window.localStorage.setItem("security:device-key", responseDeviceKey);
          data.deviceKey = responseDeviceKey;
        }
        setPinState(data);
      })
      .catch(() => {
        void signOut({ callbackUrl: "/login" });
      })
      .finally(() => setIsReady(true));
  }, []);

  useEffect(() => {
    if (!pinState || !activityKey) return;

    const writeActivity = () => {
      if (isLocked) return;
      window.localStorage.setItem(activityKey, String(Date.now()));
    };

    const readActivity = () => {
      const raw = window.localStorage.getItem(activityKey);
      const lastActivity = raw ? Number(raw) : Date.now();
      if (!raw) {
        window.localStorage.setItem(activityKey, String(lastActivity));
      }
      if (Date.now() - lastActivity >= PIN_IDLE_MS && pinState.hasPin) {
        setIsLocked(true);
      }
    };

    readActivity();
    const eventHandler = () => writeActivity();
    const intervalId = window.setInterval(readActivity, ACTIVITY_WRITE_INTERVAL_MS);
    const events: Array<keyof WindowEventMap> = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    events.forEach((eventName) => window.addEventListener(eventName, eventHandler, { passive: true }));

    return () => {
      window.clearInterval(intervalId);
      events.forEach((eventName) => window.removeEventListener(eventName, eventHandler));
    };
  }, [activityKey, isLocked, pinState]);

  const needsPinSetup = Boolean(pinState && !pinState.hasPin);
  const overlayVisible = isReady && (needsPinSetup || isLocked);

  async function handlePinSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pinState || !deviceKeyRef.current) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const isSetup = !pinState.hasPin;
      if (isSetup && pin !== confirmPin) {
        setError("確認用 PIN が一致しません。");
        return;
      }

      const response = await fetch("/api/security/pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-device-key": deviceKeyRef.current,
        },
        body: JSON.stringify({
          action: isSetup ? "set" : "verify",
          pin,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { message?: string; lockedUntil?: string; deviceKey?: string };
        if (!response.ok) {
          setError(payload.message ?? "PIN の処理に失敗しました。");
        if (payload.lockedUntil) {
          setPinState((current) => (current ? { ...current, lockedUntil: payload.lockedUntil ?? null } : current));
        }
        return;
      }

      const nextActivityKey = activityKey;
      if (nextActivityKey) {
        window.localStorage.setItem(nextActivityKey, String(Date.now()));
      }
      setPin("");
      setConfirmPin("");
      setIsLocked(false);
      setPinState((current) => (current ? { ...current, hasPin: true, lockedUntil: null } : current));
    } catch {
      setError("PIN の処理中にエラーが発生しました。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {children}
      {overlayVisible ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              {needsPinSetup ? "SECURITY SETUP" : "SESSION LOCK"}
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-[-0.02em] text-slate-950">
              {needsPinSetup ? "この端末の PIN を設定" : "PIN を入力して再開"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {needsPinSetup
                ? "この端末専用の 6 桁 PIN を設定します。同じアカウントでも別端末では別の PIN を持ちます。"
                : "3 時間以上操作がなかったため画面をロックしました。6 桁 PIN で再開してください。"}
            </p>
            {pinState?.lockedUntil ? (
              <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                PIN は {formatLockedUntil(pinState.lockedUntil) ?? pinState.lockedUntil} まで一時ロックされています。
              </p>
            ) : null}
            <form className="mt-5 space-y-4" onSubmit={handlePinSubmit}>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-800" htmlFor="security-pin">
                  PIN
                </label>
                <input
                  id="security-pin"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoComplete="one-time-code"
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>
              {needsPinSetup ? (
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-800" htmlFor="security-pin-confirm">
                    PIN 確認
                  </label>
                  <input
                    id="security-pin-confirm"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={confirmPin}
                    onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
              ) : null}
              {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "処理中..." : needsPinSetup ? "PIN を設定" : "ロック解除"}
                </button>
                {!needsPinSetup ? (
                  <button
                    type="button"
                    onClick={() => {
                      void signOut({ callbackUrl: "/login" });
                    }}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    再ログイン
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
