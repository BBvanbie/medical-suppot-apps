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
  | "CONSULT_CASE"
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
  toneClassName: string;
};

const STATUS_LABELS: Record<CanonicalStatus, string> = {
  SELECTION_PENDING: "選定前",
  SELECTION_IN_PROGRESS: "選定中",
  CONSULT_CASE: "相談事案",
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
    CONSULT_CASE: "CONSULT_CASE",
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
    相談事案: "CONSULT_CASE",
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
      toneClassName: "ds-status-badge--neutral",
    };
  }
  if (status === "SELECTION_IN_PROGRESS") {
    return {
      label: STATUS_LABELS[status],
      Icon: ChatBubbleLeftRightIcon,
      toneClassName: "ds-status-badge--info",
    };
  }
  if (status === "CONSULT_CASE") {
    return {
      label: STATUS_LABELS[status],
      Icon: ChatBubbleLeftRightIcon,
      toneClassName: "ds-status-badge--warning",
    };
  }
  if (status === "DESTINATION_DECIDED") {
    return {
      label: STATUS_LABELS[status],
      Icon: PaperAirplaneIcon,
      toneClassName: "ds-status-badge--success",
    };
  }
  if (status === "UNREAD") {
    return {
      label: STATUS_LABELS[status],
      Icon: EyeIcon,
      toneClassName: "ds-status-badge--warning",
    };
  }
  if (status === "READ") {
    return {
      label: STATUS_LABELS[status],
      Icon: EyeIcon,
      toneClassName: "ds-status-badge--neutral",
    };
  }
  if (status === "NEGOTIATING") {
    return {
      label: STATUS_LABELS[status],
      Icon: ChatBubbleLeftRightIcon,
      toneClassName: "ds-status-badge--warning",
    };
  }
  if (status === "ACCEPTABLE") {
    return {
      label: STATUS_LABELS[status],
      Icon: CheckCircleIcon,
      toneClassName: "ds-status-badge--success",
    };
  }
  if (status === "NOT_ACCEPTABLE") {
    return {
      label: STATUS_LABELS[status],
      Icon: NoSymbolIcon,
      toneClassName: "ds-status-badge--danger",
    };
  }
  if (status === "TRANSPORT_DECIDED") {
    return {
      label: STATUS_LABELS[status],
      Icon: PaperAirplaneIcon,
      toneClassName: "ds-status-badge--success",
    };
  }
  return {
    label: STATUS_LABELS[status],
    Icon: XCircleIcon,
    toneClassName: "ds-status-badge--danger",
  };
}

export function RequestStatusBadge({ status, ariaLabelPrefix = "ステータス" }: RequestStatusBadgeProps) {
  const normalized = normalizeStatus(status);
  const visual = getVisual(normalized);
  return (
    <span
      className={`ds-status-badge ${visual.toneClassName}`}
      aria-label={`${ariaLabelPrefix}: ${visual.label}`}
    >
      <visual.Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span>{visual.label}</span>
    </span>
  );
}
