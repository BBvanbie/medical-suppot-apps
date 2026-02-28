"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { RequestStatusBadge } from "@/components/shared/RequestStatusBadge";

type RequestDetail = {
  targetId: number;
  requestId: string;
  caseId: string;
  sentAt: string;
  status: string;
  statusLabel: string;
  openedAt: string | null;
  patientSummary: Record<string, unknown> | null;
  selectedDepartments: string[];
  fromTeamCode: string | null;
  fromTeamName: string | null;
  consultComment?: string | null;
  emsReplyComment?: string | null;
};

type HospitalRequestDetailProps = {
  detail: RequestDetail;
};

type AcceptModalPhase = "confirm" | "sending" | "success" | "error";
type ConsultModalPhase = "confirm" | "sending" | "success" | "error";

const nextActions = [
  { label: "受入可能", status: "ACCEPTABLE" },
  { label: "受入不可", status: "NOT_ACCEPTABLE" },
  { label: "要相談", status: "NEGOTIATING" },
] as const;

function asText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function asArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is Record<string, unknown> => Boolean(v && typeof v === "object" && !Array.isArray(v)));
}

export function HospitalRequestDetail({ detail }: HospitalRequestDetailProps) {
  const router = useRouter();
  const [status, setStatus] = useState(detail.status);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [acceptModalPhase, setAcceptModalPhase] = useState<AcceptModalPhase>("confirm");
  const [acceptModalError, setAcceptModalError] = useState<string | null>(null);
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [consultModalPhase, setConsultModalPhase] = useState<ConsultModalPhase>("confirm");
  const [consultModalError, setConsultModalError] = useState<string | null>(null);
  const [consultNote, setConsultNote] = useState("");
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sentAtLabel = Number.isNaN(new Date(detail.sentAt).getTime())
    ? detail.sentAt
    : new Date(detail.sentAt).toLocaleString("ja-JP");

  const summary = detail.patientSummary ?? {};
  const relatedPeople = asArray(summary.relatedPeople);
  const pastHistories = asArray(summary.pastHistories);
  const vitals = asArray(summary.vitals);
  const changedFindings = asArray(summary.changedFindings);

  const senderNameFallback = asText(summary.teamName) === "-" ? null : asText(summary.teamName);
  const senderCodeFallback = asText(summary.teamCode) === "-" ? null : asText(summary.teamCode);
  const senderName = detail.fromTeamName ?? senderNameFallback ?? "-";
  const senderCode = detail.fromTeamCode ?? senderCodeFallback ?? null;

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  async function updateStatus(nextStatus: (typeof nextActions)[number]["status"], note?: string) {
    setIsPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/hospitals/requests/${detail.targetId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, note: note ?? null }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        const message = data?.message ?? "状態更新に失敗しました。";
        setError(message);
        return { ok: false, message };
      }
      const data = (await res.json()) as { status: string; statusLabel: string };
      setStatus(data.status);
      router.refresh();
      return { ok: true as const };
    } catch {
      const message = "状態更新に失敗しました。";
      setError(message);
      return { ok: false, message };
    } finally {
      setIsPending(false);
    }
  }

  async function handleAcceptConfirm() {
    setAcceptModalPhase("sending");
    setAcceptModalError(null);
    const result = await updateStatus("ACCEPTABLE");
    if (!result?.ok) {
      setAcceptModalPhase("error");
      setAcceptModalError(result?.message ?? "状態更新に失敗しました。");
      return;
    }
    setAcceptModalPhase("success");
    redirectTimerRef.current = setTimeout(() => {
      router.push("/hospitals/requests");
    }, 3000);
  }

  function openAcceptModal() {
    setAcceptModalError(null);
    setAcceptModalPhase("confirm");
    setIsAcceptModalOpen(true);
  }

  function closeAcceptModal() {
    if (acceptModalPhase === "sending") return;
    setIsAcceptModalOpen(false);
    setAcceptModalError(null);
    setAcceptModalPhase("confirm");
  }

  function openConsultModal() {
    setConsultModalError(null);
    setConsultModalPhase("confirm");
    setConsultNote("");
    setIsConsultModalOpen(true);
  }

  function closeConsultModal() {
    if (consultModalPhase === "sending") return;
    setIsConsultModalOpen(false);
    setConsultModalError(null);
    setConsultModalPhase("confirm");
  }

  async function handleConsultConfirm() {
    if (!consultNote.trim()) {
      setConsultModalError("コメントを入力してください。");
      return;
    }
    setConsultModalPhase("sending");
    setConsultModalError(null);
    const result = await updateStatus("NEGOTIATING", consultNote.trim());
    if (!result?.ok) {
      setConsultModalPhase("error");
      setConsultModalError(result?.message ?? "状態更新に失敗しました。");
      return;
    }
    setConsultModalPhase("success");
    setTimeout(() => {
      closeConsultModal();
    }, 1200);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">REQUEST DETAIL</p>
        <h2 className="mt-2 text-lg font-bold text-slate-900">受入依頼詳細</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-700 md:grid-cols-2">
          <p>依頼ID: <span className="font-semibold">{detail.requestId}</span></p>
          <p>事案ID: <span className="font-semibold">{detail.caseId}</span></p>
          <p>送信日時: <span className="font-semibold">{sentAtLabel}</span></p>
          <p>
            送信救急隊: <span className="font-semibold">{senderName}</span>
            {senderCode ? ` (${senderCode})` : ""}
          </p>
        </div>
        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-500">選択診療科</p>
          <p className="mt-1 text-sm text-slate-700">{detail.selectedDepartments.join(", ") || "-"}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">PATIENT SUMMARY</p>

        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="rounded-lg bg-sky-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">基本情報</p>
            <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-slate-700 md:grid-cols-3">
              <p>氏名: <span className="font-semibold">{asText(summary.name)}</span></p>
              <p>年齢: <span className="font-semibold">{asText(summary.age)}</span></p>
              <p>性別: <span className="font-semibold">{asText(summary.gender)}</span></p>
              <p className="md:col-span-2">住所: <span className="font-semibold">{asText(summary.address)}</span></p>
              <p>電話: <span className="font-semibold">{asText(summary.phone)}</span></p>
              <p>ADL: <span className="font-semibold">{asText(summary.adl)}</span></p>
              <p>アレルギー: <span className="font-semibold">{asText(summary.allergy)}</span></p>
              <p>体重: <span className="font-semibold">{asText(summary.weight)}</span></p>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold text-sky-700/80">関係者</p>
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                {relatedPeople.length > 0 ? (
                  relatedPeople.map((p, i) => (
                    <div key={`related-${i}`} className="rounded-lg border border-sky-100 bg-white/85 p-3 text-sm">
                      <p>氏名: <span className="font-semibold">{asText(p.name)}</span></p>
                      <p>関係: <span className="font-semibold">{asText(p.relation)}</span></p>
                      <p>電話: <span className="font-semibold">{asText(p.phone)}</span></p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">-</p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold text-sky-700/80">既往歴</p>
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                {pastHistories.length > 0 ? (
                  pastHistories.map((h, i) => (
                    <div key={`history-${i}`} className="rounded-lg border border-sky-100 bg-white/85 p-3 text-sm">
                      <p>病名: <span className="font-semibold">{asText(h.disease)}</span></p>
                      <p>かかりつけ: <span className="font-semibold">{asText(h.clinic)}</span></p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">-</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="rounded-lg bg-emerald-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">概要_バイタル</p>
            <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-slate-700">
              <p>主訴: <span className="font-semibold">{asText(summary.chiefComplaint)}</span></p>
              <p>現場概要: <span className="font-semibold">{asText(summary.dispatchSummary)}</span></p>
            </div>
            <div className="mt-4">
              <p className="text-sm font-semibold text-emerald-700/90">基本バイタル（時系列）</p>
              <div className="mt-3 space-y-3">
                {vitals.length > 0 ? (
                  vitals.map((v, i) => (
                    <div
                      key={`vital-${i}`}
                      className="rounded-xl border border-emerald-100 bg-white/90 p-4 text-base leading-relaxed text-slate-800"
                    >
                      <p className="text-base font-bold">{i + 1}回目 / 測定時刻: {asText(v.measuredAt)}</p>
                      <p className="mt-1">意識: {asText(v.consciousnessType).toUpperCase()} {asText(v.consciousnessValue)}</p>
                      <p className="mt-1">呼吸数: {asText(v.respiratoryRate)} / 脈拍: {asText(v.pulseRate)} / SpO2: {asText(v.spo2)}</p>
                      <p className="mt-1">
                        体温: {v.temperatureUnavailable ? "測定不能" : asText(v.temperature)} /
                        血圧(右): {asText(v.bpRightSystolic)}/{asText(v.bpRightDiastolic)} /
                        血圧(左): {asText(v.bpLeftSystolic)}/{asText(v.bpLeftDiastolic)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-base text-slate-500">-</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">所見</p>
            <div className="mt-3 space-y-2">
              {changedFindings.length > 0 ? (
                changedFindings.map((f, i) => (
                  <div key={`finding-${i}`} className="rounded-lg border border-amber-100 bg-white/85 p-3 text-sm">
                    <p className="font-semibold">{asText(f.major)} &gt; {asText(f.middle)}</p>
                    <p>{asText(f.detail)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">-</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">STATUS</p>
        <div className="mt-2 flex items-center gap-2 text-sm text-slate-700">
          <span>現在状態:</span>
          <RequestStatusBadge status={status} />
        </div>
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <p>
            要相談コメント: <span className="font-semibold">{detail.consultComment?.trim() ? detail.consultComment : "-"}</span>
          </p>
          <p className="mt-1">
            A側回答: <span className="font-semibold">{detail.emsReplyComment?.trim() ? detail.emsReplyComment : "-"}</span>
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {nextActions.map((action) => (
            <button
              key={action.status}
              type="button"
              disabled={isPending || status === action.status}
              onClick={() => {
                if (action.status === "ACCEPTABLE") {
                  openAcceptModal();
                  return;
                }
                if (action.status === "NEGOTIATING") {
                  openConsultModal();
                  return;
                }
                void updateStatus(action.status);
              }}
              className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {action.label}
            </button>
          ))}
        </div>
        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
      </section>

      {isAcceptModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            {acceptModalPhase === "confirm" ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">CONFIRM</p>
                <h3 className="mt-2 text-lg font-bold text-slate-900">受入可能送信しますか？</h3>
                <p className="mt-2 text-sm text-slate-600">OKを押すと受入可能をA側へ送信します。</p>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeAcceptModal}
                    className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleAcceptConfirm()}
                    className="inline-flex h-10 items-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    OK
                  </button>
                </div>
              </>
            ) : null}

            {acceptModalPhase === "sending" ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">SENDING</p>
                <h3 className="mt-2 text-lg font-bold text-slate-900">送信中...</h3>
              </>
            ) : null}

            {acceptModalPhase === "success" ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">COMPLETED</p>
                <h3 className="mt-2 text-lg font-bold text-slate-900">送信完了</h3>
                <p className="mt-2 text-sm text-slate-600">3秒後に要請一覧へ移動します。</p>
              </>
            ) : null}

            {acceptModalPhase === "error" ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">ERROR</p>
                <h3 className="mt-2 text-lg font-bold text-slate-900">送信に失敗しました</h3>
                <p className="mt-2 text-sm text-rose-700">{acceptModalError ?? "状態更新に失敗しました。"}</p>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeAcceptModal}
                    className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                  >
                    閉じる
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleAcceptConfirm()}
                    className="inline-flex h-10 items-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    再送
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {isConsultModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            {consultModalPhase === "confirm" ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">CONSULT</p>
                <h3 className="mt-2 text-lg font-bold text-slate-900">要相談コメントを送信</h3>
                <label className="mt-3 block">
                  <span className="text-xs font-semibold text-slate-500">コメント</span>
                  <textarea
                    value={consultNote}
                    onChange={(e) => setConsultNote(e.target.value)}
                    rows={5}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="A側へ伝える相談内容を入力してください"
                  />
                </label>
                {consultModalError ? <p className="mt-2 text-sm text-rose-700">{consultModalError}</p> : null}
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeConsultModal}
                    className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleConsultConfirm()}
                    className="inline-flex h-10 items-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    送信
                  </button>
                </div>
              </>
            ) : null}

            {consultModalPhase === "sending" ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">SENDING</p>
                <h3 className="mt-2 text-lg font-bold text-slate-900">送信中...</h3>
              </>
            ) : null}

            {consultModalPhase === "success" ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">COMPLETED</p>
                <h3 className="mt-2 text-lg font-bold text-slate-900">送信完了</h3>
              </>
            ) : null}

            {consultModalPhase === "error" ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">ERROR</p>
                <h3 className="mt-2 text-lg font-bold text-slate-900">送信に失敗しました</h3>
                <p className="mt-2 text-sm text-rose-700">{consultModalError ?? "状態更新に失敗しました。"}</p>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeConsultModal}
                    className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                  >
                    閉じる
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
