import type { ComponentType } from "react";
import { ClipboardDocumentListIcon, Cog6ToothIcon, PlusCircleIcon } from "@heroicons/react/24/solid";

export type DispatchNavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

export const dispatchNavItems: DispatchNavItem[] = [
  { label: "新規起票", href: "/dispatch/new", icon: PlusCircleIcon },
  { label: "指令一覧", href: "/dispatch/cases", icon: ClipboardDocumentListIcon },
  { label: "設定", href: "/dispatch/settings", icon: Cog6ToothIcon },
];
