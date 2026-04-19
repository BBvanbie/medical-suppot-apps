import { db } from "@/lib/db";

const existenceCache = new Map<string, boolean>();

export async function tableExists(tableName: string): Promise<boolean> {
  const cacheKey = `table:${tableName}`;
  const cached = existenceCache.get(cacheKey);
  if (cached != null) return cached;

  const result = await db.query<{ exists: boolean }>(
    `SELECT to_regclass($1) IS NOT NULL AS exists`,
    [tableName],
  );
  const exists = Boolean(result.rows[0]?.exists);
  existenceCache.set(cacheKey, exists);
  return exists;
}

export async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const cacheKey = `column:${tableName}.${columnName}`;
  const cached = existenceCache.get(cacheKey);
  if (cached != null) return cached;

  const result = await db.query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM pg_attribute
        WHERE attrelid = to_regclass($1)
          AND attname = $2
          AND NOT attisdropped
      ) AS exists
    `,
    [tableName, columnName],
  );
  const exists = Boolean(result.rows[0]?.exists);
  existenceCache.set(cacheKey, exists);
  return exists;
}
