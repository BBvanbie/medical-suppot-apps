import type { ComponentType } from "react";
import { ClipboardDocumentCheckIcon, ClipboardDocumentListIcon, Cog6ToothIcon, PlusCircleIcon, RectangleStackIcon } from "@heroicons/react/24/solid";

export type DispatchNavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

export const dispatchNavItems: DispatchNavItem[] = [
  { label: "新規起票", href: "/dispatch/new", icon: PlusCircleIcon },
  { label: "指令一覧", href: "/dispatch/cases", icon: ClipboardDocumentListIcon },
  { label: "事案一覧", href: "/dispatch/active-cases", icon: RectangleStackIcon },
  { label: "選定依頼一覧", href: "/dispatch/selection-requests", icon: ClipboardDocumentCheckIcon },
  { label: "設定", href: "/dispatch/settings", icon: Cog6ToothIcon },
];
