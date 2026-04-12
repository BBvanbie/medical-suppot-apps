/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { readDatabaseUrl } = require("./db_url");

function parseSuffix(username) {
  const match = String(username).match(/^ems[_-]?(\d{3})$/i);
  return match ? Number(match[1]) : null;
}

async function main() {
  const client = new Client({ connectionString: readDatabaseUrl() });
  await client.connect();

  try {
    await client.query("BEGIN");

    const backup = await client.query(`
      SELECT id, username, display_name, role, team_id, is_active
      FROM users
      WHERE role = 'EMS'
      ORDER BY id ASC
    `);

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(process.cwd(), "tmp", `ems-users-backup-${stamp}.json`);
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.writeFileSync(backupPath, JSON.stringify(backup.rows, null, 2));

    const teamsResult = await client.query(`
      SELECT id, team_code, team_name
      FROM emergency_teams
      ORDER BY id ASC
    `);

    const teamByCode = new Map(teamsResult.rows.map((row) => [row.team_code, row]));

    const usersResult = await client.query(`
      SELECT id, username, display_name, team_id
      FROM users
      WHERE role = 'EMS'
      ORDER BY id ASC
    `);

    const updated = [];
    const skipped = [];

    for (const user of usersResult.rows) {
      const suffix = parseSuffix(user.username);
      const normalizedUsername = suffix ? `ems-${String(suffix).padStart(3, "0")}` : user.username;

      if (!suffix) {
        skipped.push({ id: user.id, username: user.username, reason: "invalid_username_format" });
        continue;
      }

      const teamCode = `EMS-${String(suffix).padStart(3, "0")}`;
      const team = teamByCode.get(teamCode);

      if (!team) {
        await client.query(
          `
            UPDATE users
            SET username = $2, updated_at = NOW()
            WHERE id = $1
          `,
          [user.id, normalizedUsername],
        );
        skipped.push({ id: user.id, username: normalizedUsername, reason: "missing_target_team", expectedTeamCode: teamCode });
        continue;
      }

      await client.query(
        `
          UPDATE users
          SET
            username = $2,
            display_name = $3,
            team_id = $4,
            updated_at = NOW()
          WHERE id = $1
        `,
        [user.id, normalizedUsername, team.team_name, team.id],
      );

      updated.push({
        id: user.id,
        username: normalizedUsername,
        teamCode: team.team_code,
        teamName: team.team_name,
      });
    }

    const verify = await client.query(`
      SELECT
        COUNT(*) FILTER (
          WHERE role = 'EMS'
            AND username ~ '^ems-\\d{3}$'
        )::int AS normalized_usernames,
        COUNT(*) FILTER (
          WHERE role = 'EMS'
            AND team_id IS NOT NULL
        )::int AS ems_with_team
      FROM users
    `);

    await client.query("COMMIT");

    console.log(
      JSON.stringify(
        {
          backupPath,
          updatedCount: updated.length,
          skippedCount: skipped.length,
          skipped,
          sampleUpdated: updated.slice(0, 15),
          verify: verify.rows[0],
        },
        null,
        2,
      ),
    );
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
