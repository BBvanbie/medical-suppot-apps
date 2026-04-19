/* eslint-disable @typescript-eslint/no-require-imports */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { readDatabaseUrl } = require("./db_url");
const { MIGRATIONS } = require("./migration_manifest");

function calculateChecksum(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath, "utf8"), "utf8").digest("hex");
}

function buildAcceptedRecords(migration, checksum, fileName) {
  return [{ fileName, checksum }, ...(migration.legacyRecords ?? [])];
}

function matchesRecordedMigration(record, candidate) {
  return record.file_name === candidate.fileName && record.checksum === candidate.checksum;
}

async function main() {
  const client = new Client({ connectionString: readDatabaseUrl() });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        migration_id TEXT PRIMARY KEY,
        migration_name TEXT NOT NULL,
        file_name TEXT NOT NULL,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const result = await client.query(`
      SELECT migration_id, file_name, checksum, applied_at
      FROM schema_migrations
      ORDER BY migration_id ASC
    `);

    const appliedMigrations = new Map(result.rows.map((row) => [row.migration_id, row]));

    for (const migration of MIGRATIONS) {
      const applied = appliedMigrations.get(migration.id);
      const fileName = path.basename(migration.file);
      const checksum = calculateChecksum(migration.file);
      const acceptedRecords = buildAcceptedRecords(migration, checksum, fileName);

      if (!applied) {
        console.log(`PENDING  ${migration.id}  ${fileName}`);
        continue;
      }

      const checksumState = acceptedRecords.some((record) => matchesRecordedMigration(applied, record))
        ? applied.file_name === fileName && applied.checksum === checksum
          ? "OK"
          : "LEGACY_OK"
        : "DRIFT";
      console.log(
        `APPLIED  ${migration.id}  ${fileName}  ${checksumState}  ${new Date(applied.applied_at).toISOString()}`,
      );
    }

    console.log("[db_migration_status] completed");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`[db_migration_status] ${error.message}`);
  process.exit(1);
});
