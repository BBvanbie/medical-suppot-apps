/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { hash } = require("bcryptjs");

function readDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const envPath = path.join(process.cwd(), ".env.local");
  const body = fs.readFileSync(envPath, "utf8");
  const line = body
    .split(/\r?\n/)
    .map((v) => v.trim())
    .find((v) => v.startsWith("DATABASE_URL="));

  if (!line) {
    throw new Error("DATABASE_URL not found in .env.local");
  }

  return line.slice("DATABASE_URL=".length).replace(/^"|"$/g, "");
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    password: process.env.TEST_USER_PASSWORD || "ChangeMe123!",
    adminUsername: process.env.ADMIN_USERNAME || "admin01",
    includeAdmin: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === "--dry-run") args.dryRun = true;
    if (value === "--no-admin") args.includeAdmin = false;
    if (value === "--password") args.password = argv[i + 1] || args.password;
    if (value === "--admin-username") args.adminUsername = argv[i + 1] || args.adminUsername;
  }

  return args;
}

function sanitize(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildTeamUsername(teamCode, teamId) {
  const normalizedCode = sanitize(teamCode).replace(/^ems_/, "");
  const base = normalizedCode || sanitize(teamCode);
  return base ? `ems_${base}` : `ems_team_${teamId}`;
}

function buildHospitalUsername(sourceNo, hospitalId) {
  const base = sanitize(sourceNo);
  return base ? `hospital_${base}` : `hospital_id_${hospitalId}`;
}

async function upsertUser(client, user) {
  await client.query(
    `
      INSERT INTO users (
        username,
        password_hash,
        role,
        display_name,
        hospital_id,
        team_id,
        is_active,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW())
      ON CONFLICT (username)
      DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        display_name = EXCLUDED.display_name,
        hospital_id = EXCLUDED.hospital_id,
        team_id = EXCLUDED.team_id,
        is_active = TRUE,
        updated_at = NOW()
    `,
    [user.username, user.passwordHash, user.role, user.displayName, user.hospitalId, user.teamId],
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const client = new Client({ connectionString: readDatabaseUrl() });
  const passwordHash = await hash(args.password, 12);

  await client.connect();
  try {
    const [teamsRes, hospitalsRes] = await Promise.all([
      client.query(
        "SELECT id, team_code, team_name FROM emergency_teams ORDER BY id ASC",
      ),
      client.query("SELECT id, source_no, name FROM hospitals ORDER BY id ASC"),
    ]);

    const users = [];
    for (const row of teamsRes.rows) {
      users.push({
        username: buildTeamUsername(row.team_code, row.id),
        passwordHash,
        role: "EMS",
        displayName: row.team_name || row.team_code || `救急隊${row.id}`,
        hospitalId: null,
        teamId: row.id,
      });
    }

    for (const row of hospitalsRes.rows) {
      users.push({
        username: buildHospitalUsername(row.source_no, row.id),
        passwordHash,
        role: "HOSPITAL",
        displayName: row.name || `病院${row.id}`,
        hospitalId: row.id,
        teamId: null,
      });
    }

    if (args.includeAdmin) {
      users.push({
        username: args.adminUsername,
        passwordHash,
        role: "ADMIN",
        displayName: "システム管理者",
        hospitalId: null,
        teamId: null,
      });
    }

    if (args.dryRun) {
      console.log(
        JSON.stringify(
          {
            message: "dry-run",
            totalUsers: users.length,
            emsUsers: teamsRes.rows.length,
            hospitalUsers: hospitalsRes.rows.length,
            includesAdmin: args.includeAdmin,
            sample: users.slice(0, 5).map((u) => ({ username: u.username, role: u.role })),
          },
          null,
          2,
        ),
      );
      return;
    }

    await client.query("BEGIN");
    for (const user of users) {
      await upsertUser(client, user);
    }
    await client.query("COMMIT");

    console.log(
      JSON.stringify(
        {
          message: "seed-complete",
          totalUsers: users.length,
          emsUsers: teamsRes.rows.length,
          hospitalUsers: hospitalsRes.rows.length,
          adminUser: args.includeAdmin ? args.adminUsername : null,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
