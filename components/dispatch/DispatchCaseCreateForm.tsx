"use client";

import { useState } from "react";

import { BUTTON_BASE_CLASS, BUTTON_VARIANT_CLASS } from "@/components/shared/buttonStyles";
import { UserModeBadge } from "@/components/shared/UserModeBadge";

import type { DispatchTeamOption } from "@/lib/dispatch/dispatchRepository";
import type { AppMode } from "@/lib/appMode";

type DispatchCaseCreateFormProps = {
  teamOptions: DispatchTeamOption[];
  currentMode: AppMode;
};

type CreateResponse = {
  caseId?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

const INITIAL_VALUES = {
  teamId: "",
  dispatchDate: "",
  dispatchTime: "",
  dispatchAddress: "",
};

export function DispatchCaseCreateForm({ teamOptions, currentMode }: DispatchCaseCreateFormProps) {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [createdCaseId, setCreatedCaseId] = useState("");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("submitting");
    setFieldErrors({});
    setMessage("");
    setCreatedCaseId("");

    try {
      const res = await fetch("/api/dispatch/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: values.teamId,
          dispatchDate: values.dispatchDate,
          dispatchTime: values.dispatchTime,
          dispatchAddress: values.dispatchAddress,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as CreateResponse;
      if (!res.ok || !data.caseId) {
        setStatus("error");
        setFieldErrors(data.fieldErrors ?? {});
        setMessage(data.message ?? "起票に失敗しました。");
        return;
      }

      setStatus("success");
      setMessage("新規事案を起票しました。");
      setCreatedCaseId(data.caseId);
      setValues(INITIAL_VALUES);
    } catch {
      setStatus("error");
      setMessage("通信に失敗しました。");
    }
  };

  return (
    <div className="ds-panel-surface rounded-[28px] p-6">
      <div className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">DISPATCH CREATE</p>
          <UserModeBadge mode={currentMode} compact />
        </div>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">新規事案起票</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">隊名、覚知日時、指令先住所のみを入力して EMS 側へ新規事案を作成します。{currentMode === "TRAINING" ? "この画面から作る事案は training 案件として保存されます。" : "この画面から作る事案は live 案件として保存されます。"}</p>
      </div>

      <form className="mt-6 grid gap-5 md:grid-cols-2" onSubmit={onSubmit}>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">隊名</span>
          <select
            value={values.teamId}
            onChange={(event) => setValues((prev) => ({ ...prev, teamId: event.target.value }))}
            className="ds-field h-11 w-full rounded-2xl px-3 text-sm text-slate-900 outline-none transition focus:border-amber-500"
          >
            <option value="">選択してください</option>
            {teamOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          {fieldErrors.teamId ? <span className="mt-1 block text-xs font-medium text-rose-600">{fieldErrors.teamId}</span> : null}
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">覚知日付</span>
          <input
            type="date"
            value={values.dispatchDate}
            onChange={(event) => setValues((prev) => ({ ...prev, dispatchDate: event.target.value }))}
            className="ds-field h-11 w-full rounded-2xl px-3 text-sm text-slate-900 outline-none transition focus:border-amber-500"
          />
          {fieldErrors.dispatchDate ? <span className="mt-1 block text-xs font-medium text-rose-600">{fieldErrors.dispatchDate}</span> : null}
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">覚知時間</span>
          <input
            type="time"
            value={values.dispatchTime}
            onChange={(event) => setValues((prev) => ({ ...prev, dispatchTime: event.target.value }))}
            className="ds-field h-11 w-full rounded-2xl px-3 text-sm text-slate-900 outline-none transition focus:border-amber-500"
          />
          {fieldErrors.dispatchTime ? <span className="mt-1 block text-xs font-medium text-rose-600">{fieldErrors.dispatchTime}</span> : null}
        </label>

        <div className="ds-muted-panel rounded-2xl border-amber-100/80 px-4 py-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">自動生成内容</p>
          <p className="mt-2">事案 ID は送信時にサーバー側で採番します。</p>
          <p className="mt-1">EMS 一覧には覚知日時、住所、割当隊を反映します。</p>
        </div>

        <label className="block md:col-span-2">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">指令先住所</span>
          <textarea
            rows={4}
            value={values.dispatchAddress}
            onChange={(event) => setValues((prev) => ({ ...prev, dispatchAddress: event.target.value }))}
            className="ds-field w-full rounded-2xl px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500"
          />
          {fieldErrors.dispatchAddress ? <span className="mt-1 block text-xs font-medium text-rose-600">{fieldErrors.dispatchAddress}</span> : null}
        </label>

        <div className="ds-muted-panel md:col-span-2 flex items-center justify-between gap-4 rounded-2xl border-amber-100/80 px-4 py-4">
          <div className="min-h-10">
            {message ? (
              <p className={`text-sm font-semibold ${status === "success" ? "text-emerald-700" : "text-rose-700"}`}>
                {message}
                {createdCaseId ? ` (${createdCaseId})` : ""}
              </p>
            ) : (
              <p className="text-sm text-slate-500">必須項目のみ入力して送信します。</p>
            )}
          </div>
          <button
            type="submit"
            disabled={status === "submitting"}
            className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.primary} inline-flex h-11 items-center rounded-2xl border-amber-600 bg-amber-600 px-5 text-sm text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300`}
          >
            {status === "submitting" ? "送信中..." : "送信"}
          </button>
        </div>
      </form>
    </div>
  );
}
