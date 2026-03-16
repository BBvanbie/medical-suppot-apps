"use client";

import { XMarkIcon } from "@heroicons/react/24/solid";
import { LoadingButton } from "@/components/shared/loading";
import { RequestStatusBadge } from "@/components/shared/RequestStatusBadge";
import { formatDateTimeMdHm } from "@/lib/dateTimeFormat";

type ConsultActor = "A" | "HP";

type ConsultMessage = {
  id: number;
  actor: ConsultActor;
  actedAt: string;
  note: string;
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
    <div className="modal-shell-pad fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45" onClick={onClose}>
      <div
        className="flex h-[78vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">CONSULT CHAT</p>
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
                    <div className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm shadow-sm ${fromA ? "bg-blue-600 text-white" : "bg-white text-slate-800"}`}>
                      <p className={`text-[11px] font-semibold ${fromA ? "text-blue-100" : "text-slate-500"}`}>
                        {fromA ? "A側" : "HP側"} / {formatDateTimeMdHm(message.actedAt)}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap break-words">{message.note}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="border-t border-slate-200 bg-white px-4 py-3">
          {topActions ? <div className="mb-3 flex flex-wrap items-center justify-end gap-2">{topActions}</div> : null}
          {confirmSection ? <div className="mb-3">{confirmSection}</div> : null}

          <div className="space-y-3">
            {templateOptions.length > 0 && onTemplateChange ? (
              <label className="block">
                <span className="text-xs font-semibold text-slate-500">{templateLabel}</span>
                <select
                  value={templateValue}
                  onChange={(event) => onTemplateChange(event.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
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
              <span className="text-xs font-semibold text-slate-500">{noteLabel}</span>
              <textarea
                value={note}
                onChange={(event) => onChangeNote(event.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
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




