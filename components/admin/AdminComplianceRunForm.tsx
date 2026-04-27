"use client";

import { FormEvent, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ADMIN_COMPLIANCE_OPERATIONS,
  type AdminComplianceOrganizationOption,
  type AdminComplianceEvidenceType,
  type AdminComplianceOperationKey,
  type AdminComplianceOrganizationScope,
  type AdminComplianceRunStatus,
} from "@/lib/admin/adminComplianceDefinitions";

type RecentRunOption = {
  id: number;
  operationLabel: string;
  completedAt: string;
};

type AdminComplianceRunFormProps = {
  recentRuns: RecentRunOption[];
  organizationOptions: AdminComplianceOrganizationOption[];
};

type FormState = {
  operationKey: AdminComplianceOperationKey;
  organizationScope: AdminComplianceOrganizationScope;
  organizationId: string;
  status: AdminComplianceRunStatus;
  completedAt: string;
  nextDueAt: string;
  supersedesRunId: string;
  evidenceType: AdminComplianceEvidenceType;
  evidenceLocation: string;
  evidenceReference: string;
  evidenceNotes: string;
  notes: string;
};

const defaultOperation = ADMIN_COMPLIANCE_OPERATIONS[0];

const scopeOptions: Array<{ value: AdminComplianceOrganizationScope; label: string; description: string }> = [
  { value: "shared", label: "全体共通", description: "導入組織横断の共通運用として記録します。" },
  { value: "hospital", label: "病院単位", description: "病院ごとの棚卸、監査、見直しを記録します。" },
  { value: "ems", label: "EMS 組織単位", description: "救急隊や消防本部側の運用記録を残します。" },
  { value: "admin", label: "運用管理単位", description: "システム運用管理側の共通記録として扱います。" },
] as const;

const evidenceTypeOptions: Array<{ value: AdminComplianceEvidenceType; label: string }> = [
  { value: "document", label: "文書" },
  { value: "folder", label: "フォルダ" },
  { value: "ticket", label: "チケット" },
  { value: "url", label: "URL" },
  { value: "other", label: "その他" },
] as const;

function toDatetimeLocalValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function createInitialState(): FormState {
  return {
    operationKey: defaultOperation.key,
    organizationScope: "shared",
    organizationId: "",
    status: "completed",
    completedAt: toDatetimeLocalValue(),
    nextDueAt: "",
    supersedesRunId: "",
    evidenceType: "other",
    evidenceLocation: "",
    evidenceReference: "",
    evidenceNotes: "",
    notes: "",
  };
}

