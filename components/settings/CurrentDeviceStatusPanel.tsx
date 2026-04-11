"use client";

import { useEffect, useState } from "react";

import { ensureClientDeviceKey } from "@/components/shared/securityDeviceKey";

type DeviceStatusPayload = {
  role: string;
  username: string;
  deviceKey: string;
  deviceTrusted: boolean;
  deviceEnforcementRequired: boolean;
  deviceName: string | null;
};

type PinStatusPayload = {
  mfaRequired: boolean;
  mfaEnrolled: boolean;
};

type CurrentDeviceStatusPanelProps = {
  tone?: "ems" | "hospital" | "admin";
};

const toneCardClassMap = {
  ems: "border-blue-100/80 bg-blue-50/30",
  hospital: "border-emerald-100/80 bg-emerald-50/30",
  admin: "border-orange-100/80 bg-orange-50/30",
} as const;

const toneBadgeClassMap = {
  ems: "border-blue-200/80 bg-white text-blue-700",
  hospital: "border-emerald-200/80 bg-white text-emerald-700",
  admin: "border-orange-200/80 bg-white text-orange-700",
} as const;

function formatRoleLabel(role: string | null | undefined) {
  if (!role) return "-";
  if (role === "EMS") return "EMS";
  if (role === "HOSPITAL") return "病院";
  if (role === "ADMIN") return "管理者";
  if (role === "DISPATCH") return "本部";
  return role;
}

function formatDeviceKey(deviceKey: string | null | undefined) {
  if (!deviceKey) return "-";
  if (deviceKey.length <= 16) return deviceKey;
  return `${deviceKey.slice(0, 8)}...${deviceKey.slice(-8)}`;
}

function formatMfaStatus(mfa: PinStatusPayload | null) {
  if (!mfa) return "確認中";
  if (!mfa.mfaRequired) return "対象外";
  return mfa.mfaEnrolled ? "登録済み" : "未登録";
}

function formatRegistrationStatus(status: DeviceStatusPayload | null) {
  if (!status) return "確認中";
  if (status.deviceTrusted) return "登録済み端末";
  return status.deviceEnforcementRequired ? "登録必須" : "未要求";
}

export function CurrentDeviceStatusPanel({ tone = "admin" }: CurrentDeviceStatusPanelProps) {
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatusPayload | null>(null);
  const [mfaStatus, setMfaStatus] = useState<PinStatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const deviceKey = ensureClientDeviceKey();
        const [deviceResponse, mfaResponse] = await Promise.all([
          fetch("/api/security/device-status", {
            headers: { "x-device-key": deviceKey },
            cache: "no-store",
          }),
          fetch("/api/security/mfa/status", {
            cache: "no-store",
          }),
        ]);

        if (!deviceResponse.ok || !mfaResponse.ok) {
          throw new Error("failed");
        }

        const nextDeviceStatus = (await deviceResponse.json()) as DeviceStatusPayload;
        const nextMfaStatus = (await mfaResponse.json()) as PinStatusPayload;

        if (!active) return;
        setDeviceStatus(nextDeviceStatus);
        setMfaStatus(nextMfaStatus);
      } catch {
        if (!active) return;
        setError("端末状態の取得に失敗しました。時間を置いて再度確認してください。");
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className={["rounded-2xl border px-4 py-4", toneCardClassMap[tone]].join(" ")} data-testid="current-device-status">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">登録状態</p>
            <p className="mt-2 text-base font-semibold text-slate-900" data-testid="current-device-registered">
              {formatRegistrationStatus(deviceStatus)}
            </p>
          </div>
          <span
            className={["inline-flex max-w-[13rem] truncate rounded-full border px-3 py-1 text-xs font-semibold", toneBadgeClassMap[tone]].join(" ")}
            title={deviceStatus?.deviceName ?? "現在の端末"}
          >
            {deviceStatus?.deviceName ?? "現在の端末"}
          </span>
        </div>
        <dl className="mt-4 grid gap-3 text-sm text-slate-700">
          <div className="grid gap-1 rounded-xl bg-white/80 px-3 py-3 md:grid-cols-[112px_minmax(0,1fr)] md:items-start">
            <dt className="text-slate-500">アカウント</dt>
            <dd className="font-medium text-slate-900 md:text-right">{deviceStatus?.username ?? "-"}</dd>
          </div>
          <div className="grid gap-1 rounded-xl bg-white/80 px-3 py-3 md:grid-cols-[112px_minmax(0,1fr)] md:items-start">
            <dt className="text-slate-500">ロール</dt>
            <dd className="font-medium text-slate-900 md:text-right">{formatRoleLabel(deviceStatus?.role)}</dd>
          </div>
          <div className="grid gap-1 rounded-xl bg-white/80 px-3 py-3 md:grid-cols-[112px_minmax(0,1fr)] md:items-start">
            <dt className="text-slate-500">端末キー</dt>
            <dd className="font-medium text-slate-900 md:text-right" title={deviceStatus?.deviceKey ?? "-"}>
              <span className="font-mono text-[12px] tracking-[0.04em]">{formatDeviceKey(deviceStatus?.deviceKey)}</span>
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs leading-5 text-slate-500">端末キーは確認しやすいように短縮表示しています。照合が必要な場合は管理画面側で完全値を確認してください。</p>
      </div>

      <div className={["rounded-2xl border px-4 py-4", toneCardClassMap[tone]].join(" ")}>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">MFA 認証</p>
        <p className="mt-2 text-base font-semibold text-slate-900" data-testid="current-device-pin">
          WebAuthn MFA: {formatMfaStatus(mfaStatus)}
        </p>
        <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
          <li>EMS / HOSPITAL はログアウト後のログインで WebAuthn MFA が必要です。</li>
          <li>5時間経過後は完全再ログインになり、MFA も再度必要です。</li>
          <li>端末紛失時はアカウント停止を優先し、新端末で MFA と端末登録をやり直します。</li>
        </ul>
        {error ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      </div>
    </div>
  );
}
