import { Pool } from "pg";
import dbUrlModule from "./db_url.js";

function normalizeDatabaseUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const sslMode = url.searchParams.get("sslmode");

    if (sslMode === "prefer" || sslMode === "require" || sslMode === "verify-ca") {
      url.searchParams.set("sslmode", "verify-full");
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}

const { readDatabaseUrl } = dbUrlModule;
const rawConnectionString = readDatabaseUrl();

const pool = new Pool({
  connectionString: normalizeDatabaseUrl(rawConnectionString),
});

const casesRequirements = [
  {
    table: "cases",
    columns: [
      "case_payload",
      "updated_at",
      "case_uid",
      "mode",
      "dispatch_at",
      "created_from",
      "created_by_user_id",
      "case_status",
    ],
    indexes: [
      "idx_cases_case_uid_unique",
      "idx_cases_case_id",
      "idx_cases_mode_updated",
      "idx_cases_mode_team_timeline",
      "idx_cases_mode_division",
      "idx_cases_created_from_created_at",
      "idx_cases_dispatch_at",
    ],
    constraints: ["cases_mode_check", "cases_division_check"],
  },
  {
    table: "emergency_teams",
    columns: ["case_number_code"],
    indexes: ["idx_emergency_teams_case_number_code_unique"],
    constraints: ["emergency_teams_case_number_code_check"],
  },
];

const hospitalRequirements = [
  {
    table: "hospital_requests",
    columns: [
      "request_id",
      "case_id",
      "case_uid",
      "mode",
      "patient_summary",
      "from_team_id",
      "created_by_user_id",
      "first_sent_at",
      "sent_at",
    ],
    indexes: [
      "hospital_requests_request_id_key",
      "idx_hospital_requests_case_id",
      "idx_hospital_requests_case_uid",
      "idx_hospital_requests_first_sent_at",
      "idx_hospital_requests_sent_at",
      "idx_hospital_requests_case_uid_sent_at",
      "idx_hospital_requests_mode_sent_at",
      "idx_hospital_requests_created_by_created",
    ],
  },
  {
    table: "hospital_request_targets",
    columns: [
      "hospital_request_id",
      "hospital_id",
      "status",
      "selected_departments",
      "updated_by_user_id",
      "distance_km",
    ],
    indexes: [
      "hospital_request_targets_hospital_request_id_hospital_id_key",
      "idx_hospital_request_targets_hospital_id",
      "idx_hospital_request_targets_status",
      "idx_hospital_request_targets_updated_at",
      "idx_hospital_request_targets_hospital_updated",
      "idx_hospital_request_targets_hospital_status_updated",
      "idx_hospital_request_targets_request_status_updated",
    ],
    foreignKeys: [
      { name: "hospital_request_targets_hospital_request_id_fkey", deleteAction: "RESTRICT" },
      { name: "hospital_request_targets_hospital_id_fkey", deleteAction: "RESTRICT" },
    ],
  },
  {
    table: "hospital_request_events",
    columns: ["target_id", "event_type", "acted_by_user_id", "reason_code", "reason_text"],
    indexes: [
      "idx_hospital_request_events_target_id",
      "idx_hospital_request_events_acted_at",
      "idx_hospital_request_events_target_type_status_acted",
      "idx_hospital_request_events_actor_acted",
    ],
    foreignKeys: [{ name: "hospital_request_events_target_id_fkey", deleteAction: "RESTRICT" }],
  },
  {
    table: "hospital_patients",
    columns: ["target_id", "hospital_id", "case_id", "case_uid", "request_id", "mode", "status"],
    indexes: ["hospital_patients_target_id_key", "idx_hospital_patients_case_uid_unique"],
    foreignKeys: [
      { name: "hospital_patients_target_id_fkey", deleteAction: "RESTRICT" },
      { name: "hospital_patients_hospital_id_fkey", deleteAction: "RESTRICT" },
    ],
  },
  {
    table: "hospital_department_availability",
    columns: ["hospital_id", "department_id", "is_available", "updated_at"],
    indexes: ["hospital_department_availability_pkey", "idx_hospital_department_availability_hospital_available"],
  },
  {
    table: "notifications",
    columns: [
      "audience_role",
      "mode",
      "team_id",
      "hospital_id",
      "target_user_id",
      "kind",
      "case_id",
      "case_uid",
      "target_id",
      "severity",
      "dedupe_key",
      "expires_at",
      "acked_at",
    ],
    indexes: [
      "idx_notifications_role_scope_unread_created",
      "idx_notifications_role_mode_scope_unread_created",
      "idx_notifications_target_user_unread_created",
      "idx_notifications_target_user_mode_unread_created",
      "idx_notifications_ems_team_unread_created",
      "idx_notifications_hospital_unread_created",
      "idx_notifications_case_target",
      "idx_notifications_case_uid_target",
      "idx_notifications_dedupe_key",
      "idx_notifications_scope_dedupe_unique",
    ],
    constraints: [
      "notifications_case_identity_check",
      "notifications_team_id_fkey",
      "notifications_hospital_id_fkey",
      "notifications_target_id_fkey",
    ],
  },
  {
    table: "emergency_teams",
    columns: ["phone"],
  },
];

function formatMissingRequirement(item) {
  if (item.detail) {
    return item.detail;
  }

  switch (item.kind) {
    case "table":
      return `table ${item.table}`;
    case "column":
      return `column ${item.table}.${item.name}`;
    case "index":
      return `index ${item.name} on ${item.table}`;
    case "constraint":
      return `constraint ${item.name} on ${item.table}`;
    default:
      return `${item.kind} ${item.table}.${item.name ?? ""}`.trim();
  }
}

