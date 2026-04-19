import { db } from "@/lib/db";

type SchemaRequirement = {
  table: string;
  columns?: string[];
  indexes?: string[];
  constraints?: string[];
  foreignKeys?: Array<{
    name: string;
    deleteAction: "NO ACTION" | "RESTRICT" | "CASCADE" | "SET NULL" | "SET DEFAULT";
  }>;
};

type MissingRequirement = {
  table: string;
  kind: "table" | "column" | "index" | "constraint";
  name?: string;
  detail?: string;
};

function formatMissingRequirement(item: MissingRequirement): string {
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
      return item.detail ?? `${item.kind} ${item.table}.${item.name ?? ""}`.trim();
  }
}

export async function assertSchemaRequirements(
  operation: string,
  requirements: SchemaRequirement[],
  remediation: string,
): Promise<void> {
  const requiredTables = [...new Set(requirements.map((requirement) => requirement.table))];
  if (requiredTables.length === 0) return;

  const [tablesResult, columnsResult, indexesResult, constraintsResult] = await Promise.all([
    db.query<{ table_name: string }>(
      `
        SELECT c.relname AS table_name
        FROM pg_class AS c
        INNER JOIN pg_namespace AS n ON n.oid = c.relnamespace
        WHERE n.nspname = current_schema()
          AND c.relkind IN ('r', 'p')
          AND c.relname = ANY($1::text[])
      `,
      [requiredTables],
    ),
    db.query<{ table_name: string; column_name: string }>(
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
      [requiredTables],
    ),
    db.query<{ table_name: string; index_name: string }>(
      `
        SELECT tablename AS table_name, indexname AS index_name
        FROM pg_indexes
        WHERE schemaname = current_schema()
          AND tablename = ANY($1::text[])
      `,
      [requiredTables],
    ),
    db.query<{ table_name: string; constraint_name: string; delete_action: string }>(
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
      [requiredTables],
    ),
  ]);

  const tableSet = new Set(tablesResult.rows.map((row) => row.table_name));
  const columnMap = new Map<string, Set<string>>();
  const indexMap = new Map<string, Set<string>>();
  const constraintMap = new Map<string, Set<string>>();
  const foreignKeyDeleteActionMap = new Map<string, Map<string, string>>();

  for (const row of columnsResult.rows) {
    const columns = columnMap.get(row.table_name) ?? new Set<string>();
    columns.add(row.column_name);
    columnMap.set(row.table_name, columns);
  }

  for (const row of indexesResult.rows) {
    const indexes = indexMap.get(row.table_name) ?? new Set<string>();
    indexes.add(row.index_name);
    indexMap.set(row.table_name, indexes);
  }

  for (const row of constraintsResult.rows) {
    const constraints = constraintMap.get(row.table_name) ?? new Set<string>();
    constraints.add(row.constraint_name);
    constraintMap.set(row.table_name, constraints);

    const actions = foreignKeyDeleteActionMap.get(row.table_name) ?? new Map<string, string>();
    actions.set(row.constraint_name, row.delete_action);
    foreignKeyDeleteActionMap.set(row.table_name, actions);
  }

  const missing: MissingRequirement[] = [];

  for (const requirement of requirements) {
    if (!tableSet.has(requirement.table)) {
      missing.push({ table: requirement.table, kind: "table" });
      continue;
    }

    for (const column of requirement.columns ?? []) {
      if (!(columnMap.get(requirement.table)?.has(column) ?? false)) {
        missing.push({ table: requirement.table, kind: "column", name: column });
      }
    }

    for (const index of requirement.indexes ?? []) {
      if (!(indexMap.get(requirement.table)?.has(index) ?? false)) {
        missing.push({ table: requirement.table, kind: "index", name: index });
      }
    }

    for (const constraint of requirement.constraints ?? []) {
      if (!(constraintMap.get(requirement.table)?.has(constraint) ?? false)) {
        missing.push({ table: requirement.table, kind: "constraint", name: constraint });
      }
    }

    for (const foreignKey of requirement.foreignKeys ?? []) {
      const actualDeleteAction = foreignKeyDeleteActionMap.get(requirement.table)?.get(foreignKey.name);
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

  if (missing.length === 0) return;

  throw new Error(
    `${operation} schema requirements are missing: ${missing.map(formatMissingRequirement).join(", ")}. ${remediation}`,
  );
}
