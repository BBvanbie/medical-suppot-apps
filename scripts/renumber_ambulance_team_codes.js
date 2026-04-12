/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { readDatabaseUrl } = require("./db_url");

async function exportBackup(client) {
  const result = await client.query(`
    SELECT id, team_code, team_name, division, display_order, is_active, created_at
    FROM emergency_teams
    ORDER BY display_order ASC, id ASC
  `);
  const outDir = path.join(process.cwd(), "tmp");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `ambulance-team-codes-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result.rows, null, 2), "utf8");
  return outPath;
}

async function main() {
  const client = new Client({ connectionString: readDatabaseUrl() });
  await client.connect();

  try {
    const backupPath = await exportBackup(client);
    console.log(`Backup written: ${backupPath}`);

    const rows = (
      await client.query(`
        SELECT id, team_code, team_name, display_order
        FROM emergency_teams
        ORDER BY display_order ASC, id ASC
      `)
    ).rows;

    await client.query("BEGIN");

    for (const row of rows) {
      await client.query("UPDATE emergency_teams SET team_code = $2 WHERE id = $1", [row.id, `TMP-${row.id}`]);
    }

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const nextCode = `EMS-${String(index + 1).padStart(3, "0")}`;
      await client.query("UPDATE emergency_teams SET team_code = $2 WHERE id = $1", [row.id, nextCode]);
    }

    await client.query("COMMIT");

    const verification = await client.query(`
      SELECT id, team_code, team_name, display_order
      FROM emergency_teams
      ORDER BY display_order ASC, id ASC
      LIMIT 20
    `);
    console.log(JSON.stringify({ count: rows.length, firstRows: verification.rows }, null, 2));
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
