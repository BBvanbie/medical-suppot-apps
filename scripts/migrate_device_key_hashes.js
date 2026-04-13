/* eslint-disable @typescript-eslint/no-require-imports */
const { createHash } = require("node:crypto");
const { Client } = require("pg");
const { readDatabaseUrl } = require("./db_url");

function hashDeviceKey(value) {
  return createHash("sha256").update(String(value ?? "").trim()).digest("hex");
}

async function main() {
  const databaseUrl = readDatabaseUrl();
  const url = new URL(databaseUrl);
  const client = new Client({ connectionString: databaseUrl });

  await client.connect();
  try {
    await client.query("BEGIN");
    const rows = await client.query(
      `
        SELECT id, registered_device_key, registered_device_key_hash
        FROM devices
        WHERE registered_device_key IS NOT NULL
          AND btrim(registered_device_key) <> ''
      `,
    );

    let backfilled = 0;
    for (const row of rows.rows) {
      const nextHash = row.registered_device_key_hash || hashDeviceKey(row.registered_device_key);
      await client.query(
        `
          UPDATE devices
          SET registered_device_key_hash = $2,
              registered_device_key = NULL,
              updated_at = NOW()
          WHERE id = $1
        `,
        [row.id, nextHash],
      );
      backfilled += 1;
    }

    const remaining = await client.query(
      `
        SELECT COUNT(*)::int AS count
        FROM devices
        WHERE registered_device_key IS NOT NULL
          AND btrim(registered_device_key) <> ''
      `,
    );

    await client.query("COMMIT");
    console.log(JSON.stringify({ databaseHost: url.host, backfilled, remainingPlaintextRows: remaining.rows[0].count }, null, 2));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
