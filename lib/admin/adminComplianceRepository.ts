import type { AuthenticatedAdminUser } from "@/lib/routeAccess";
import { db } from "@/lib/db";
import { assertSchemaRequirements } from "@/lib/schemaRequirements";
export {
  ADMIN_COMPLIANCE_OPERATIONS,
  type AdminComplianceEvidenceType,
  type AdminComplianceOperatingUnitRecord,
  type AdminComplianceOperatingUnitScope,
  type AdminComplianceOperationKey,
  type AdminComplianceOrganizationOption,
  type AdminComplianceOrganizationScope,
  type AdminComplianceRegistryEntry,
  type AdminComplianceRunStatus,
} from "@/lib/admin/adminComplianceDefinitions";
import {
  ADMIN_COMPLIANCE_OPERATIONS,
  type AdminComplianceEvidenceType,
  type AdminComplianceOperatingUnitRecord,
  type AdminComplianceOperatingUnitScope,
  type AdminComplianceOperationKey,
  type AdminComplianceOrganizationOption,
  type AdminComplianceOrganizationScope,
  type AdminComplianceRegistryEntry,
  type AdminComplianceRunStatus,
} from "@/lib/admin/adminComplianceDefinitions";

export type AdminComplianceRunRecord = {
  id: number;
  operationKey: AdminComplianceOperationKey;
  operationLabel: string;
  organizationScope: AdminComplianceOrganizationScope;
  organizationId: number | null;
  status: AdminComplianceRunStatus;
  completedAt: string;
  nextDueAt: string | null;
  supersedesRunId: number | null;
  evidenceType: AdminComplianceEvidenceType;
  evidenceLocation: string;
  evidenceReference: string;
  evidenceNotes: string;
  notes: string;
  retentionUntil: string;
  archivedAt: string | null;
  reportedByUserName: string | null;
  createdAt: string;
};

export type AdminComplianceOperationSummary = {
  key: AdminComplianceOperationKey;
  label: string;
  cadenceLabel: string;
  summary: string;
  runbookHref: string;
  latestRun: AdminComplianceRunRecord | null;
  attentionState: "missing" | "overdue" | "followup" | "ok";
  attentionLabel: string;
};

export type AdminComplianceDashboardSummary = {
  generatedAt: string;
  totalOperations: number;
  recordedOperations: number;
  attentionCount: number;
  missingCount: number;
  overdueCount: number;
  followupCount: number;
  latestCompletedAt: string | null;
  operations: AdminComplianceOperationSummary[];
  recentRuns: AdminComplianceRunRecord[];
  organizationOptions: AdminComplianceOrganizationOption[];
  operatingUnits: AdminComplianceOperatingUnitRecord[];
  registryEntries: AdminComplianceRegistryEntry[];
};

type ComplianceRunDbRow = {
  id: number;
  operation_key: AdminComplianceOperationKey;
  organization_scope: AdminComplianceOrganizationScope;
  organization_id: number | null;
  status: AdminComplianceRunStatus;
  completed_at: string;
  next_due_at: string | null;
  supersedes_run_id: number | null;
  evidence_type: AdminComplianceEvidenceType;
  evidence_location: string | null;
  evidence_reference: string | null;
  evidence_notes: string | null;
  notes: string | null;
  retention_until: string;
  archived_at: string | null;
  reported_by_user_name: string | null;
  created_at: string;
};

type ComplianceOrganizationRegistryRow = {
  id: number;
  organization_scope: AdminComplianceOrganizationScope;
  organization_id: number;
  display_label: string;
  source_table: string | null;
  is_active: boolean;
};

