"use client";

import { XMarkIcon } from "@heroicons/react/24/solid";

import { LoadingButton } from "@/components/shared/loading";
import { RequestStatusBadge } from "@/components/shared/RequestStatusBadge";
import { formatDateTimeMdHm } from "@/lib/dateTimeFormat";

type ConsultActor = "A" | "HP";

type ConsultMessage = {
  id: number | string;
  actor: ConsultActor;
  actedAt: string;
  note: string;
  localStatus?: "未送信" | "送信待ち" | "競合" | "送信失敗";
};

type ConsultTemplateOption = {
  value: string;
  label: string;
};

type ConsultChatModalProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  status?: string | null;
  messages: ConsultMessage[];
  loading?: boolean;
  error?: string;
  note: string;
  noteLabel: string;
  notePlaceholder: string;
  sendLabel?: string;
  sendButtonTestId?: string;
  sending?: boolean;
  canSend: boolean;
  onClose: () => void;
  onChangeNote: (value: string) => void;
  onSend: () => void;
  topActions?: React.ReactNode;
  confirmSection?: React.ReactNode;
  templateLabel?: string;
  templateValue?: string;
  templateOptions?: ConsultTemplateOption[];
  onTemplateChange?: (value: string) => void;
};

function localStatusTone(localStatus?: ConsultMessage["localStatus"]) {
  switch (localStatus) {
    case "競合":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "送信失敗":
      return "border-rose-200 bg-rose-50 text-rose-800";
    case "未送信":
    case "送信待ち":
      return "border-sky-200 bg-sky-50 text-sky-800";
    default:
      return "";
  }
}

export function ConsultChatModal({
  open,
  title,
  subtitle,
  status,
  messages,
  loading = false,
  error = "",
  note,
  noteLabel,
  notePlaceholder,
  sendLabel = "送信",
  sendButtonTestId,
  sending = false,
  canSend,
  onClose,
  onChangeNote,
  onSend,
  topActions,
  confirmSection,
  templateLabel = "テンプレート",
  templateValue = "",
  templateOptions = [],
  onTemplateChange,
}: ConsultChatModalProps) {
  if (!open) return null;

  return (
    <div className="modal-shell-pad ds-dialog-backdrop fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="ds-dialog-surface flex ds-h-dialog-md w-full max-w-3xl flex-col overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ds-panel-header flex items-center justify-between px-5 py-3">
          <div>
            <p className="text-xs font-semibold uppercase ds-track-eyebrow-wide text-blue-600">CONSULT CHAT</p>
            <h3 className="mt-1 text-base font-bold text-slate-900">{title}</h3>
            {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
            {status ? (
              <div className="mt-2">
                <RequestStatusBadge status={status} />
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            aria-label="閉じる"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-slate-50 px-4 py-4">
          {loading ? <p className="text-sm text-slate-500">読み込み中...</p> : null}
          {!loading && messages.length === 0 ? <p className="text-sm text-slate-500">相談履歴はまだありません。</p> : null}
          {!loading ? (
            <div className="space-y-3">
              {messages.map((message) => {
                const fromA = message.actor === "A";
                return (
                  <div key={message.id} className={`flex ${fromA ? "justify-end" : "justify-start"}`}>
                    <div
                      className={[
                        "ds-max-w-chat-compact rounded-2xl px-4 py-2 text-sm shadow-sm",
                        fromA
                          ? message.localStatus
                            ? "border border-sky-200 bg-sky-50 text-sky-900"
                            : "bg-blue-600 text-white"
                          : "bg-white text-slate-800",
                      ].join(" ")}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`ds-text-xs-compact font-semibold ${fromA && !message.localStatus ? "text-blue-100" : "text-slate-500"}`}>
                          {fromA ? "A側" : "HP側"} / {formatDateTimeMdHm(message.actedAt)}
                        </p>
                        {message.localStatus ? (
                          <span className={["inline-flex rounded-full border px-2 py-0.5 ds-text-2xs font-semibold", localStatusTone(message.localStatus)].join(" ")}>
                            {message.localStatus}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap break-words">{message.note}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="ds-panel-header border-t-0 bg-white px-4 py-3">
          {topActions ? <div className="mb-3 flex flex-wrap items-center justify-end gap-2">{topActions}</div> : null}
          {confirmSection ? <div className="mb-3">{confirmSection}</div> : null}

          <div className="space-y-3">
            {templateOptions.length > 0 && onTemplateChange ? (
              <label className="block">
                <span className="ds-field-label">{templateLabel}</span>
                <select
                  value={templateValue}
                  onChange={(event) => onTemplateChange(event.target.value)}
                  className="ds-field mt-1"
                >
                  {templateOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="block">
              <span className="ds-field-label">{noteLabel}</span>
              <textarea
                value={note}
                onChange={(event) => onChangeNote(event.target.value)}
                rows={3}
                className="ds-field mt-1 py-2"
                placeholder={notePlaceholder}
              />
            </label>
          </div>

          {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
          <div className="mt-3 flex justify-end">
            <LoadingButton
              data-testid={sendButtonTestId}
              loading={sending}
              loadingLabel="送信中..."
              disabled={!canSend}
              onClick={onSend}
            >
              {sendLabel}
            </LoadingButton>
          </div>
        </div>
      </div>
    </div>
  );
}
