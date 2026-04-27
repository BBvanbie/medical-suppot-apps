"use client";

import { useEffect, useState } from "react";

type Counts = {
  red: number;
  yellow: number;
  green: number;
  black: number;
};

type MciHospitalRequest = {
  id: number;
  requestId: string;
  incidentCode: string;
  status: "UNREAD" | "READ" | "NEGOTIATING" | "ACCEPTABLE" | "NOT_ACCEPTABLE";
  disasterSummary: string;
  startCounts: Counts;
  patCounts: Counts;
  notes: string;
  sentAt: string;
  offer: {
    id: number;
    red: number;
    yellow: number;
    green: number;
    black: number;
    notes: string;
    respondedAt: string;
  } | null;
};

type MciTransportAssignment = {
  id: number;
  incidentCode: string;
  hospitalName: string;
  teamName: string;
  status: "DRAFT" | "SENT_TO_TEAM" | "TRANSPORT_DECIDED" | "TRANSPORT_DECLINED" | "ARRIVED";
  patients: Array<{
    patientNo: string;
    currentTag: "RED" | "YELLOW" | "GREEN" | "BLACK";
    injuryDetails: string;
  }>;
};

const colorLabels: Array<{ key: keyof Counts; label: string; className: string }> = [
  { key: "red", label: "赤", className: "border-rose-200 bg-rose-50 text-rose-700" },
  { key: "yellow", label: "黄", className: "border-amber-200 bg-amber-50 text-amber-700" },
  { key: "green", label: "緑", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { key: "black", label: "黒", className: "border-slate-300 bg-slate-100 text-slate-800" },
];

function toCount(value: string) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return 0;
  return Math.max(0, Math.min(9999, Math.trunc(numberValue)));
}

function tagLabel(tag: string) {
  if (tag === "RED") return "赤";
  if (tag === "YELLOW") return "黄";
  if (tag === "GREEN") return "緑";
  if (tag === "BLACK") return "黒";
  return tag;
}

function CapacityInputs({
  value,
  onChange,
}: {
  value: Counts;
  onChange: (next: Counts) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {colorLabels.map((color) => (
        <label key={color.key} className={`rounded-xl border px-2 py-2 ${color.className}`}>
          <span className="block text-[11px] font-bold">{color.label}</span>
          <input
            type="number"
            min={0}
            max={9999}
            value={value[color.key]}
            onChange={(event) => onChange({ ...value, [color.key]: toCount(event.target.value) })}
            className="mt-1 h-9 w-full rounded-lg border border-white/80 bg-white px-2 text-sm font-bold text-slate-900 outline-none focus:border-slate-400"
          />
        </label>
      ))}
    </div>
  );
}

