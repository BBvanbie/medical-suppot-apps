export const ADMIN_COMPLIANCE_OPERATIONS = [
  {
    key: "id_inventory",
    label: "ID 棚卸",
    cadenceLabel: "四半期ごと",
    recommendedIntervalDays: 90,
    summary: "不要 ID の無効化、本人確認付き再発行、棚卸記録を確認します。",
    runbookHref: "/admin/settings/support#security",
  },
  {
    key: "audit_review",
    label: "監査レビュー",
    cadenceLabel: "月次",
    recommendedIntervalDays: 30,
    summary: "監査ログ、security signal、逸脱是正の実施状況を確認します。",
    runbookHref: "/admin/settings/support#security",
  },
  {
    key: "restore_drill",
    label: "Restore Drill",
    cadenceLabel: "月次",
    recommendedIntervalDays: 30,
    summary: "復元手順の読み合わせや軽量 drill、結果記録を残します。",
    runbookHref: "/admin/settings/support#system",
  },
  {
    key: "asset_training",
    label: "資産 / 教育",
    cadenceLabel: "四半期ごと",
    recommendedIntervalDays: 90,
    summary: "端末棚卸、紛失時対応、教育 / 訓練の実施記録を確認します。",
    runbookHref: "/admin/settings/support#security",
  },
  {
    key: "vendor_review",
    label: "委託先見直し",
    cadenceLabel: "四半期ごと",
    recommendedIntervalDays: 90,
    summary: "SLA、保存リージョン、再委託、障害報告の見直しを記録します。",
    runbookHref: "/admin/settings/support#master",
  },
  {
    key: "network_review",
    label: "ネットワーク安全管理",
    cadenceLabel: "四半期ごと",
    recommendedIntervalDays: 90,
    summary: "接続点、FW / ACL、無線 LAN、例外ルールの見直しを記録します。",
    runbookHref: "/admin/settings/support#system",
  },
] as const;

export type AdminComplianceOperationKey = (typeof ADMIN_COMPLIANCE_OPERATIONS)[number]["key"];
export type AdminComplianceRunStatus = "completed" | "needs_followup";
export type AdminComplianceOrganizationScope = "hospital" | "ems" | "admin" | "shared";
export type AdminComplianceEvidenceType = "document" | "folder" | "ticket" | "url" | "other";
export type AdminComplianceOperatingUnitScope = "admin" | "shared";

export type AdminComplianceOrganizationOption = {
  scope: AdminComplianceOrganizationScope;
  organizationId: number;
  label: string;
  sourceTable: string | null;
};

export type AdminComplianceOperatingUnitRecord = {
  id: number;
  scope: AdminComplianceOperatingUnitScope;
  unitCode: string;
  displayLabel: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminComplianceRegistryEntry = {
  scope: AdminComplianceOrganizationScope;
  organizationId: number;
  label: string;
  sourceTable: string | null;
  isActive: boolean;
};
