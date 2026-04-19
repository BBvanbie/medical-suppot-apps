/* eslint-disable @typescript-eslint/no-require-imports */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { readDatabaseUrl } = require("./db_url");
const { MIGRATIONS } = require("./migration_manifest");

async function ensureSchemaMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      migration_id TEXT PRIMARY KEY,
      migration_name TEXT NOT NULL,
      file_name TEXT NOT NULL,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

function readMigrationSql(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function calculateChecksum(sql) {
  return crypto.createHash("sha256").update(sql, "utf8").digest("hex");
}

function buildAcceptedRecords(migration, checksum, fileName) {
  return [{ fileName, checksum }, ...(migration.legacyRecords ?? [])];
}

function matchesRecordedMigration(record, candidate) {
  return record.file_name === candidate.fileName && record.checksum === candidate.checksum;
}

async function fetchAppliedMigrations(client) {
  const result = await client.query(`
    SELECT migration_id, migration_name, file_name, checksum, applied_at
    FROM schema_migrations
    ORDER BY migration_id ASC
  `);

  return new Map(result.rows.map((row) => [row.migration_id, row]));
}

async function applyMigration(client, migration) {
  const sql = readMigrationSql(migration.file);
  const checksum = calculateChecksum(sql);
  const fileName = path.basename(migration.file);

  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query(
      `
        INSERT INTO schema_migrations (migration_id, migration_name, file_name, checksum)
        VALUES ($1, $2, $3, $4)
      `,
      [migration.id, migration.name, fileName, checksum],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }

  return { checksum, fileName };
}

async function reconcileAppliedMigration(client, migration, checksum, fileName) {
  await client.query(
    `
      UPDATE schema_migrations
      SET migration_name = $2,
          file_name = $3,
          checksum = $4
      WHERE migration_id = $1
    `,
    [migration.id, migration.name, fileName, checksum],
  );
}

async function main() {
  const client = new Client({ connectionString: readDatabaseUrl() });
  await client.connect();

  try {
    await ensureSchemaMigrationsTable(client);
    const appliedMigrations = await fetchAppliedMigrations(client);

    for (const migration of MIGRATIONS) {
      const sql = readMigrationSql(migration.file);
      const checksum = calculateChecksum(sql);
      const fileName = path.basename(migration.file);
      const applied = appliedMigrations.get(migration.id);
      const acceptedRecords = buildAcceptedRecords(migration, checksum, fileName);

      if (applied) {
        const currentRecord = acceptedRecords[0];
        if (matchesRecordedMigration(applied, currentRecord)) {
          console.log(`[db_migrate] skip ${migration.id} (${migration.name})`);
          continue;
        }

        const matchedLegacyRecord = acceptedRecords.slice(1).find((record) => matchesRecordedMigration(applied, record));
        if (matchedLegacyRecord) {
          await reconcileAppliedMigration(client, migration, checksum, fileName);
          console.log(`[db_migrate] reconcile ${migration.id} (${migration.name})`);
          continue;
        }

        if (applied.checksum !== checksum || applied.file_name !== fileName) {
          throw new Error(
            `Migration ${migration.id} is already recorded with different content. ` +
              `expected ${fileName}:${checksum}, found ${applied.file_name}:${applied.checksum}.`,
          );
        }
      }

      console.log(`[db_migrate] apply ${migration.id} (${migration.name})`);
      await applyMigration(client, migration);
    }

    console.log("[db_migrate] completed");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`[db_migrate] ${error.message}`);
  process.exit(1);
});