export function HospitalMciRequestsPanel() {
  const [rows, setRows] = useState<MciHospitalRequest[]>([]);
  const [transports, setTransports] = useState<MciTransportAssignment[]>([]);
  const [capacityById, setCapacityById] = useState<Record<number, Counts>>({});
  const [notesById, setNotesById] = useState<Record<number, string>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "sending" | "error" | "success">("idle");
  const [message, setMessage] = useState("");

  const loadRows = async () => {
    setStatus("loading");
    try {
      const [requestsRes, transportsRes] = await Promise.all([
        fetch("/api/hospitals/mci-requests"),
        fetch("/api/hospitals/mci-transport-assignments"),
      ]);
      const data = (await requestsRes.json().catch(() => ({}))) as { rows?: MciHospitalRequest[]; message?: string };
      const transportData = (await transportsRes.json().catch(() => ({}))) as { rows?: MciTransportAssignment[] };
      if (!requestsRes.ok) {
        setStatus("error");
        setMessage(data.message ?? "MCI受入依頼の取得に失敗しました。");
        return;
      }
      const nextRows = Array.isArray(data.rows) ? data.rows : [];
      setRows(nextRows);
      setTransports(Array.isArray(transportData.rows) ? transportData.rows : []);
      setCapacityById((current) => {
        const next = { ...current };
        for (const row of nextRows) {
          if (!next[row.id]) {
            next[row.id] = row.offer
              ? { red: row.offer.red, yellow: row.offer.yellow, green: row.offer.green, black: row.offer.black }
              : { red: 0, yellow: 0, green: 0, black: 0 };
          }
        }
        return next;
      });
      setStatus("idle");
    } catch {
      setStatus("error");
      setMessage("MCI受入依頼の取得に失敗しました。");
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRows();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const respond = async (row: MciHospitalRequest, nextStatus: "ACCEPTABLE" | "NOT_ACCEPTABLE") => {
    setStatus("sending");
    setMessage("");
    try {
      const res = await fetch(`/api/hospitals/mci-requests/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          capacities: capacityById[row.id] ?? { red: 0, yellow: 0, green: 0, black: 0 },
          notes: notesById[row.id] ?? "",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { row?: MciHospitalRequest; message?: string };
      if (!res.ok || !data.row) {
        setStatus("error");
        setMessage(data.message ?? "MCI受入依頼への返信に失敗しました。");
        return;
      }
      setRows((current) => current.map((item) => (item.id === data.row!.id ? data.row! : item)));
      setStatus("success");
      setMessage(nextStatus === "ACCEPTABLE" ? "受入可能人数を送信しました。" : "受入不可を送信しました。");
    } catch {
      setStatus("error");
      setMessage("MCI受入依頼への返信に失敗しました。");
    }
  };

  if (rows.length === 0 && transports.length === 0 && status !== "loading") return null;

  return (
    <section className="mb-5 rounded-[24px] border border-red-200 bg-red-50/40 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.16em] text-red-700">MCI TRIAGE REQUESTS</p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">大規模災害TRIAGE受入依頼</h2>
          <p className="mt-1 text-sm text-slate-600">病院側はTRIAGEモードを持たず、色別の受入可能人数だけをdispatchへ返します。</p>
        </div>
        <button
          type="button"
          onClick={() => void loadRows()}
          disabled={status === "loading" || status === "sending"}
          className="inline-flex h-9 items-center rounded-xl border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          更新
        </button>
      </div>
      <div className="mt-3 space-y-3">
        {transports.length > 0 ? (
          <div className="rounded-2xl border border-red-200 bg-white px-3 py-3">
            <p className="text-[11px] font-bold tracking-[0.16em] text-red-700">MCI TRANSPORT DECIDED</p>
            <div className="mt-2 space-y-2">
              {transports.map((assignment) => (
                <article key={assignment.id} className="rounded-xl bg-red-50 px-3 py-2 ring-1 ring-red-100">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-900">{assignment.incidentCode} / {assignment.teamName}</p>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-red-700">{assignment.status}</span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-700">
                    {assignment.patients.map((patient) => `${tagLabel(patient.currentTag)} ${patient.patientNo}${patient.injuryDetails ? `: ${patient.injuryDetails}` : ""}`).join(" / ")}
                  </p>
                </article>
              ))}
            </div>
          </div>
        ) : null}
        {rows.map((row) => (
          <article key={row.id} className="rounded-2xl bg-white px-3 py-3 ring-1 ring-red-100">
            <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white">{row.incidentCode}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">{row.status}</span>
                  <p className="text-sm font-bold text-slate-950">{row.requestId}</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-800">{row.disasterSummary}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  START 赤{row.startCounts.red} / 黄{row.startCounts.yellow} / 緑{row.startCounts.green} / 黒{row.startCounts.black}
                  <span className="ml-3">PAT 赤{row.patCounts.red} / 黄{row.patCounts.yellow} / 緑{row.patCounts.green} / 黒{row.patCounts.black}</span>
                </p>
              </div>
              {row.offer ? (
                <p className="text-sm font-bold text-red-700">
                  返信済み: 赤{row.offer.red} / 黄{row.offer.yellow} / 緑{row.offer.green} / 黒{row.offer.black}
                </p>
              ) : null}
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
              <CapacityInputs
                value={capacityById[row.id] ?? { red: 0, yellow: 0, green: 0, black: 0 }}
                onChange={(next) => setCapacityById((current) => ({ ...current, [row.id]: next }))}
              />
              <label className="block">
                <span className="text-xs font-bold text-slate-600">備考</span>
                <textarea
                  value={notesById[row.id] ?? row.offer?.notes ?? ""}
                  onChange={(event) => setNotesById((current) => ({ ...current, [row.id]: event.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-500"
                />
              </label>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => void respond(row, "NOT_ACCEPTABLE")}
                disabled={status === "sending"}
                className="inline-flex h-9 items-center rounded-xl border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                受入不可
              </button>
              <button
                type="button"
                onClick={() => void respond(row, "ACCEPTABLE")}
                disabled={status === "sending"}
                className="inline-flex h-9 items-center rounded-xl bg-red-600 px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                色別人数で受入可能
              </button>
            </div>
          </article>
        ))}
      </div>
      {message ? <p className={`mt-2 text-xs font-semibold ${status === "error" ? "text-rose-700" : "text-emerald-700"}`}>{message}</p> : null}
    </section>
  );
}
