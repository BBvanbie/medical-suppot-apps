import {
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  EyeIcon,
  NoSymbolIcon,
  PaperAirplaneIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";

type RequestStatusBadgeProps = {
  status?: string;
  ariaLabelPrefix?: string;
};

type CanonicalStatus =
  | "SELECTION_PENDING"
  | "SELECTION_IN_PROGRESS"
  | "DESTINATION_DECIDED"
  | "UNREAD"
  | "READ"
  | "NEGOTIATING"
  | "ACCEPTABLE"
  | "NOT_ACCEPTABLE"
  | "TRANSPORT_DECIDED"
  | "TRANSPORT_DECLINED";

type BadgeVisual = {
  label: string;
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  className: string;
};

const STATUS_LABELS: Record<CanonicalStatus, string> = {
  SELECTION_PENDING: "選定前",
  SELECTION_IN_PROGRESS: "選定中",
  DESTINATION_DECIDED: "搬送先決定",
  UNREAD: "未読",
  READ: "既読",
  NEGOTIATING: "要相談",
  ACCEPTABLE: "受入可能",
  NOT_ACCEPTABLE: "受入不可",
  TRANSPORT_DECIDED: "搬送決定",
  TRANSPORT_DECLINED: "搬送辞退",
};

function normalizeStatus(status?: string): CanonicalStatus {
  const value = (status ?? "").trim();
  const map: Record<string, CanonicalStatus> = {
    SELECTION_PENDING: "SELECTION_PENDING",
    SELECTION_IN_PROGRESS: "SELECTION_IN_PROGRESS",
    DESTINATION_DECIDED: "DESTINATION_DECIDED",
    UNREAD: "UNREAD",
    READ: "READ",
    NEGOTIATING: "NEGOTIATING",
    ACCEPTABLE: "ACCEPTABLE",
    NOT_ACCEPTABLE: "NOT_ACCEPTABLE",
    TRANSPORT_DECIDED: "TRANSPORT_DECIDED",
    TRANSPORT_DECLINED: "TRANSPORT_DECLINED",
    選定前: "SELECTION_PENDING",
    選定中: "SELECTION_IN_PROGRESS",
    搬送先決定: "DESTINATION_DECIDED",
    未読: "UNREAD",
    既読: "READ",
    要相談: "NEGOTIATING",
    受入可能: "ACCEPTABLE",
    受入不可: "NOT_ACCEPTABLE",
    搬送決定: "TRANSPORT_DECIDED",
    搬送辞退: "TRANSPORT_DECLINED",
    辞退: "TRANSPORT_DECLINED",
  };
  return map[value] ?? "UNREAD";
}

function getVisual(status: CanonicalStatus): BadgeVisual {
  if (status === "SELECTION_PENDING") {
    return {
      label: STATUS_LABELS[status],
      Icon: EyeIcon,
      className: "border-slate-300 border-l-4 border-l-slate-400 bg-slate-50 text-slate-800",
    };
  }
  if (status === "SELECTION_IN_PROGRESS") {
    return {
      label: STATUS_LABELS[status],
      Icon: ChatBubbleLeftRightIcon,
      className: "border-blue-200 border-l-4 border-l-blue-500 bg-blue-50 text-blue-900",
    };
  }
  if (status === "DESTINATION_DECIDED") {
    return {
      label: STATUS_LABELS[status],
      Icon: PaperAirplaneIcon,
      className: "border-teal-200 border-l-4 border-l-teal-500 bg-teal-50 text-teal-900",
    };
  }
  if (status === "UNREAD") {
    return {
      label: STATUS_LABELS[status],
      Icon: EyeIcon,
      className: "border-amber-200 border-l-4 border-l-amber-500 bg-amber-50 text-amber-900",
    };
  }
  if (status === "READ") {
    return {
      label: STATUS_LABELS[status],
      Icon: EyeIcon,
      className: "border-slate-300 border-l-4 border-l-slate-500 bg-slate-50 text-slate-800",
    };
  }
  if (status === "NEGOTIATING") {
    return {
      label: STATUS_LABELS[status],
      Icon: ChatBubbleLeftRightIcon,
      className: "border-blue-200 border-l-4 border-l-blue-500 bg-blue-50 text-blue-900",
    };
  }
  if (status === "ACCEPTABLE") {
    return {
      label: STATUS_LABELS[status],
      Icon: CheckCircleIcon,
      className: "border-emerald-200 border-l-4 border-l-emerald-500 bg-emerald-50 text-emerald-900",
    };
  }
  if (status === "NOT_ACCEPTABLE") {
    return {
      label: STATUS_LABELS[status],
      Icon: NoSymbolIcon,
      className: "border-rose-200 border-l-4 border-l-rose-500 bg-rose-50 text-rose-900",
    };
  }
  if (status === "TRANSPORT_DECIDED") {
    return {
      label: STATUS_LABELS[status],
      Icon: PaperAirplaneIcon,
      className: "border-teal-200 border-l-4 border-l-teal-500 bg-teal-50 text-teal-900",
    };
  }
  return {
    label: STATUS_LABELS[status],
    Icon: XCircleIcon,
    className: "border-zinc-300 border-l-4 border-l-zinc-500 bg-zinc-100 text-zinc-900",
  };
}

export function RequestStatusBadge({ status, ariaLabelPrefix = "ステータス" }: RequestStatusBadgeProps) {
  const normalized = normalizeStatus(status);
  const visual = getVisual(normalized);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold ${visual.className}`}
      aria-label={`${ariaLabelPrefix}: ${visual.label}`}
    >
      <visual.Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span>{visual.label}</span>
    </span>
  );
}
