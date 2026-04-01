"use client";

import { useMemo, useState } from "react";

import { adminActionButtonClass } from "@/components/admin/AdminWorkbench";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { SettingSaveStatus } from "@/components/settings/SettingSaveStatus";

export type AdminEntityFieldOption = {
  label: string;
  value: string;
};

export type AdminEntityField = {
  name: string;
  label: string;
  type: "text" | "number" | "tel" | "select";
  placeholder?: string;
  required?: boolean;
  options?: AdminEntityFieldOption[];
};

type AdminEntityCreateFormProps = {
  title: string;
  description: string;
  fields: AdminEntityField[];
  confirmTitle: string;
  confirmDescription: string;
  endpoint: string;
  successMessage: string;
  onCreated: (row: Record<string, string | number | boolean | null>) => void;
};

type ApiErrorResponse = {
  message?: string;
  fieldErrors?: Record<string, string>;
};

function buildInitialValues(fields: AdminEntityField[]) {
  return fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.name] = field.type === "select" ? field.options?.[0]?.value ?? "" : "";
    return acc;
  }, {});
}

export function AdminEntityCreateForm({
  title,
  description,
  fields,
  confirmTitle,
  confirmDescription,
  endpoint,
  successMessage,
  onCreated,
}: AdminEntityCreateFormProps) {
  const [formValues, setFormValues] = useState<Record<string, string>>(() => buildInitialValues(fields));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState<string | undefined>();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const requiredMissing = useMemo(
    () => fields.some((field) => field.required && !String(formValues[field.name] ?? "").trim()),
    [fields, formValues],
  );

  const handleChange = (name: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
    if (status !== "idle") {
      setStatus("idle");
      setStatusMessage(undefined);
    }
  };

  const validateBeforeConfirm = () => {
    const errors: Record<string, string> = {};
    for (const field of fields) {
      if (field.required && !String(formValues[field.name] ?? "").trim()) {
        errors[field.name] = "この項目は必須です。";
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormValues(buildInitialValues(fields));
    setFieldErrors({});
  };

  const handleSubmit = async () => {
    setStatus("saving");
    setStatusMessage(undefined);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValues),
      });
      const data = (await res.json().catch(() => ({}))) as ApiErrorResponse & {
        row?: Record<string, string | number | boolean | null>;
      };

      if (!res.ok || !data.row) {
        setStatus("error");
        setStatusMessage(data.message ?? "追加に失敗しました。");
        setFieldErrors(data.fieldErrors ?? {});
        return;
      }

      onCreated(data.row);
      resetForm();
      setStatus("saved");
      setStatusMessage(successMessage);
      setConfirmOpen(false);
    } catch {
      setStatus("error");
      setStatusMessage("通信に失敗しました。");
    }
  };

  return (
    <>
      <div className="rounded-[28px] border border-slate-200/90 bg-white px-5 py-5 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] text-orange-600">CREATE FORM</p>
            <h3 className="mt-1 text-[18px] font-bold tracking-[-0.02em] text-slate-950">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
          </div>
          <SettingSaveStatus status={status} message={statusMessage} />
        </div>

        <div className="mt-5 grid gap-4">
          {fields.map((field) => (
            <label key={field.name} className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                {field.label}
                {field.required ? <span className="ml-1 text-rose-500">*</span> : null}
              </span>
              {field.type === "select" ? (
                <select
                  value={formValues[field.name] ?? ""}
                  onChange={(event) => handleChange(field.name, event.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-300"
                >
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  value={formValues[field.name] ?? ""}
                  onChange={(event) => handleChange(field.name, event.target.value)}
                  placeholder={field.placeholder}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-300"
                />
              )}
              {fieldErrors[field.name] ? <span className="mt-1 block text-xs font-medium text-rose-600">{fieldErrors[field.name]}</span> : null}
            </label>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => validateBeforeConfirm() && setConfirmOpen(true)}
            disabled={requiredMissing || status === "saving"}
            className={adminActionButtonClass("primary")}
          >
            追加する
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel="追加する"
        busy={status === "saving"}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void handleSubmit()}
      />
    </>
  );
}
