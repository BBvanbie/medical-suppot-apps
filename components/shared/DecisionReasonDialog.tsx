"use client";

import type { DecisionReasonCode, DecisionReasonOption } from "@/lib/decisionReasons";
import { BUTTON_BASE_CLASS, BUTTON_VARIANT_CLASS } from "@/components/shared/buttonStyles";
import { LoadingButton } from "@/components/shared/loading";

type DecisionReasonDialogProps<TCode extends DecisionReasonCode = DecisionReasonCode> = {
  open: boolean;
  title: string;
  description?: string;
  options: DecisionReasonOption<TCode>[];
  value: TCode | "";
  textValue: string;
  error?: string;
  sending?: boolean;
  confirmLabel?: string;
  tone?: "default" | "danger";
  onClose: () => void;
  onChangeValue: (value: TCode | "") => void;
  onChangeText: (value: string) => void;
  onConfirm: () => void;
};

export function DecisionReasonDialog<TCode extends DecisionReasonCode = DecisionReasonCode>({
  open,
  title,
  description,
  options,
  value,
  textValue,
  error = "",
  sending = false,
  confirmLabel = "送信",
  tone = "default",
  onClose,
  onChangeValue,
  onChangeText,
  onConfirm,
}: DecisionReasonDialogProps<TCode>) {
  if (!open) return null;

  const selectedOption = options.find((option) => option.code === value) ?? null;
  const needsText = Boolean(selectedOption?.requiresText);
  const textLabel = selectedOption?.textLabel ?? "詳細";
  const textPlaceholder = selectedOption?.textPlaceholder ?? "詳細を入力してください";
  const canConfirm = Boolean(value) && (!needsText || textValue.trim().length > 0);

  return (
    <div
      className="modal-shell-pad ds-dialog-backdrop fixed inset-0 ds-z-floating flex items-center justify-center"
      onClick={() => {
        if (!sending) onClose();
      }}
    >
      <div
        className="ds-dialog-surface w-full max-w-lg p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-xs font-semibold uppercase ds-track-eyebrow-wide text-slate-500">REASON</p>
        <h3 className="mt-2 text-lg font-bold text-slate-900">{title}</h3>
        {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}

        <label className="mt-4 block">
          <span className="ds-field-label">理由</span>
          <select
            value={value}
            onChange={(event) => onChangeValue(event.target.value as TCode | "")}
            className="ds-field mt-1"
          >
            <option value="">選択してください</option>
            {options.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {needsText ? (
          <label className="mt-4 block">
            <span className="ds-field-label">{textLabel}</span>
            <textarea
              value={textValue}
              onChange={(event) => onChangeText(event.target.value)}
              rows={4}
              className="ds-field mt-1 py-2"
              placeholder={textPlaceholder}
            />
          </label>
        ) : null}

        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={sending}
            onClick={onClose}
            className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASS.secondary}`}
          >
            キャンセル
          </button>
          <LoadingButton
            loading={sending}
            loadingLabel="送信中..."
            disabled={!canConfirm}
            onClick={onConfirm}
            variant={tone === "danger" ? "danger" : "primary"}
          >
            {confirmLabel}
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}
