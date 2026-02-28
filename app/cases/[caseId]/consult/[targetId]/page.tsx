"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Sidebar } from "@/components/home/Sidebar";

type ConsultRow = {
  targetId: number;
  requestId: string;
  caseId: string;
  sentAt: string;
  status?: string;
  hospitalName?: string;
  selectedDepartments?: string[];
  consultComment?: string;
  emsReplyComment?: string;
  canConsult?: boolean;
};

export default function CaseConsultPage() {
  const params = useParams<{ caseId: string; targetId: string }>();
  const router = useRouter();
  const caseId = String(params.caseId ?? "");
  const targetId = Number(params.targetId ?? "");

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [row, setRow] = useState<ConsultRow | null>(null);
  const [replyNote, setReplyNote] = useState("");

  useEffect(() => {
    if (!caseId || !Number.isFinite(targetId)) {
      setError("URLが不正です。");
      setLoading(false);
      return;
    }
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/cases/send-history?caseId=${encodeURIComponent(caseId)}&targetId=${encodeURIComponent(String(targetId))}`,
        );
        const data = (await res.json()) as { row?: ConsultRow; message?: string };
        if (!res.ok || !data.row) {
          setError(data.message ?? "相談情報の取得に失敗しました。");
          setRow(null);
          return;
        }
        setRow(data.row);
        setReplyNote(data.row.emsReplyComment ?? "");
      } catch {
        setError("相談情報の取得に失敗しました。");
        setRow(null);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [caseId, targetId]);

  const submitReply = async () => {
    if (!row || !replyNote.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/cases/send-history", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CONSULT_REPLY",
          caseId: row.caseId,
          targetId: row.targetId,
          note: replyNote.trim(),
        }),
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) {
        setError(data?.message ?? "相談回答の送信に失敗しました。");
        return;
      }
      router.push(`/cases/${encodeURIComponent(caseId)}`);
    } catch {
      setError("相談回答の送信に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard-shell h-screen overflow-hidden bg-[var(--dashboard-bg)] text-slate-900">
      <div className="flex h-full">
        <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen((v) => !v)} />
        <main className="flex min-w-0 flex-1 flex-col px-8 py-6">
          <header className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-teal)]">CONSULT</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">個別相談</h1>
            <p className="mt-1 text-sm text-slate-500">病院コメントに対する回答を送信します。</p>
          </header>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
            {loading ? <p className="text-sm text-slate-500">読み込み中...</p> : null}
            {!loading && row ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2 text-sm text-slate-700 md:grid-cols-2">
                  <p>事案ID: <span className="font-semibold">{row.caseId}</span></p>
                  <p>要請ID: <span className="font-semibold">{row.requestId}</span></p>
                  <p>病院: <span className="font-semibold">{row.hospitalName ?? "-"}</span></p>
                  <p>状態: <span className="font-semibold">{row.status ?? "-"}</span></p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">HPコメント</p>
                  <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {row.consultComment || "-"}
                  </div>
                </div>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-500">A回答</span>
                  <textarea
                    value={replyNote}
                    onChange={(e) => setReplyNote(e.target.value)}
                    rows={6}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="回答内容を入力してください"
                  />
                </label>
                {error ? <p className="text-sm text-rose-700">{error}</p> : null}
                <div className="flex justify-end gap-2">
                  <Link
                    href={`/cases/${encodeURIComponent(caseId)}`}
                    className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    戻る
                  </Link>
                  <button
                    type="button"
                    disabled={!replyNote.trim() || submitting || row.canConsult === false}
                    onClick={() => void submitReply()}
                    className="inline-flex items-center rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {submitting ? "送信中..." : "相談回答を送信"}
                  </button>
                </div>
              </div>
            ) : null}
            {!loading && !row && !error ? <p className="text-sm text-slate-500">相談情報がありません。</p> : null}
            {!loading && error && !row ? (
              <div className="mt-3">
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}
