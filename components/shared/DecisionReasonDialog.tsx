"use client";

import type { DecisionReasonCode, DecisionReasonOption } from "@/lib/decisionReasons";
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
      className="modal-shell-pad fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45"
      onClick={() => {
        if (!sending) onClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">REASON</p>
        <h3 className="mt-2 text-lg font-bold text-slate-900">{title}</h3>
        {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}

        <label className="mt-4 block">
          <span className="text-xs font-semibold text-slate-500">理由</span>
          <select
            value={value}
            onChange={(event) => onChangeValue(event.target.value as TCode | "")}
            className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
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
            <span className="text-xs font-semibold text-slate-500">{textLabel}</span>
            <textarea
              value={textValue}
              onChange={(event) => onChangeText(event.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
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
            className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            キャンセル
          </button>
          <LoadingButton
            loading={sending}
            loadingLabel="送信中..."
            disabled={!canConfirm}
            onClick={onConfirm}
            variant={tone === "danger" ? "danger" : "primary"}
            className={tone === "danger" ? "" : "bg-slate-900 hover:bg-slate-700 disabled:bg-slate-300"}
          >
            {confirmLabel}
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}
