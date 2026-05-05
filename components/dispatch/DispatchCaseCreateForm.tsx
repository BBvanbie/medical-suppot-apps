"use client";

import { useState } from "react";

import { BUTTON_BASE_CLASS, BUTTON_VARIANT_CLASS } from "@/components/shared/buttonStyles";
import { UserModeBadge } from "@/components/shared/UserModeBadge";

import { CURRENT_CASE_DIVISIONS } from "@/lib/caseDivision";
import type { DispatchTeamOption } from "@/lib/dispatch/dispatchRepository";
import type { AppMode } from "@/lib/appMode";

type DispatchCaseCreateFormProps = {
  teamOptions: DispatchTeamOption[];
  currentMode: AppMode;
};

type CreateResponse = {
  caseId?: string;
  caseIds?: string[];
  message?: string;
  fieldErrors?: Record<string, string>;
};

const INITIAL_VALUES = {
  teamIds: [] as string[],
  dispatchDate: "",
  dispatchTime: "",
  dispatchAddress: "",
};

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

export function DispatchCaseCreateForm({ teamOptions, currentMode }: DispatchCaseCreateFormProps) {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [divisionFilter, setDivisionFilter] = useState("");
  const [teamSearch, setTeamSearch] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [createdCaseIds, setCreatedCaseIds] = useState<string[]>([]);
  const normalizedTeamSearch = normalizeSearchText(teamSearch);
  const visibleTeamOptions = teamOptions.filter((option) => {
    const matchesDivision = !divisionFilter || option.division === divisionFilter;
    const searchableText = normalizeSearchText(`${option.teamName} ${option.teamCode} ${option.label}`);
    return matchesDivision && (!normalizedTeamSearch || searchableText.includes(normalizedTeamSearch));
  });
  const visibleTeamIds = visibleTeamOptions.map((option) => String(option.id));
  const selectedVisibleTeamCount = visibleTeamIds.filter((teamId) => values.teamIds.includes(teamId)).length;

  const toggleTeam = (teamId: string) => {
    setValues((prev) => {
      const selected = prev.teamIds.includes(teamId);
      return {
        ...prev,
        teamIds: selected ? prev.teamIds.filter((value) => value !== teamId) : [...prev.teamIds, teamId],
      };
    });
  };

  const selectVisibleTeams = () => {
    if (visibleTeamIds.length === 0) return;
    setValues((prev) => ({
      ...prev,
      teamIds: Array.from(new Set([...prev.teamIds, ...visibleTeamIds])),
    }));
  };

  const clearVisibleTeams = () => {
    if (visibleTeamIds.length === 0) return;
    const visibleTeamIdSet = new Set(visibleTeamIds);
    setValues((prev) => ({
      ...prev,
      teamIds: prev.teamIds.filter((teamId) => !visibleTeamIdSet.has(teamId)),
    }));
  };

  const resetTeamFilters = () => {
    setDivisionFilter("");
    setTeamSearch("");
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("submitting");
    setFieldErrors({});
    setMessage("");
    setCreatedCaseIds([]);

    try {
      const res = await fetch("/api/dispatch/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamIds: values.teamIds,
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
      const nextCaseIds = data.caseIds?.length ? data.caseIds : [data.caseId].filter((caseId): caseId is string => Boolean(caseId));
      setMessage(`${nextCaseIds.length}隊へ指令を起票しました。`);
      setCreatedCaseIds(nextCaseIds);
      setValues(INITIAL_VALUES);
    } catch {
      setStatus("error");
      setMessage("通信に失敗しました。");
    }
  };

  return (
    <div className="ds-panel-surface ds-radius-hero p-6">
      <div className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase ds-track-eyebrow text-amber-600">DISPATCH CREATE</p>
          <UserModeBadge mode={currentMode} compact />
        </div>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">新規事案起票</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">隊名、覚知日時、指令先住所のみを入力して EMS 側へ新規事案を作成します。{currentMode === "TRAINING" ? "この画面から作る事案は training 案件として保存されます。" : "この画面から作る事案は live 案件として保存されます。"}</p>
      </div>

      <form className="mt-6 grid gap-5 md:grid-cols-2" onSubmit={onSubmit}>
        <fieldset className="block md:col-span-2">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <legend className="text-sm font-semibold text-slate-700">出場隊（複数選択可）</legend>
              <p className="mt-1 text-xs text-slate-500">方面と隊名・隊コードで候補を絞り込み、表示中の隊だけをまとめて選択できます。</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 ds-text-xs-compact font-semibold text-slate-600">
                表示 {visibleTeamOptions.length} / 全 {teamOptions.length}
              </span>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 ds-text-xs-compact font-semibold text-amber-700">
                {values.teamIds.length} 隊選択中
              </span>
            </div>
          </div>

          <div className="mb-3 grid gap-3 rounded-2xl border border-amber-100/80 bg-amber-50/30 p-3 ds-grid-md-dispatch-filters">
            <label className="block">
              <span className="mb-1 block ds-text-xs-compact font-semibold uppercase ds-track-section text-slate-500">方面</span>
              <select
                data-testid="dispatch-team-division-filter"
                value={divisionFilter}
                onChange={(event) => setDivisionFilter(event.target.value)}
                className="ds-field h-10 w-full rounded-xl px-3 text-sm text-slate-900 outline-none transition focus:border-amber-500"
              >
                <option value="">全方面</option>
                {CURRENT_CASE_DIVISIONS.map((division) => (
                  <option key={division} value={division}>
                    {division}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block ds-text-xs-compact font-semibold uppercase ds-track-section text-slate-500">隊検索</span>
              <input
                data-testid="dispatch-team-search"
                type="search"
                value={teamSearch}
                onChange={(event) => setTeamSearch(event.target.value)}
                placeholder="例: 本部機動第1 / 三鷹 / EMS-015"
                className="ds-field h-10 w-full rounded-xl px-3 text-sm text-slate-900 outline-none transition focus:border-amber-500"
              />
            </label>
            <div className="flex flex-wrap items-end gap-2">
              <button
                type="button"
                onClick={selectVisibleTeams}
                disabled={visibleTeamOptions.length === 0 || selectedVisibleTeamCount === visibleTeamOptions.length}
                className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.secondary} h-10 rounded-xl px-3 text-xs disabled:cursor-not-allowed disabled:opacity-50`}
              >
                表示中を選択
              </button>
              <button
                type="button"
                onClick={clearVisibleTeams}
                disabled={selectedVisibleTeamCount === 0}
                className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.secondary} h-10 rounded-xl px-3 text-xs disabled:cursor-not-allowed disabled:opacity-50`}
              >
                表示中を解除
              </button>
              <button
                type="button"
                onClick={resetTeamFilters}
                disabled={!divisionFilter && !teamSearch}
                className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.secondary} h-10 rounded-xl px-3 text-xs disabled:cursor-not-allowed disabled:opacity-50`}
              >
                絞り込み解除
              </button>
            </div>
          </div>
          <div className="grid max-h-72 gap-2 overflow-auto rounded-2xl border border-amber-100/80 bg-amber-50/35 p-2 md:grid-cols-2">
            {visibleTeamOptions.map((option) => {
              const optionValue = String(option.id);
              const checked = values.teamIds.includes(optionValue);
              return (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-sm transition ${
                    checked
                      ? "border-amber-300 bg-white text-slate-950 ds-shadow-inset-warning-soft"
                      : "border-transparent bg-white/70 text-slate-700 hover:border-amber-200 hover:bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleTeam(optionValue)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="min-w-0">
                    <span className="block font-semibold">{option.teamName}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{option.teamCode} / {option.division}</span>
                  </span>
                </label>
              );
            })}
            {visibleTeamOptions.length === 0 ? (
              <div className="md:col-span-2 rounded-xl border border-dashed border-amber-200 bg-white/70 px-4 py-6 text-center text-sm text-slate-500">
                条件に一致する出場隊がありません。方面または隊検索を変更してください。
              </div>
            ) : null}
          </div>
          {fieldErrors.teamIds || fieldErrors.teamId ? (
            <span className="mt-1 block text-xs font-medium text-rose-600">{fieldErrors.teamIds ?? fieldErrors.teamId}</span>
          ) : null}
        </fieldset>

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
          <p className="mt-2">事案 ID は隊ごとに送信時サーバー側で採番します。</p>
          <p className="mt-1">同じ指令操作で作成した事案は内部的に dispatch group として紐付けます。</p>
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
                {createdCaseIds.length > 0 ? ` (${createdCaseIds.join(", ")})` : ""}
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
