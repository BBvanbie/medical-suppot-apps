"use client";

import { useMemo, useState } from "react";

import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { SettingActionButton } from "@/components/settings/SettingActionButton";
import { SettingSaveStatus } from "@/components/settings/SettingSaveStatus";
import type { HospitalOperationsSettings } from "@/lib/hospitalSettingsValidation";

type HospitalOperationsSettingsFormProps = {
  initialValues: HospitalOperationsSettings;
};

type ApiErrorResponse = {
  message?: string;
  fieldErrors?: Record<string, string>;
  consultTemplate?: string;
  declineTemplate?: string;
};

export function HospitalOperationsSettingsForm({ initialValues }: HospitalOperationsSettingsFormProps) {
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | undefined>();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const hasChanges = useMemo(
    () => values.consultTemplate !== initialValues.consultTemplate || values.declineTemplate !== initialValues.declineTemplate,
    [initialValues.consultTemplate, initialValues.declineTemplate, values.consultTemplate, values.declineTemplate],
  );

  const save = async () => {
    if (!hasChanges) {
      setStatus("idle");
      setMessage("変更はありません。");
      setConfirmOpen(false);
      return;
    }

    setStatus("saving");
    setMessage(undefined);
    try {
      const res = await fetch("/api/settings/hospital/operations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = (await res.json().catch(() => ({}))) as ApiErrorResponse;
      if (!res.ok) {
        setStatus("error");
        setMessage(data.message ?? "保存に失敗しました。");
        setFieldErrors(data.fieldErrors ?? {});
        return;
      }

      setValues({
        consultTemplate: data.consultTemplate ?? values.consultTemplate,
        declineTemplate: data.declineTemplate ?? values.declineTemplate,
      });
      setFieldErrors({});
      setStatus("saved");
      setMessage("保存しました。");
      setConfirmOpen(false);
    } catch {
      setStatus("error");
      setMessage("通信に失敗しました。");
    }
  };

  return (
    <>
      <div>
        <div className="mb-4 flex justify-end">
          <SettingSaveStatus status={status} message={message} />
        </div>
        <div className="grid gap-4">
          <label className="block">
            <span className="ds-field-label">要相談テンプレート</span>
            <textarea
              rows={4}
              value={values.consultTemplate}
              onChange={(event) => {
                setValues((prev) => ({ ...prev, consultTemplate: event.target.value }));
                setStatus("idle");
                setMessage(undefined);
              }}
              className="ds-field py-3"
            />
            {fieldErrors.consultTemplate ? <span className="mt-1 block text-xs font-medium text-rose-600">{fieldErrors.consultTemplate}</span> : null}
          </label>
          <label className="block">
            <span className="ds-field-label">受入不可テンプレート</span>
            <textarea
              rows={4}
              value={values.declineTemplate}
              onChange={(event) => {
                setValues((prev) => ({ ...prev, declineTemplate: event.target.value }));
                setStatus("idle");
                setMessage(undefined);
              }}
              className="ds-field py-3"
            />
            {fieldErrors.declineTemplate ? <span className="mt-1 block text-xs font-medium text-rose-600">{fieldErrors.declineTemplate}</span> : null}
          </label>
        </div>
        <div className="mt-4">
          <SettingActionButton onClick={() => setConfirmOpen(true)}>確認して保存</SettingActionButton>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="運用テンプレートを更新しますか"
        description="要相談テンプレートと受入不可テンプレートを更新します。"
        confirmLabel="保存する"
        busy={status === "saving"}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
      />
    </>
  );
}
