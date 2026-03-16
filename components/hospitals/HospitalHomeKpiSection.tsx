"use client";

import { useMemo, useState } from "react";
import { PencilSquareIcon } from "@heroicons/react/24/outline";

import { SettingActionButton } from "@/components/settings/SettingActionButton";
import { SettingSaveStatus } from "@/components/settings/SettingSaveStatus";
import type { HospitalHomeMetrics } from "@/lib/hospitalHomeMetrics";

type HospitalHomeKpiSectionProps = {
  metrics: HospitalHomeMetrics;
  initialResponseTargetMinutes: number;
};

type Segment = {
  label: string;
  value: number;
  color: string;
  textColor: string;
};

type DashboardSettingsResponse = {
  message?: string;
  fieldErrors?: Record<string, string>;
  responseTargetMinutes?: number;
};

function formatPercent(value: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function formatMinutes(value: number | null): string {
  if (value == null) return "-";
  const rounded = Math.round(value);
  if (rounded < 60) return `${rounded}\u5206`;
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  return minutes === 0 ? `${hours}\u6642\u9593` : `${hours}\u6642\u9593${minutes}\u5206`;
}

function DonutChart({
  segments,
  total,
  centerLabel,
  centerValue,
}: {
  segments: Segment[];
  total: number;
  centerLabel: string;
  centerValue: string;
}) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const visibleSegments = segments.filter((segment) => segment.value > 0);
  const chartSegments = visibleSegments.map((segment, index) => {
    const length = total > 0 ? (segment.value / total) * circumference : 0;
    const offset = visibleSegments
      .slice(0, index)
      .reduce((sum, current) => sum + (total > 0 ? (current.value / total) * circumference : 0), 0);
    return { ...segment, length, offset };
  });

  return (
    <div className="relative h-40 w-40 shrink-0">
      <svg viewBox="0 0 140 140" className="h-40 w-40 -rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="14" />
        {chartSegments.map((segment) => (
          <circle
            key={segment.label}
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth="14"
            strokeLinecap="butt"
            strokeDasharray={`${segment.length} ${circumference - segment.length}`}
            strokeDashoffset={-segment.offset}
          />
        ))}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{centerLabel}</span>
        <span className="mt-1 text-3xl font-bold leading-none text-slate-900">{centerValue}</span>
      </div>
    </div>
  );
}

