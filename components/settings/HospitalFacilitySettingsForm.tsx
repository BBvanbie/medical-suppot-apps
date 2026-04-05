"use client";

import { useState } from "react";

import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { SettingActionButton } from "@/components/settings/SettingActionButton";
import { SettingSaveStatus } from "@/components/settings/SettingSaveStatus";
import type { HospitalFacilityEditableSettings } from "@/lib/hospitalSettingsValidation";

type HospitalFacilitySettingsFormProps = {
  initialValues: HospitalFacilityEditableSettings;
};

type ApiErrorResponse = {
  message?: string;
  fieldErrors?: Record<string, string>;
  displayContact?: string;
  facilityNote?: string;
};

export function HospitalFacilitySettingsForm({ initialValues }: HospitalFacilitySettingsFormProps) {
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | undefined>();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const save = async () => {
    setStatus("saving");
    setMessage(undefined);
    try {
      const res = await fetch("/api/settings/hospital/facility", {
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
        displayContact: data.displayContact ?? values.displayContact,
        facilityNote: data.facilityNote ?? values.facilityNote,
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
            <span className="ds-field-label">表示用連絡先</span>
            <input
              value={values.displayContact}
              onChange={(event) => {
                setValues((prev) => ({ ...prev, displayContact: event.target.value }));
                setStatus("idle");
                setMessage(undefined);
              }}
              className="ds-field"
            />
            {fieldErrors.displayContact ? <span className="mt-1 block text-xs font-medium text-rose-600">{fieldErrors.displayContact}</span> : null}
          </label>
          <label className="block">
            <span className="ds-field-label">利用者向け補足文</span>
            <textarea
              rows={4}
              value={values.facilityNote}
              onChange={(event) => {
                setValues((prev) => ({ ...prev, facilityNote: event.target.value }));
                setStatus("idle");
                setMessage(undefined);
              }}
              className="ds-field py-3"
            />
            {fieldErrors.facilityNote ? <span className="mt-1 block text-xs font-medium text-rose-600">{fieldErrors.facilityNote}</span> : null}
          </label>
        </div>
        <div className="mt-4">
          <SettingActionButton onClick={() => setConfirmOpen(true)}>確認して保存</SettingActionButton>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="施設情報を更新しますか"
        description="表示用連絡先と利用者向け補足文を更新します。保存すると病院設定に反映されます。"
        confirmLabel="保存する"
        busy={status === "saving"}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
      />
    </>
  );
}
