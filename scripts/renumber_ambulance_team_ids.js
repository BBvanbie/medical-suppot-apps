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
  const outPath = path.join(outDir, `ambulance-team-ids-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result.rows, null, 2), "utf8");
  return outPath;
}

async function loadMappingRows(client) {
  const result = await client.query(`
    SELECT id AS old_id, display_order
    FROM emergency_teams
    ORDER BY display_order ASC, id ASC
  `);
  return result.rows.map((row, index) => ({
    oldId: Number(row.old_id),
    newId: index + 1,
  }));
}

async function loadConstraintNames(client) {
  const result = await client.query(`
    SELECT
      con.conname AS constraint_name,
      con.conrelid::regclass::text AS table_name
    FROM pg_constraint con
    WHERE con.contype = 'f'
      AND con.confrelid = 'emergency_teams'::regclass
    ORDER BY table_name, constraint_name
  `);
  return result.rows;
}

async function main() {
  const client = new Client({ connectionString: readDatabaseUrl() });
  await client.connect();

  try {
    const backupPath = await exportBackup(client);
    const mappingRows = await loadMappingRows(client);
    const constraints = await loadConstraintNames(client);
    console.log(JSON.stringify({ backupPath, teamCount: mappingRows.length, constraints }, null, 2));

    await client.query("BEGIN");

    await client.query(`
      CREATE TEMP TABLE emergency_team_id_map (
        old_id BIGINT PRIMARY KEY,
        new_id BIGINT NOT NULL UNIQUE
      ) ON COMMIT DROP
    `);

    for (const row of mappingRows) {
      await client.query("INSERT INTO emergency_team_id_map (old_id, new_id) VALUES ($1, $2)", [row.oldId, row.newId]);
    }

    for (const { table_name, constraint_name } of constraints) {
      await client.query(`ALTER TABLE ${table_name} DROP CONSTRAINT ${constraint_name}`);
    }

    await client.query(`
      UPDATE emergency_teams AS et
      SET id = -map.new_id
      FROM emergency_team_id_map map
      WHERE et.id = map.old_id
    `);

    await client.query(`
      UPDATE users AS u
      SET team_id = -map.new_id
      FROM emergency_team_id_map map
      WHERE u.team_id = map.old_id
    `);
    await client.query(`
      UPDATE devices AS d
      SET team_id = -map.new_id
      FROM emergency_team_id_map map
      WHERE d.team_id = map.old_id
    `);
    await client.query(`
      UPDATE hospital_requests AS r
      SET from_team_id = -map.new_id
      FROM emergency_team_id_map map
      WHERE r.from_team_id = map.old_id
    `);
    await client.query(`
      UPDATE notifications AS n
      SET team_id = -map.new_id
      FROM emergency_team_id_map map
      WHERE n.team_id = map.old_id
    `);
    await client.query(`
      UPDATE cases AS c
      SET team_id = -map.new_id
      FROM emergency_team_id_map map
      WHERE c.team_id = map.old_id
    `);
    await client.query(`
      UPDATE audit_logs AS a
      SET target_id = map.new_id::text
      FROM emergency_team_id_map map
      WHERE a.target_type = 'ambulance_team'
        AND a.target_id = map.old_id::text
    `);

    await client.query("UPDATE emergency_teams SET id = -id WHERE id < 0");
    await client.query("UPDATE users SET team_id = -team_id WHERE team_id < 0");
    await client.query("UPDATE devices SET team_id = -team_id WHERE team_id < 0");
    await client.query("UPDATE hospital_requests SET from_team_id = -from_team_id WHERE from_team_id < 0");
    await client.query("UPDATE notifications SET team_id = -team_id WHERE team_id < 0");
    await client.query("UPDATE cases SET team_id = -team_id WHERE team_id < 0");

    await client.query(`
      SELECT setval(
        pg_get_serial_sequence('emergency_teams', 'id'),
        COALESCE((SELECT MAX(id) FROM emergency_teams), 1),
        true
      )
    `);

    await client.query(`
      ALTER TABLE users
      ADD CONSTRAINT users_team_id_fkey
      FOREIGN KEY (team_id) REFERENCES emergency_teams(id) ON DELETE SET NULL
    `);
    await client.query(`
      ALTER TABLE devices
      ADD CONSTRAINT devices_team_id_fkey
      FOREIGN KEY (team_id) REFERENCES emergency_teams(id) ON DELETE SET NULL
    `);
    await client.query(`
      ALTER TABLE hospital_requests
      ADD CONSTRAINT hospital_requests_from_team_id_fkey
      FOREIGN KEY (from_team_id) REFERENCES emergency_teams(id) ON DELETE SET NULL
    `);
    await client.query(`
      ALTER TABLE notifications
      ADD CONSTRAINT notifications_team_id_fkey
      FOREIGN KEY (team_id) REFERENCES emergency_teams(id) ON DELETE CASCADE
    `);
    await client.query(`
      ALTER TABLE cases
      ADD CONSTRAINT cases_team_id_fkey
      FOREIGN KEY (team_id) REFERENCES emergency_teams(id)
    `);

    const verification = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM emergency_teams) AS teams,
        (SELECT MIN(id) FROM emergency_teams) AS min_id,
        (SELECT MAX(id) FROM emergency_teams) AS max_id,
        (SELECT COUNT(*) FROM users WHERE team_id IS NOT NULL) AS users_refs,
        (SELECT COUNT(*) FROM devices WHERE team_id IS NOT NULL) AS devices_refs,
        (SELECT COUNT(*) FROM hospital_requests WHERE from_team_id IS NOT NULL) AS request_refs,
        (SELECT COUNT(*) FROM notifications WHERE team_id IS NOT NULL) AS notification_refs,
        (SELECT COUNT(*) FROM cases WHERE team_id IS NOT NULL) AS case_refs,
        (SELECT COUNT(*) FROM audit_logs WHERE target_type = 'ambulance_team') AS audit_refs
    `);

    const firstRows = await client.query(`
      SELECT id, team_code, team_name, display_order
      FROM emergency_teams
      ORDER BY display_order ASC, id ASC
      LIMIT 20
    `);

    await client.query("COMMIT");
    console.log(JSON.stringify({ verification: verification.rows[0], firstRows: firstRows.rows }, null, 2));
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