function MetricLegend({ segments, total }: { segments: Segment[]; total: number }) {
  return (
    <div className="grid gap-2">
      {segments.map((segment) => (
        <div key={segment.label} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} aria-hidden="true" />
            <span className="text-sm font-medium text-slate-700">{segment.label}</span>
          </div>
          <div className="text-right">
            <p className={`text-sm font-semibold ${segment.textColor}`}>{`${segment.value}\u4ef6`}</p>
            <p className="text-xs text-slate-500">{formatPercent(segment.value, total)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function HospitalHomeKpiSection({ metrics, initialResponseTargetMinutes }: HospitalHomeKpiSectionProps) {
  const [responseTargetMinutes, setResponseTargetMinutes] = useState(initialResponseTargetMinutes);
  const [draftMinutes, setDraftMinutes] = useState(String(initialResponseTargetMinutes));
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | undefined>();
  const [fieldError, setFieldError] = useState("");

  const requestSegments = useMemo<Segment[]>(
    () => [
      { label: "\u53d7\u5165\u53ef\u80fd", value: metrics.acceptableCount, color: "#059669", textColor: "text-emerald-700" },
      { label: "\u53d7\u5165\u4e0d\u53ef", value: metrics.notAcceptableCount, color: "#DC2626", textColor: "text-rose-700" },
      { label: "\u672a\u56de\u7b54/\u8981\u76f8\u8ac7", value: metrics.pendingCount, color: "#94A3B8", textColor: "text-slate-600" },
    ],
    [metrics.acceptableCount, metrics.notAcceptableCount, metrics.pendingCount],
  );

  const transportSegments = useMemo<Segment[]>(
    () => [
      { label: "\u642c\u9001\u6c7a\u5b9a", value: metrics.transportDecidedCount, color: "#2563EB", textColor: "text-blue-700" },
      {
        label: "\u672a\u6c7a\u5b9a",
        value: Math.max(metrics.totalRequests - metrics.transportDecidedCount, 0),
        color: "#CBD5E1",
        textColor: "text-slate-600",
      },
    ],
    [metrics.totalRequests, metrics.transportDecidedCount],
  );

  const saveTarget = async () => {
    const parsed = Number(draftMinutes);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 180) {
      setFieldError("\u76ee\u6a19\u6642\u9593\u306f 1\u301c180 \u5206\u306e\u6574\u6570\u3067\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002");
      setStatus("error");
      setMessage(undefined);
      return;
    }

    setStatus("saving");
    setMessage(undefined);
    setFieldError("");

    try {
      const res = await fetch("/api/settings/hospital/dashboard", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responseTargetMinutes: parsed }),
      });
      const data = (await res.json().catch(() => ({}))) as DashboardSettingsResponse;

      if (!res.ok) {
        setStatus("error");
        setFieldError(data.fieldErrors?.responseTargetMinutes ?? "");
        setMessage(data.message ?? "\u4fdd\u5b58\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002");
        return;
      }

      const nextMinutes = data.responseTargetMinutes ?? parsed;
      setResponseTargetMinutes(nextMinutes);
      setDraftMinutes(String(nextMinutes));
      setEditing(false);
      setStatus("saved");
      setMessage("\u76ee\u6a19\u6642\u9593\u3092\u66f4\u65b0\u3057\u307e\u3057\u305f");
    } catch {
      setStatus("error");
      setMessage("\u4fdd\u5b58\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002");
    }
  };

  const averageDelta =
    metrics.averageResponseMinutes == null ? null : Math.round(metrics.averageResponseMinutes - responseTargetMinutes);
  const averageBadge =
    averageDelta == null
      ? "\u30c7\u30fc\u30bf\u306a\u3057"
      : averageDelta <= 0
        ? `\u76ee\u6a19\u5185 ${Math.abs(averageDelta)}\u5206`
        : `+${averageDelta}\u5206`;

  return (
    <section className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(340px,0.9fr)]">
      <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.2)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">REQUEST RESPONSE</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">{"\u53d7\u5165\u56de\u7b54\u5272\u5408"}</h2>
            <p className="mt-1 text-sm text-slate-500">{"\u53d7\u5165\u8981\u8acb\u7dcf\u6570\u306b\u5bfe\u3059\u308b\u75c5\u9662\u56de\u7b54\u306e\u5185\u8a33\u3067\u3059\u3002"}</p>
          </div>
          <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{`\u7dcf\u6570 ${metrics.totalRequests}\u4ef6`}</p>
        </div>
        <div className="mt-5 flex flex-col gap-5 2xl:flex-row 2xl:items-center">
          <DonutChart
            segments={requestSegments}
            total={Math.max(metrics.totalRequests, 1)}
            centerLabel="TOTAL"
            centerValue={String(metrics.totalRequests)}
          />
          <div className="min-w-0 flex-1">
            <MetricLegend segments={requestSegments} total={metrics.totalRequests} />
          </div>
        </div>
      </article>

      <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.2)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">TRANSPORT DECISION</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">{"\u642c\u9001\u6c7a\u5b9a\u7387"}</h2>
            <p className="mt-1 text-sm text-slate-500">{"\u53d7\u5165\u8981\u8acb\u306b\u5bfe\u3057\u3066\u642c\u9001\u6c7a\u5b9a\u306b\u81f3\u3063\u305f\u4ef6\u6570\u3067\u3059\u3002"}</p>
          </div>
          <p className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{`\u6c7a\u5b9a ${metrics.transportDecidedCount}\u4ef6`}</p>
        </div>
        <div className="mt-5 flex flex-col gap-5 2xl:flex-row 2xl:items-center">
          <DonutChart
            segments={transportSegments}
            total={Math.max(metrics.totalRequests, 1)}
            centerLabel="RATE"
            centerValue={formatPercent(metrics.transportDecidedCount, metrics.totalRequests)}
          />
          <div className="min-w-0 flex-1">
            <MetricLegend segments={transportSegments} total={metrics.totalRequests} />
          </div>
        </div>
      </article>

      <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.2)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">RESPONSE TIME</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">{"\u56de\u7b54\u5e73\u5747\u6642\u9593"}</h2>
            <p className="mt-1 text-sm text-slate-500">{"\u53d7\u5165\u8981\u8acb\u304b\u3089\u6700\u521d\u306e\u75c5\u9662\u56de\u7b54\u307e\u3067\u306e\u5e73\u5747\u6642\u9593\u3067\u3059\u3002"}</p>
          </div>
          <div className={`rounded-full px-3 py-1 text-xs font-semibold ${averageDelta == null ? "bg-slate-100 text-slate-600" : averageDelta <= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            {averageBadge}
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">AVERAGE</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <p className="text-4xl font-bold leading-none text-slate-900">{formatMinutes(metrics.averageResponseMinutes)}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">TARGET</p>
                {editing ? (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={180}
                      value={draftMinutes}
                      onChange={(event) => {
                        setDraftMinutes(event.target.value);
                        setStatus("idle");
                        setMessage(undefined);
                        setFieldError("");
                      }}
                      className="h-10 w-24 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none"
                    />
                    <span className="text-sm text-slate-500">{"\u5206"}</span>
                  </div>
                ) : (
                  <p className="mt-2 text-2xl font-bold text-slate-900">{responseTargetMinutes}{"\u5206"}</p>
                )}
              </div>
              <SettingActionButton
                tone={editing ? "primary" : "secondary"}
                className="h-10 rounded-xl px-3 text-xs"
                onClick={() => {
                  if (editing) {
                    void saveTarget();
                    return;
                  }
                  setEditing(true);
                  setDraftMinutes(String(responseTargetMinutes));
                  setStatus("idle");
                  setMessage(undefined);
                  setFieldError("");
                }}
              >
                <span className="inline-flex items-center gap-1.5">
                  <PencilSquareIcon className="h-4 w-4" />
                  {editing ? "\u4fdd\u5b58" : "\u76ee\u6a19\u7de8\u96c6"}
                </span>
              </SettingActionButton>
            </div>
            {editing ? (
              <div className="mt-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setDraftMinutes(String(responseTargetMinutes));
                    setFieldError("");
                    setStatus("idle");
                    setMessage(undefined);
                  }}
                  className="text-sm font-semibold text-slate-500 hover:text-slate-700"
                >
                  {"\u30ad\u30e3\u30f3\u30bb\u30eb"}
                </button>
                <SettingSaveStatus status={status} message={message} />
              </div>
            ) : (
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-sm text-slate-500">{"\u76ee\u6a19\u306f\u30db\u30fc\u30e0\u753b\u9762\u4e0a\u3067\u3044\u3064\u3067\u3082\u66f4\u65b0\u3067\u304d\u307e\u3059\u3002"}</p>
                <SettingSaveStatus status={status} message={message} />
              </div>
            )}
            {fieldError ? <p className="mt-2 text-sm font-medium text-rose-600">{fieldError}</p> : null}
          </div>
        </div>
      </article>
    </section>
  );
}
