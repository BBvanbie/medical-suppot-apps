import type { ComponentType } from "react";
import {
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  HomeIcon,
  InformationCircleIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
} from "@heroicons/react/24/solid";

export type HospitalNavItem = {
  label: string;
  href: string;
  menuKey: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

export const hospitalNavItems: HospitalNavItem[] = [
  { label: "\u30db\u30fc\u30e0", href: "/hospitals", menuKey: "hospital-home", icon: HomeIcon },
  {
    label: "\u9078\u5b9a\u4f9d\u983c\u4e00\u89a7",
    href: "/hospitals/requests",
    menuKey: "hospitals-requests",
    icon: ClipboardDocumentListIcon,
  },
  {
    label: "\u53d7\u5165\u60a3\u8005\u4e00\u89a7",
    href: "/hospitals/patients",
    menuKey: "hospitals-patients",
    icon: UsersIcon,
  },
  {
    label: "\u76f8\u8ac7\u4e8b\u6848\u4e00\u89a7",
    href: "/hospitals/consults",
    menuKey: "hospitals-consults",
    icon: InformationCircleIcon,
  },
  {
    label: "\u642c\u9001\u8f9e\u9000\u60a3\u8005\u4e00\u89a7",
    href: "/hospitals/declined",
    menuKey: "hospitals-declined",
    icon: ExclamationTriangleIcon,
  },
  {
    label: "\u8a3a\u7642\u60c5\u5831\u5165\u529b",
    href: "/hospitals/medical-info",
    menuKey: "hospitals-medical-info",
    icon: InformationCircleIcon,
  },
  { label: "\u7d71\u8a08", href: "/hospitals/stats", menuKey: "hospitals-stats", icon: ChartBarIcon },
  { label: "\u8a2d\u5b9a", href: "/hp/settings", menuKey: "settings", icon: Cog6ToothIcon },
];
