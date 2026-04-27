"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { AdminComplianceOperatingUnitRecord, AdminComplianceOperatingUnitScope } from "@/lib/admin/adminComplianceDefinitions";

type AdminComplianceOperatingUnitManagerProps = {
  operatingUnits: AdminComplianceOperatingUnitRecord[];
};

type CreateState = {
  scope: AdminComplianceOperatingUnitScope;
  unitCode: string;
  displayLabel: string;
};

const initialCreateState: CreateState = {
  scope: "admin",
  unitCode: "",
  displayLabel: "",
};

export function AdminComplianceOperatingUnitManager({ operatingUnits }: AdminComplianceOperatingUnitManagerProps) {
  const router = useRouter();
  const [createForm, setCreateForm] = useState<CreateState>(initialCreateState);
  const [drafts, setDrafts] = useState<Record<number, { displayLabel: string; isActive: boolean }>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | "create" | null>(null);

  const grouped = useMemo(() => {
    return {
      admin: operatingUnits.filter((item) => item.scope === "admin"),
      shared: operatingUnits.filter((item) => item.scope === "shared"),
    } as const;
  }, [operatingUnits]);

  function getDraft(unit: AdminComplianceOperatingUnitRecord) {
    return drafts[unit.id] ?? { displayLabel: unit.displayLabel, isActive: unit.isActive };
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyId("create");
    setFieldErrors({});
    setMessage(null);
    try {
      const response = await fetch("/api/admin/compliance-operating-units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string; fieldErrors?: Record<string, string> };
      if (!response.ok) {
        setFieldErrors(payload.fieldErrors ?? {});
        setMessage(payload.message ?? "運用主体の追加に失敗しました。");
        return;
      }
      setCreateForm(initialCreateState);
      setMessage("運用主体を追加しました。");
      router.refresh();
    } catch {
      setMessage("通信に失敗しました。");
    } finally {
      setBusyId(null);
    }
  }

  async function saveUnit(unit: AdminComplianceOperatingUnitRecord) {
    const draft = getDraft(unit);
    setBusyId(unit.id);
    setFieldErrors({});
    setMessage(null);
    try {
      const response = await fetch("/api/admin/compliance-operating-units", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: unit.id,
          displayLabel: draft.displayLabel,
          isActive: draft.isActive,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string; fieldErrors?: Record<string, string> };
      if (!response.ok) {
        setFieldErrors(payload.fieldErrors ?? {});
        setMessage(payload.message ?? "運用主体の更新に失敗しました。");
        return;
      }
      setMessage("運用主体を更新しました。");
      router.refresh();
    } catch {
      setMessage("通信に失敗しました。");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4" data-testid="compliance-operating-units">
      <form className="grid gap-4 rounded-[24px] border border-slate-200/80 bg-slate-50/70 px-5 py-5" onSubmit={handleCreate}>
        <div className="grid gap-4 md:grid-cols-[180px_minmax(0,220px)_minmax(0,1fr)_auto]">
          <label className="block">
            <span className="ds-field-label">scope</span>
            <select
              value={createForm.scope}
              onChange={(event) => setCreateForm((current) => ({ ...current, scope: event.target.value as AdminComplianceOperatingUnitScope }))}
              className="ds-field"
              data-testid="operating-unit-scope"
            >
              <option value="admin">admin</option>
              <option value="shared">shared</option>
            </select>
            {fieldErrors.scope ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.scope}</p> : null}
          </label>
          <label className="block">
            <span className="ds-field-label">unit code</span>
            <input
              value={createForm.unitCode}
              onChange={(event) => setCreateForm((current) => ({ ...current, unitCode: event.target.value }))}
              className="ds-field"
              placeholder="example_admin"
              data-testid="operating-unit-code"
            />
            {fieldErrors.unitCode ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.unitCode}</p> : null}
          </label>
          <label className="block">
            <span className="ds-field-label">表示名</span>
            <input
              value={createForm.displayLabel}
              onChange={(event) => setCreateForm((current) => ({ ...current, displayLabel: event.target.value }))}
              className="ds-field"
              placeholder="例: 運用管理共通"
              data-testid="operating-unit-label"
            />
            {fieldErrors.displayLabel ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.displayLabel}</p> : null}
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={busyId === "create"}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="operating-unit-create"
            >
              {busyId === "create" ? "追加中..." : "追加"}
            </button>
          </div>
        </div>
        <p className="text-xs leading-6 text-slate-500">admin / shared の運用主体はここで増やし、registry 候補へ自動同期します。</p>
      </form>

      {message ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-700" data-testid="operating-unit-message">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {(["admin", "shared"] as const).map((scope) => (
          <section key={scope} className="rounded-[24px] border border-slate-200/80 bg-white px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400">{scope.toUpperCase()}</p>
                <h3 className="mt-1 text-base font-bold text-slate-950">{scope === "admin" ? "運用管理主体" : "全体共通主体"}</h3>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                {grouped[scope].length} 件
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {grouped[scope].map((unit) => {
                const draft = getDraft(unit);
                return (
                  <article
                    key={unit.id}
                    className="rounded-[20px] bg-slate-50/80 px-4 py-4"
                    data-testid={`operating-unit-row-${unit.id}`}
                    data-unit-code={unit.unitCode}
                    data-unit-id={unit.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-500">{unit.unitCode}</p>
                        <p className="mt-1 text-xs text-slate-500">ID {unit.id} / 更新 {unit.updatedAt}</p>
                      </div>
                      <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
                        <input
                          type="checkbox"
                          checked={draft.isActive}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [unit.id]: { ...draft, isActive: event.target.checked },
                            }))
                          }
                          data-testid={`operating-unit-active-${unit.unitCode}`}
                        />
                        active
                      </label>
                    </div>
                    <label className="mt-3 block">
                      <span className="ds-field-label">表示名</span>
                      <input
                        value={draft.displayLabel}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [unit.id]: { ...draft, displayLabel: event.target.value },
                          }))
                        }
                        className="ds-field"
                        data-testid={`operating-unit-display-code-${unit.unitCode}`}
                      />
                    </label>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => void saveUnit(unit)}
                        disabled={busyId === unit.id}
                        className="inline-flex h-10 items-center justify-center rounded-2xl bg-white px-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        data-testid={`operating-unit-save-code-${unit.unitCode}`}
                      >
                        {busyId === unit.id ? "保存中..." : "更新"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
