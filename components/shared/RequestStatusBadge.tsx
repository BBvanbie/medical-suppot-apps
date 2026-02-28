import {
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  NoSymbolIcon,
  PaperAirplaneIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";

type RequestStatusBadgeProps = {
  status?: string;
  ariaLabelPrefix?: string;
};

type BadgeVisual = {
  label: string;
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  className: string;
};

function normalizeStatus(status?: string): string {
  const value = (status ?? "").trim();
  const map: Record<string, string> = {
    UNREAD: "未読",
    READ: "既読",
    NEGOTIATING: "要相談",
    ACCEPTABLE: "受入可能",
    NOT_ACCEPTABLE: "受入不可",
    TRANSPORT_DECIDED: "搬送決定",
    TRANSPORT_DECLINED: "辞退",
  };
  return (map[value] ?? value) || "未読";
}

function getVisual(label: string): BadgeVisual {
  if (label === "未読") {
    return {
      label,
      Icon: ExclamationTriangleIcon,
      className: "border-amber-200 border-l-4 border-l-amber-500 bg-amber-50 text-amber-900",
    };
  }
  if (label === "既読") {
    return {
      label,
      Icon: EyeIcon,
      className: "border-slate-300 border-l-4 border-l-slate-500 bg-slate-50 text-slate-800",
    };
  }
  if (label === "要相談") {
    return {
      label,
      Icon: ChatBubbleLeftRightIcon,
      className: "border-blue-200 border-l-4 border-l-blue-500 bg-blue-50 text-blue-900",
    };
  }
  if (label === "受入可能") {
    return {
      label,
      Icon: CheckCircleIcon,
      className: "border-emerald-200 border-l-4 border-l-emerald-500 bg-emerald-50 text-emerald-900",
    };
  }
  if (label === "受入不可") {
    return {
      label,
      Icon: NoSymbolIcon,
      className: "border-rose-200 border-l-4 border-l-rose-500 bg-rose-50 text-rose-900",
    };
  }
  if (label === "搬送決定") {
    return {
      label,
      Icon: PaperAirplaneIcon,
      className: "border-teal-200 border-l-4 border-l-teal-500 bg-teal-50 text-teal-900",
    };
  }
  if (label === "辞退") {
    return {
      label,
      Icon: XCircleIcon,
      className: "border-zinc-300 border-l-4 border-l-zinc-500 bg-zinc-100 text-zinc-900",
    };
  }
  return {
    label,
    Icon: EyeIcon,
    className: "border-slate-300 border-l-4 border-l-slate-500 bg-slate-50 text-slate-800",
  };
}

export function RequestStatusBadge({ status, ariaLabelPrefix = "ステータス" }: RequestStatusBadgeProps) {
  const label = normalizeStatus(status);
  const visual = getVisual(label);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold ${visual.className}`}
      aria-label={`${ariaLabelPrefix}: ${label}`}
    >
      <visual.Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span>{label}</span>
    </span>
  );
}