type ComplianceOperatingUnitDbRow = {
  id: number;
  scope: AdminComplianceOperatingUnitScope;
  unit_code: string;
  display_label: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const operationMap = new Map(ADMIN_COMPLIANCE_OPERATIONS.map((item) => [item.key, item]));

let ensured = false;
let attempted = false;
let ensurePromise: Promise<void> | null = null;

function isOperationKey(value: string): value is AdminComplianceOperationKey {
  return operationMap.has(value as AdminComplianceOperationKey);
}

function formatTimestamp(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function addDays(base: string, days: number) {
  const date = new Date(base);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function mapRunRecord(row: ComplianceRunDbRow): AdminComplianceRunRecord {
  return {
    id: row.id,
    operationKey: row.operation_key,
    operationLabel: operationMap.get(row.operation_key)?.label ?? row.operation_key,
    organizationScope: row.organization_scope,
    organizationId: row.organization_id,
    status: row.status,
    completedAt: formatTimestamp(row.completed_at) ?? row.completed_at,
    nextDueAt: formatTimestamp(row.next_due_at),
    supersedesRunId: row.supersedes_run_id,
    evidenceType: row.evidence_type,
    evidenceLocation: row.evidence_location ?? "",
    evidenceReference: row.evidence_reference ?? "",
    evidenceNotes: row.evidence_notes ?? "",
    notes: row.notes ?? "",
    retentionUntil: formatTimestamp(row.retention_until) ?? row.retention_until,
    archivedAt: formatTimestamp(row.archived_at),
    reportedByUserName: row.reported_by_user_name ?? null,
    createdAt: formatTimestamp(row.created_at) ?? row.created_at,
  };
}

function mapOperatingUnitRecord(row: ComplianceOperatingUnitDbRow): AdminComplianceOperatingUnitRecord {
  return {
    id: row.id,
    scope: row.scope,
    unitCode: row.unit_code,
    displayLabel: row.display_label,
    isActive: row.is_active,
    createdAt: formatTimestamp(row.created_at) ?? row.created_at,
    updatedAt: formatTimestamp(row.updated_at) ?? row.updated_at,
  };
}

function resolveAttentionStateFromDbRow(latestRun: ComplianceRunDbRow | null): AdminComplianceOperationSummary["attentionState"] {
  if (!latestRun) return "missing";
  if (latestRun.status === "needs_followup") return "followup";
  if (latestRun.next_due_at) {
    const due = new Date(latestRun.next_due_at);
    if (!Number.isNaN(due.getTime()) && due.getTime() < Date.now()) {
      return "overdue";
    }
  }
  return "ok";
}

function resolveAttentionLabel(state: AdminComplianceOperationSummary["attentionState"]) {
  if (state === "missing") return "未記録";
  if (state === "overdue") return "期限超過";
  if (state === "followup") return "要フォロー";
  return "記録あり";
}

export async function ensureAdminComplianceSchema() {
  if (ensured) return;
  if (ensurePromise) return ensurePromise;
  if (attempted) return;

  ensurePromise = (async () => {
    attempted = true;
    try {
      await assertSchemaRequirements(
        "ensureAdminComplianceSchema",
        [
          {
            table: "compliance_operating_units",
            columns: ["scope", "unit_code", "display_label", "is_active", "created_at", "updated_at"],
            indexes: ["idx_compliance_operating_units_scope_code_unique", "idx_compliance_operating_units_scope_active"],
            constraints: ["compliance_operating_units_scope_check"],
          },
          {
            table: "compliance_organization_registry",
            columns: [
              "organization_scope",
              "organization_id",
              "display_label",
              "source_table",
              "is_active",
              "created_at",
              "updated_at",
            ],
            indexes: [
              "idx_compliance_org_registry_scope_org_id_unique",
              "idx_compliance_org_registry_scope_null_unique",
              "idx_compliance_org_registry_scope_active",
            ],
            constraints: [
              "compliance_organization_registry_scope_check",
              "compliance_organization_registry_scope_id_check",
            ],
          },
          {
            table: "compliance_operation_runs",
            columns: [
              "operation_key",
              "organization_scope",
              "organization_id",
              "status",
              "completed_at",
              "next_due_at",
              "supersedes_run_id",
              "evidence_type",
              "evidence_location",
              "evidence_reference",
              "evidence_notes",
              "notes",
              "retention_until",
              "archived_at",
              "reported_by_user_id",
              "created_at",
            ],
            indexes: [
              "idx_compliance_operation_runs_operation_completed",
              "idx_compliance_operation_runs_next_due",
              "idx_compliance_operation_runs_created",
              "idx_compliance_operation_runs_scope_completed",
              "idx_compliance_operation_runs_retention",
              "idx_compliance_operation_runs_supersedes",
            ],
            constraints: [
              "compliance_operation_runs_status_check",
              "compliance_operation_runs_operation_key_check",
              "compliance_operation_runs_organization_scope_check",
              "compliance_operation_runs_scope_id_rule_check",
              "compliance_operation_runs_evidence_type_check",
              "compliance_operation_runs_reported_by_user_id_fkey",
              "compliance_operation_runs_supersedes_run_id_fkey",
            ],
          },
        ],
        "Run `npm run db:migrate` and `npm run db:verify` before using admin compliance settings.",
      );
      ensured = true;
    } catch (error) {
      attempted = false;
      throw error;
    } finally {
      ensurePromise = null;
    }
  })();

  return ensurePromise;
}

export async function getAdminComplianceDashboardSummary(): Promise<AdminComplianceDashboardSummary> {
  await ensureAdminComplianceSchema();

  const [latestRunsResult, recentRunsResult, organizationOptionsResult, operatingUnitsResult, registryEntriesResult] = await Promise.all([
    db.query<ComplianceRunDbRow>(
      `
        SELECT DISTINCT ON (run.operation_key)
          run.id,
          run.operation_key,
          run.organization_scope,
          run.organization_id,
          run.status,
          run.completed_at::text AS completed_at,
          run.next_due_at::text AS next_due_at,
          run.supersedes_run_id,
          run.evidence_type,
          run.evidence_location,
          run.evidence_reference,
          run.evidence_notes,
          run.notes,
          run.retention_until::text AS retention_until,
          run.archived_at::text AS archived_at,
          users.display_name AS reported_by_user_name,
          run.created_at::text AS created_at
        FROM compliance_operation_runs AS run
        LEFT JOIN users ON users.id = run.reported_by_user_id
        WHERE run.archived_at IS NULL
        ORDER BY run.operation_key ASC, run.completed_at DESC, run.id DESC
      `,
    ),
    db.query<ComplianceRunDbRow>(
      `
        SELECT
          run.id,
          run.operation_key,
          run.organization_scope,
          run.organization_id,
          run.status,
          run.completed_at::text AS completed_at,
          run.next_due_at::text AS next_due_at,
          run.supersedes_run_id,
          run.evidence_type,
          run.evidence_location,
          run.evidence_reference,
          run.evidence_notes,
          run.notes,
          run.retention_until::text AS retention_until,
          run.archived_at::text AS archived_at,
          users.display_name AS reported_by_user_name,
          run.created_at::text AS created_at
        FROM compliance_operation_runs AS run
        LEFT JOIN users ON users.id = run.reported_by_user_id
        WHERE run.archived_at IS NULL
        ORDER BY run.completed_at DESC, run.id DESC
        LIMIT 12
      `,
    ),
    db.query<ComplianceOrganizationRegistryRow>(
      `
        SELECT
          id,
          organization_scope,
          organization_id,
          display_label,
          source_table,
          is_active
        FROM compliance_organization_registry
        WHERE is_active = TRUE
        ORDER BY
          CASE organization_scope
            WHEN 'hospital' THEN 1
            WHEN 'ems' THEN 2
            WHEN 'admin' THEN 3
            WHEN 'shared' THEN 4
            ELSE 9
          END,
          display_label ASC,
          id DESC
      `,
    ),
    db.query<ComplianceOperatingUnitDbRow>(
      `
        SELECT
          id,
          scope,
          unit_code,
          display_label,
          is_active,
          created_at::text AS created_at,
          updated_at::text AS updated_at
        FROM compliance_operating_units
        ORDER BY
          CASE scope
            WHEN 'admin' THEN 1
            WHEN 'shared' THEN 2
            ELSE 9
          END,
          created_at DESC,
          id DESC
      `,
    ),
    db.query<ComplianceOrganizationRegistryRow>(
      `
        SELECT
          id,
          organization_scope,
          organization_id,
          display_label,
          source_table,
          is_active
        FROM compliance_organization_registry
        ORDER BY
          CASE organization_scope
            WHEN 'hospital' THEN 1
            WHEN 'ems' THEN 2
            WHEN 'admin' THEN 3
            WHEN 'shared' THEN 4
            ELSE 9
          END,
          is_active DESC,
          display_label ASC,
          id DESC
      `,
    ),
  ]);

  const latestRunDbMap = new Map(latestRunsResult.rows.map((row) => [row.operation_key, row] as const));
  const latestRunMap = new Map(latestRunsResult.rows.map((row) => [row.operation_key, mapRunRecord(row)] as const));

  const operations = ADMIN_COMPLIANCE_OPERATIONS.map((item) => {
    const latestRunDb = latestRunDbMap.get(item.key) ?? null;
    const latestRun = latestRunMap.get(item.key) ?? null;
    const attentionState = resolveAttentionStateFromDbRow(latestRunDb);
    return {
      key: item.key,
      label: item.label,
      cadenceLabel: item.cadenceLabel,
      summary: item.summary,
      runbookHref: item.runbookHref,
      latestRun,
      attentionState,
      attentionLabel: resolveAttentionLabel(attentionState),
    } satisfies AdminComplianceOperationSummary;
  });

  const missingCount = operations.filter((item) => item.attentionState === "missing").length;
  const overdueCount = operations.filter((item) => item.attentionState === "overdue").length;
  const followupCount = operations.filter((item) => item.attentionState === "followup").length;
  const latestCompletedAt =
    recentRunsResult.rows.length > 0 ? (formatTimestamp(recentRunsResult.rows[0].completed_at) ?? recentRunsResult.rows[0].completed_at) : null;

  return {
    generatedAt: new Date().toISOString(),
    totalOperations: ADMIN_COMPLIANCE_OPERATIONS.length,
    recordedOperations: operations.filter((item) => item.latestRun).length,
    attentionCount: missingCount + overdueCount + followupCount,
    missingCount,
    overdueCount,
    followupCount,
    latestCompletedAt,
    operations,
    recentRuns: recentRunsResult.rows.map(mapRunRecord),
    organizationOptions: organizationOptionsResult.rows.map((row) => ({
      scope: row.organization_scope,
      organizationId: row.organization_id,
      label: row.display_label,
      sourceTable: row.source_table,
    })),
    operatingUnits: operatingUnitsResult.rows.map(mapOperatingUnitRecord),
    registryEntries: registryEntriesResult.rows.map((row) => ({
      scope: row.organization_scope,
      organizationId: row.organization_id,
      label: row.display_label,
      sourceTable: row.source_table,
      isActive: row.is_active,
    })),
  };
}

export async function createComplianceOperatingUnit(
  input: {
    scope: AdminComplianceOperatingUnitScope;
    unitCode: string;
    displayLabel: string;
  },
): Promise<AdminComplianceOperatingUnitRecord> {
  await ensureAdminComplianceSchema();

  const result = await db.query<ComplianceOperatingUnitDbRow>(
    `
      INSERT INTO compliance_operating_units (scope, unit_code, display_label)
      VALUES ($1, $2, $3)
      RETURNING
        id,
        scope,
        unit_code,
        display_label,
        is_active,
        created_at::text AS created_at,
        updated_at::text AS updated_at
    `,
    [input.scope, input.unitCode.trim(), input.displayLabel.trim()],
  );

  return mapOperatingUnitRecord(result.rows[0]);
}

export async function updateComplianceOperatingUnit(
  input: {
    id: number;
    displayLabel: string;
    isActive: boolean;
  },
): Promise<AdminComplianceOperatingUnitRecord> {
  await ensureAdminComplianceSchema();

  const result = await db.query<ComplianceOperatingUnitDbRow>(
    `
      UPDATE compliance_operating_units
      SET
        display_label = $2,
        is_active = $3,
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        scope,
        unit_code,
        display_label,
        is_active,
        created_at::text AS created_at,
        updated_at::text AS updated_at
    `,
    [input.id, input.displayLabel.trim(), input.isActive],
  );

  if (result.rows.length === 0) {
    throw new Error("Compliance operating unit not found.");
  }

  return mapOperatingUnitRecord(result.rows[0]);
}

export async function createAdminComplianceRun(
  input: {
    operationKey: AdminComplianceOperationKey;
    organizationScope?: AdminComplianceOrganizationScope;
    organizationId?: number | null;
    status: AdminComplianceRunStatus;
    completedAt: string;
    nextDueAt?: string | null;
    supersedesRunId?: number | null;
    evidenceType?: AdminComplianceEvidenceType;
    evidenceLocation?: string | null;
    evidenceReference?: string | null;
    evidenceNotes?: string | null;
    notes?: string | null;
  },
  actor: AuthenticatedAdminUser,
): Promise<AdminComplianceRunRecord> {
  await ensureAdminComplianceSchema();

  const operation = operationMap.get(input.operationKey);
  if (!operation) throw new Error("Unknown compliance operation.");
  const organizationScope = input.organizationScope ?? "shared";
  if (input.organizationId == null) {
    throw new Error("organizationId is required for every scope.");
  }
  const registryResult = await db.query<ComplianceOrganizationRegistryRow>(
    `
      SELECT id
      FROM compliance_organization_registry
      WHERE organization_scope = $1
        AND organization_id = $2
        AND is_active = TRUE
      LIMIT 1
    `,
    [organizationScope, input.organizationId],
  );
  if (registryResult.rows.length === 0) {
    throw new Error(`organizationId does not resolve to an active ${organizationScope} record.`);
  }

  const completedAt = new Date(input.completedAt);
  if (Number.isNaN(completedAt.getTime())) {
    throw new Error("completedAt must be a valid datetime.");
  }

  const normalizedNextDueAt =
    input.nextDueAt && input.nextDueAt.trim()
      ? (() => {
          const parsed = new Date(input.nextDueAt);
          if (Number.isNaN(parsed.getTime())) throw new Error("nextDueAt must be a valid date.");
          return parsed.toISOString();
        })()
      : addDays(completedAt.toISOString(), operation.recommendedIntervalDays);

  const result = await db.query<ComplianceRunDbRow>(
    `
      INSERT INTO compliance_operation_runs (
        operation_key,
        organization_scope,
        organization_id,
        status,
        completed_at,
        next_due_at,
        supersedes_run_id,
        evidence_type,
        evidence_location,
        evidence_reference,
        evidence_notes,
        notes,
        retention_until,
        reported_by_user_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING
        id,
        operation_key,
        organization_scope,
        organization_id,
        status,
        completed_at::text AS completed_at,
        next_due_at::text AS next_due_at,
        supersedes_run_id,
        evidence_type,
        evidence_location,
        evidence_reference,
        evidence_notes,
        notes,
        retention_until::text AS retention_until,
        archived_at::text AS archived_at,
        (SELECT display_name FROM users WHERE id = reported_by_user_id) AS reported_by_user_name,
        created_at::text AS created_at
    `,
    [
      input.operationKey,
      organizationScope,
      input.organizationId ?? null,
      input.status,
      completedAt.toISOString(),
      normalizedNextDueAt,
      input.supersedesRunId ?? null,
      input.evidenceType ?? "other",
      input.evidenceLocation?.trim() ? input.evidenceLocation.trim() : null,
      input.evidenceReference?.trim() ? input.evidenceReference.trim() : null,
      input.evidenceNotes?.trim() ? input.evidenceNotes.trim() : null,
      input.notes?.trim() ? input.notes.trim() : null,
      addDays(completedAt.toISOString(), 365 * 5),
      actor.id,
    ],
  );

  return mapRunRecord(result.rows[0]);
}

export function parseAdminComplianceRunInput(body: unknown):
  | {
      success: true;
      data: {
        operationKey: AdminComplianceOperationKey;
        organizationScope: AdminComplianceOrganizationScope;
        organizationId: number | null;
        status: AdminComplianceRunStatus;
        completedAt: string;
        nextDueAt: string | null;
        supersedesRunId: number | null;
        evidenceType: AdminComplianceEvidenceType;
        evidenceLocation: string | null;
        evidenceReference: string | null;
        evidenceNotes: string | null;
        notes: string | null;
      };
    }
  | {
      success: false;
      message: string;
      fieldErrors: Record<string, string>;
    } {
  if (!body || typeof body !== "object") {
    return { success: false, message: "Invalid payload.", fieldErrors: { form: "入力内容を確認してください。" } };
  }

  const payload = body as Record<string, unknown>;
  const fieldErrors: Record<string, string> = {};

  const operationKey = typeof payload.operationKey === "string" ? payload.operationKey.trim() : "";
  if (!isOperationKey(operationKey)) {
    fieldErrors.operationKey = "対象運用を選択してください。";
  }

  const organizationScope =
    payload.organizationScope === "hospital" ||
    payload.organizationScope === "ems" ||
    payload.organizationScope === "admin" ||
    payload.organizationScope === "shared"
      ? payload.organizationScope
      : "shared";

  const organizationId =
    typeof payload.organizationId === "number" && Number.isFinite(payload.organizationId) && payload.organizationId > 0
      ? payload.organizationId
      : null;
  if (organizationId === null) {
    fieldErrors.organizationId = "対象スコープに対応する ID を選択してください。";
  }

  const status = payload.status === "completed" || payload.status === "needs_followup" ? payload.status : null;
  if (!status) {
    fieldErrors.status = "結果を選択してください。";
  }

  const completedAt = typeof payload.completedAt === "string" ? payload.completedAt.trim() : "";
  if (!completedAt || Number.isNaN(new Date(completedAt).getTime())) {
    fieldErrors.completedAt = "実施日時を正しく入力してください。";
  }

  const nextDueAtRaw = typeof payload.nextDueAt === "string" ? payload.nextDueAt.trim() : "";
  if (nextDueAtRaw && Number.isNaN(new Date(nextDueAtRaw).getTime())) {
    fieldErrors.nextDueAt = "次回期限を正しく入力してください。";
  }

  const supersedesRunId =
    typeof payload.supersedesRunId === "number" && Number.isFinite(payload.supersedesRunId) ? payload.supersedesRunId : null;

  const evidenceType =
    payload.evidenceType === "document" ||
    payload.evidenceType === "folder" ||
    payload.evidenceType === "ticket" ||
    payload.evidenceType === "url" ||
    payload.evidenceType === "other"
      ? payload.evidenceType
      : "other";

  const evidenceLocation = typeof payload.evidenceLocation === "string" ? payload.evidenceLocation.trim() : "";
  if (evidenceLocation.length > 500) {
    fieldErrors.evidenceLocation = "証跡参照先は 500 文字以内で入力してください。";
  }

  const evidenceReference = typeof payload.evidenceReference === "string" ? payload.evidenceReference.trim() : "";
  if (evidenceReference.length > 255) {
    fieldErrors.evidenceReference = "証跡参照番号は 255 文字以内で入力してください。";
  }

  const evidenceNotes = typeof payload.evidenceNotes === "string" ? payload.evidenceNotes.trim() : "";
  if (evidenceNotes.length > 1000) {
    fieldErrors.evidenceNotes = "証跡補足は 1000 文字以内で入力してください。";
  }

  const notes = typeof payload.notes === "string" ? payload.notes.trim() : "";
  if (notes.length > 4000) {
    fieldErrors.notes = "メモは 4000 文字以内で入力してください。";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, message: "Validation failed.", fieldErrors };
  }

  return {
    success: true,
      data: {
        operationKey: operationKey as AdminComplianceOperationKey,
        organizationScope,
        organizationId,
        status: status as AdminComplianceRunStatus,
        completedAt,
        nextDueAt: nextDueAtRaw || null,
        supersedesRunId,
        evidenceType,
        evidenceLocation: evidenceLocation || null,
        evidenceReference: evidenceReference || null,
        evidenceNotes: evidenceNotes || null,
        notes: notes || null,
      },
    };
}

export function parseComplianceOperatingUnitCreateInput(body: unknown):
  | { success: true; data: { scope: AdminComplianceOperatingUnitScope; unitCode: string; displayLabel: string } }
  | { success: false; message: string; fieldErrors: Record<string, string> } {
  if (!body || typeof body !== "object") {
    return { success: false, message: "Invalid payload.", fieldErrors: { form: "入力内容を確認してください。" } };
  }

  const payload = body as Record<string, unknown>;
  const fieldErrors: Record<string, string> = {};

  const scope = payload.scope === "admin" || payload.scope === "shared" ? payload.scope : null;
  if (!scope) {
    fieldErrors.scope = "運用主体スコープを選択してください。";
  }

  const unitCode = typeof payload.unitCode === "string" ? payload.unitCode.trim() : "";
  if (!unitCode) {
    fieldErrors.unitCode = "unit code は必須です。";
  } else if (!/^[a-z0-9_:-]{3,64}$/i.test(unitCode)) {
    fieldErrors.unitCode = "unit code は英数字、`_`、`-`、`:` のみで 3-64 文字にしてください。";
  }

  const displayLabel = typeof payload.displayLabel === "string" ? payload.displayLabel.trim() : "";
  if (!displayLabel) {
    fieldErrors.displayLabel = "表示名は必須です。";
  } else if (displayLabel.length > 100) {
    fieldErrors.displayLabel = "表示名は 100 文字以内で入力してください。";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, message: "Validation failed.", fieldErrors };
  }

  return {
    success: true,
    data: {
      scope: scope as AdminComplianceOperatingUnitScope,
      unitCode,
      displayLabel,
    },
  };
}

export function parseComplianceOperatingUnitUpdateInput(body: unknown):
  | { success: true; data: { id: number; displayLabel: string; isActive: boolean } }
  | { success: false; message: string; fieldErrors: Record<string, string> } {
  if (!body || typeof body !== "object") {
    return { success: false, message: "Invalid payload.", fieldErrors: { form: "入力内容を確認してください。" } };
  }

  const payload = body as Record<string, unknown>;
  const fieldErrors: Record<string, string> = {};

  const id = typeof payload.id === "number" && Number.isFinite(payload.id) && payload.id > 0 ? payload.id : null;
  if (!id) {
    fieldErrors.id = "更新対象 ID が不正です。";
  }

  const displayLabel = typeof payload.displayLabel === "string" ? payload.displayLabel.trim() : "";
  if (!displayLabel) {
    fieldErrors.displayLabel = "表示名は必須です。";
  } else if (displayLabel.length > 100) {
    fieldErrors.displayLabel = "表示名は 100 文字以内で入力してください。";
  }

  if (typeof payload.isActive !== "boolean") {
    fieldErrors.isActive = "有効状態の値が不正です。";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, message: "Validation failed.", fieldErrors };
  }

  return {
    success: true,
    data: {
      id: id as number,
      displayLabel,
      isActive: payload.isActive as boolean,
    },
  };
}