async function collectSchemaState(client, tables) {
  const [tablesResult, columnsResult, indexesResult, constraintsResult] = await Promise.all([
    client.query(
      `
        SELECT c.relname AS table_name
        FROM pg_class AS c
        INNER JOIN pg_namespace AS n ON n.oid = c.relnamespace
        WHERE n.nspname = current_schema()
          AND c.relkind IN ('r', 'p')
          AND c.relname = ANY($1::text[])
      `,
      [tables],
    ),
    client.query(
      `
        SELECT c.relname AS table_name, a.attname AS column_name
        FROM pg_class AS c
        INNER JOIN pg_namespace AS n ON n.oid = c.relnamespace
        INNER JOIN pg_attribute AS a ON a.attrelid = c.oid
        WHERE n.nspname = current_schema()
          AND c.relkind IN ('r', 'p')
          AND c.relname = ANY($1::text[])
          AND a.attnum > 0
          AND NOT a.attisdropped
      `,
      [tables],
    ),
    client.query(
      `
        SELECT tablename AS table_name, indexname AS index_name
        FROM pg_indexes
        WHERE schemaname = current_schema()
          AND tablename = ANY($1::text[])
      `,
      [tables],
    ),
    client.query(
      `
        SELECT
          rel.relname AS table_name,
          con.conname AS constraint_name,
          CASE con.confdeltype
            WHEN 'a' THEN 'NO ACTION'
            WHEN 'r' THEN 'RESTRICT'
            WHEN 'c' THEN 'CASCADE'
            WHEN 'n' THEN 'SET NULL'
            WHEN 'd' THEN 'SET DEFAULT'
            ELSE con.confdeltype::text
          END AS delete_action
        FROM pg_constraint AS con
        INNER JOIN pg_class AS rel ON rel.oid = con.conrelid
        INNER JOIN pg_namespace AS n ON n.oid = rel.relnamespace
        WHERE n.nspname = current_schema()
          AND rel.relname = ANY($1::text[])
      `,
      [tables],
    ),
  ]);

  const tableSet = new Set(tablesResult.rows.map((row) => row.table_name));
  const columnMap = new Map();
  const indexMap = new Map();
  const constraintMap = new Map();
  const foreignKeyDeleteActionMap = new Map();

  for (const row of columnsResult.rows) {
    const values = columnMap.get(row.table_name) ?? new Set();
    values.add(row.column_name);
    columnMap.set(row.table_name, values);
  }

  for (const row of indexesResult.rows) {
    const values = indexMap.get(row.table_name) ?? new Set();
    values.add(row.index_name);
    indexMap.set(row.table_name, values);
  }

  for (const row of constraintsResult.rows) {
    const values = constraintMap.get(row.table_name) ?? new Set();
    values.add(row.constraint_name);
    constraintMap.set(row.table_name, values);

    const actions = foreignKeyDeleteActionMap.get(row.table_name) ?? new Map();
    actions.set(row.constraint_name, row.delete_action);
    foreignKeyDeleteActionMap.set(row.table_name, actions);
  }

  return { tableSet, columnMap, indexMap, constraintMap, foreignKeyDeleteActionMap };
}

function findMissingRequirements(requirements, schemaState) {
  const missing = [];

  for (const requirement of requirements) {
    if (!schemaState.tableSet.has(requirement.table)) {
      missing.push({ table: requirement.table, kind: "table" });
      continue;
    }

    for (const column of requirement.columns ?? []) {
      if (!(schemaState.columnMap.get(requirement.table)?.has(column) ?? false)) {
        missing.push({ table: requirement.table, kind: "column", name: column });
      }
    }

    for (const index of requirement.indexes ?? []) {
      if (!(schemaState.indexMap.get(requirement.table)?.has(index) ?? false)) {
        missing.push({ table: requirement.table, kind: "index", name: index });
      }
    }

    for (const constraint of requirement.constraints ?? []) {
      if (!(schemaState.constraintMap.get(requirement.table)?.has(constraint) ?? false)) {
        missing.push({ table: requirement.table, kind: "constraint", name: constraint });
      }
    }

    for (const foreignKey of requirement.foreignKeys ?? []) {
      const actualDeleteAction = schemaState.foreignKeyDeleteActionMap.get(requirement.table)?.get(foreignKey.name);
      if (!actualDeleteAction) {
        missing.push({ table: requirement.table, kind: "constraint", name: foreignKey.name });
        continue;
      }
      if (actualDeleteAction !== foreignKey.deleteAction) {
        missing.push({
          table: requirement.table,
          kind: "constraint",
          name: foreignKey.name,
          detail: `constraint ${foreignKey.name} on ${requirement.table} delete action is ${actualDeleteAction}, expected ${foreignKey.deleteAction}`,
        });
      }
    }
  }

  return missing;
}

async function main() {
  const client = await pool.connect();

  try {
    const requirements = [...casesRequirements, ...hospitalRequirements];
    const tables = [...new Set(requirements.map((requirement) => requirement.table))];
    const schemaState = await collectSchemaState(client, tables);
    const missing = findMissingRequirements(requirements, schemaState);

    if (missing.length > 0) {
      throw new Error(
        `Schema requirements are missing: ${missing.map(formatMissingRequirement).join(", ")}. Run npm run db:bootstrap.`,
      );
    }

    console.log("[verify_schema_requirements] schema requirements satisfied");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`[verify_schema_requirements] ${error.message}`);
  process.exitCode = 1;
});