export function AdminComplianceRunForm({ recentRuns, organizationOptions }: AdminComplianceRunFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(createInitialState);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [organizationQuery, setOrganizationQuery] = useState("");

  const selectedScopeDescription = useMemo(
    () => scopeOptions.find((item) => item.value === form.organizationScope)?.description ?? "",
    [form.organizationScope],
  );
  const scopedOptions = useMemo(
    () => organizationOptions.filter((item) => item.scope === form.organizationScope),
    [form.organizationScope, organizationOptions],
  );
  const deferredOrganizationQuery = useDeferredValue(organizationQuery);
  const filteredScopedOptions = useMemo(() => {
    const normalizedQuery = deferredOrganizationQuery.trim().toLowerCase();
    if (!normalizedQuery) return scopedOptions;
    return scopedOptions.filter((item) =>
      [item.label, String(item.organizationId), item.scope].join(" ").toLowerCase().includes(normalizedQuery),
    );
  }, [deferredOrganizationQuery, scopedOptions]);

  useEffect(() => {
    if (scopedOptions.length === 0) return;
    if (scopedOptions.some((item) => String(item.organizationId) === form.organizationId)) return;
    setForm((current) => ({ ...current, organizationId: String(scopedOptions[0].organizationId) }));
  }, [form.organizationId, scopedOptions]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});
    setMessage(null);

    try {
      const response = await fetch("/api/admin/compliance-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationKey: form.operationKey,
          organizationScope: form.organizationScope,
          organizationId: form.organizationId.trim() ? Number(form.organizationId) : null,
          status: form.status,
          completedAt: form.completedAt,
          nextDueAt: form.nextDueAt || null,
          supersedesRunId: form.supersedesRunId ? Number(form.supersedesRunId) : null,
          evidenceType: form.evidenceType,
          evidenceLocation: form.evidenceLocation,
          evidenceReference: form.evidenceReference,
          evidenceNotes: form.evidenceNotes,
          notes: form.notes,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        fieldErrors?: Record<string, string>;
      };

      if (!response.ok) {
        setFieldErrors(payload.fieldErrors ?? {});
        setMessage(payload.message ?? "記録の保存に失敗しました。");
        return;
      }

      setMessage("記録を保存しました。画面を更新します。");
      setForm(createInitialState());
      router.refresh();
    } catch {
      setMessage("通信に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => {
      if (key === "organizationScope") {
        const nextScope = value as AdminComplianceOrganizationScope;
        const nextOptions = organizationOptions.filter((item) => item.scope === nextScope);
        setOrganizationQuery("");
        return {
          ...current,
          organizationScope: nextScope,
          organizationId: nextOptions.some((item) => String(item.organizationId) === current.organizationId)
            ? current.organizationId
            : (nextOptions[0] ? String(nextOptions[0].organizationId) : ""),
        };
      }
      return { ...current, [key]: value };
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="ds-field-label">対象運用</span>
          <select
            value={form.operationKey}
            onChange={(event) => update("operationKey", event.target.value as AdminComplianceOperationKey)}
            className="ds-field"
          >
            {ADMIN_COMPLIANCE_OPERATIONS.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label} / {item.cadenceLabel}
              </option>
            ))}
          </select>
          {fieldErrors.operationKey ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.operationKey}</p> : null}
        </label>

        <label className="block">
          <span className="ds-field-label">対象スコープ</span>
          <select
            value={form.organizationScope}
            onChange={(event) => update("organizationScope", event.target.value as AdminComplianceOrganizationScope)}
            className="ds-field"
          >
            {scopeOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">{selectedScopeDescription}</p>
        </label>

        <label className="block">
          <span className="ds-field-label">対象組織</span>
          <div className="space-y-2">
            <input
              value={organizationQuery}
              onChange={(event) => setOrganizationQuery(event.target.value)}
              placeholder="病院名 / EMS 名 / operating unit / ID"
              className="ds-field"
              data-testid="compliance-organization-search"
            />
            <select value={form.organizationId} onChange={(event) => update("organizationId", event.target.value)} className="ds-field" data-testid="compliance-organization-select">
              {filteredScopedOptions.length === 0 ? <option value="">候補なし</option> : null}
              {filteredScopedOptions.map((item) => (
                <option key={`${item.scope}-${item.organizationId}`} value={String(item.organizationId)}>
                  {item.label} / ID {item.organizationId}
                </option>
              ))}
              {filteredScopedOptions.every((item) => String(item.organizationId) !== form.organizationId) &&
              scopedOptions.some((item) => String(item.organizationId) === form.organizationId)
                ? (() => {
                    const currentSelection = scopedOptions.find((item) => String(item.organizationId) === form.organizationId);
                    return currentSelection ? (
                      <option value={String(currentSelection.organizationId)}>
                        {currentSelection.label} / ID {currentSelection.organizationId}
                      </option>
                    ) : null;
                  })()
                : null}
            </select>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {form.organizationScope === "hospital"
              ? "病院は registry 上の `hospitals.id` から選択します。"
              : form.organizationScope === "ems"
                ? "EMS は registry 上の `emergency_teams.id` から選択します。"
                : "admin / shared も operating unit として registry 候補から選択します。"}
          </p>
          <p className="mt-1 text-xs text-slate-500">表示候補: {filteredScopedOptions.length} 件 / 全 {scopedOptions.length} 件</p>
          {fieldErrors.organizationId ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.organizationId}</p> : null}
        </label>

        <label className="block">
          <span className="ds-field-label">結果</span>
          <select value={form.status} onChange={(event) => update("status", event.target.value as AdminComplianceRunStatus)} className="ds-field">
            <option value="completed">完了</option>
            <option value="needs_followup">要フォローアップ</option>
          </select>
          {fieldErrors.status ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.status}</p> : null}
        </label>

        <label className="block">
          <span className="ds-field-label">実施日時</span>
          <input
            type="datetime-local"
            value={form.completedAt}
            onChange={(event) => update("completedAt", event.target.value)}
            className="ds-field"
          />
          {fieldErrors.completedAt ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.completedAt}</p> : null}
        </label>

        <label className="block">
          <span className="ds-field-label">次回期限</span>
          <input type="date" value={form.nextDueAt} onChange={(event) => update("nextDueAt", event.target.value)} className="ds-field" />
          <p className="mt-1 text-xs text-slate-500">未入力なら推奨 cadence から自動計算します。</p>
          {fieldErrors.nextDueAt ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.nextDueAt}</p> : null}
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="ds-field-label">訂正元レコード</span>
          <select value={form.supersedesRunId} onChange={(event) => update("supersedesRunId", event.target.value)} className="ds-field">
            <option value="">訂正ではない</option>
            {recentRuns.map((item) => (
              <option key={item.id} value={String(item.id)}>
                #{item.id} / {item.operationLabel} / {item.completedAt}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">追記のみを正本にするため、訂正は元レコードを参照して追加します。</p>
        </label>

        <label className="block">
          <span className="ds-field-label">証跡種別</span>
          <select value={form.evidenceType} onChange={(event) => update("evidenceType", event.target.value as AdminComplianceEvidenceType)} className="ds-field">
            {evidenceTypeOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="ds-field-label">証跡参照先</span>
          <input
            type="text"
            value={form.evidenceLocation}
            onChange={(event) => update("evidenceLocation", event.target.value)}
            placeholder="例: SharePoint / Ops folder / URL"
            className="ds-field"
          />
          {fieldErrors.evidenceLocation ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.evidenceLocation}</p> : null}
        </label>

        <label className="block">
          <span className="ds-field-label">証跡参照番号</span>
          <input
            type="text"
            value={form.evidenceReference}
            onChange={(event) => update("evidenceReference", event.target.value)}
            placeholder="例: ticket-123 / 文書番号 / 版番号"
            className="ds-field"
          />
          {fieldErrors.evidenceReference ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.evidenceReference}</p> : null}
        </label>
      </div>

      <label className="block">
        <span className="ds-field-label">証跡補足</span>
        <textarea
          value={form.evidenceNotes}
          onChange={(event) => update("evidenceNotes", event.target.value)}
          placeholder="保管先の補足、参照方法、アクセス注意点など"
          className="min-h-24 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
        />
        {fieldErrors.evidenceNotes ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.evidenceNotes}</p> : null}
      </label>

      <label className="block">
        <span className="ds-field-label">メモ</span>
        <textarea
          value={form.notes}
          onChange={(event) => update("notes", event.target.value)}
          placeholder="未解決事項、確認したログ、次回までの宿題など"
          className="min-h-32 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
        />
        {fieldErrors.notes ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.notes}</p> : null}
      </label>

      <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/70 px-4 py-4 text-sm leading-6 text-slate-600">
        保持期間は `5年` です。登録後は即削除せず、先に `archived_at` で退避できる前提にしています。
      </div>

      {message ? (
        <p
          className={`rounded-2xl px-4 py-3 text-sm ${
            Object.keys(fieldErrors).length > 0 ? "border border-rose-200 bg-rose-50 text-rose-700" : "border border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "保存中..." : "記録を追加"}
      </button>
    </form>
  );
}
