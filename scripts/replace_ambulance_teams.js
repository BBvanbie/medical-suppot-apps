/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { AMBULANCE_TEAMS_DATASET } = require("./ambulance_teams_dataset");
const { readDatabaseUrl } = require("./db_url");

const NAME_OKUSAWA = "\u5965\u6ca2";
const NAME_OKUSAWA_LEGACY = "\u5965\u6ca2\u6551\u6025\u968a";
const NAME_MIDORI = "\u7dd1";
const NAME_MIDORI_CHO = "\u7dd1\u753a";
const NAME_OLD_HQ = "\u672c\u5e81\u8a08";
const NAME_TOMIGAYA = "\u5bcc\u30f6\u8c37";
const NAME_ASAKAWA_SPECIAL = "\u6d45\u5ddd\u7279\u6b8a\u6551\u6025";
const NAME_MORIGASAKI = "\u68ee\u30f6\u5d0e";
const NAME_TSUTSUJIGAOKA = "\u3064\u3064\u3058\u30f6\u4e18";
const VALID_DIVISIONS = ["\u672c\u90e8\u6a5f\u52d5", "1\u65b9\u9762", "2\u65b9\u9762", "3\u65b9\u9762", "4\u65b9\u9762", "5\u65b9\u9762", "6\u65b9\u9762", "7\u65b9\u9762", "8\u65b9\u9762", "9\u65b9\u9762", "10\u65b9\u9762"];

function normalizeName(value) {
  return String(value)
    .normalize("NFKC")
    .replace(/[\u30f6\uff79]/g, "\u30b1")
    .replace(/[\u30fb\uff65]/g, "")
    .replace(/\(\u5c0f\u578b\)/g, "")
    .replace(/[\s\u3000]/g, "");
}

function buildDesiredEntries() {
  return AMBULANCE_TEAMS_DATASET.map(([division, teamName], index) => ({
    division,
    teamName,
    displayOrder: index + 1,
  }));
}

async function loadCurrentTeams(client) {
  const result = await client.query(`
    SELECT id, team_code, team_name, division, display_order, is_active, created_at
    FROM emergency_teams
    ORDER BY id ASC
  `);
  return result.rows;
}

async function exportBackup(client) {
  const result = await client.query(`
    SELECT id, team_code, team_name, division, display_order, is_active, created_at
    FROM emergency_teams
    ORDER BY id ASC
  `);
  const outDir = path.join(process.cwd(), "tmp");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `ambulance-teams-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result.rows, null, 2), "utf8");
  return outPath;
}

function first(map, key) {
  const rows = map.get(key) ?? [];
  return rows[0] ?? null;
}

function buildCurrentByNorm(currentTeams) {
  const currentByNorm = new Map();
  for (const row of currentTeams) {
    const key = normalizeName(row.team_name);
    const list = currentByNorm.get(key) ?? [];
    list.push(row);
    currentByNorm.set(key, list);
  }
  return currentByNorm;
}

async function moveReferences(client, fromId, toId) {
  await client.query("UPDATE users SET team_id = $2 WHERE team_id = $1", [fromId, toId]);
  await client.query("UPDATE devices SET team_id = $2 WHERE team_id = $1", [fromId, toId]);
  await client.query("UPDATE hospital_requests SET from_team_id = $2 WHERE from_team_id = $1", [fromId, toId]);
  await client.query("UPDATE notifications SET team_id = $2 WHERE team_id = $1", [fromId, toId]);
  await client.query("UPDATE cases SET team_id = $2 WHERE team_id = $1", [fromId, toId]);
}

function buildPlan(currentTeams, desiredEntries) {
  const currentByNorm = buildCurrentByNorm(currentTeams);
  const exactMatchedIds = new Set();
  const updates = [];

  for (const entry of desiredEntries) {
    const row = first(currentByNorm, normalizeName(entry.teamName));
    if (!row) continue;
    exactMatchedIds.add(row.id);
    updates.push({ id: row.id, ...entry });
  }

  const unmatchedDesired = desiredEntries.filter((entry) => !first(currentByNorm, normalizeName(entry.teamName)));
  const unmatchedCurrent = currentTeams.filter((row) => !exactMatchedIds.has(row.id));

  return { updates, unmatchedDesired, unmatchedCurrent, currentByNorm };
}

async function main() {
  const desiredEntries = buildDesiredEntries();
  const client = new Client({ connectionString: readDatabaseUrl() });
  await client.connect();

  try {
    const currentTeams = await loadCurrentTeams(client);
    const { updates, unmatchedDesired, unmatchedCurrent, currentByNorm } = buildPlan(currentTeams, desiredEntries);

    console.log(
      JSON.stringify(
        {
          desiredCount: desiredEntries.length,
          currentCount: currentTeams.length,
          matchedCount: updates.length,
          unmatchedDesired: unmatchedDesired.map((item) => item.teamName),
          unmatchedCurrent: unmatchedCurrent.map((item) => ({ id: item.id, teamCode: item.team_code, teamName: item.team_name })),
        },
        null,
        2,
      ),
    );

    if (unmatchedDesired.length !== 0) {
      throw new Error("Unexpected desired diff. Aborting.");
    }

    const renameById = new Map([
      [64, desiredEntries.find((item) => item.teamName === NAME_TOMIGAYA)],
      [148, desiredEntries.find((item) => item.teamName === NAME_ASAKAWA_SPECIAL)],
      [193, desiredEntries.find((item) => item.teamName === NAME_MORIGASAKI)],
      [273, desiredEntries.find((item) => item.teamName === NAME_TSUTSUJIGAOKA)],
    ]);

    const rowsToDelete = [
      { sourceName: NAME_OKUSAWA_LEGACY, targetName: NAME_OKUSAWA },
      { sourceName: NAME_MIDORI_CHO, targetName: NAME_MIDORI },
      { sourceName: NAME_OLD_HQ, targetName: null },
    ];

    for (const { sourceName, targetName } of rowsToDelete) {
      const source = first(currentByNorm, normalizeName(sourceName));
      if (!source) continue;
      const target = targetName ? first(currentByNorm, normalizeName(targetName)) : true;
      if (!target) {
        throw new Error(`Delete/remap target not found: ${sourceName} -> ${targetName}`);
      }
    }

    const backupPath = await exportBackup(client);
    console.log(`Backup written: ${backupPath}`);

    await client.query("BEGIN");
    await client.query("ALTER TABLE emergency_teams DROP CONSTRAINT IF EXISTS emergency_teams_division_check");

    for (const [id, entry] of renameById.entries()) {
      if (!entry) throw new Error(`Rename mapping missing for id ${id}`);
      await client.query(
        `
          UPDATE emergency_teams
          SET team_name = $2, division = $3, display_order = $4, is_active = TRUE
          WHERE id = $1
        `,
        [id, entry.teamName, entry.division, entry.displayOrder],
      );
    }

    for (const { sourceName, targetName } of rowsToDelete) {
      const source = first(currentByNorm, normalizeName(sourceName));
      if (!source) continue;
      if (targetName) {
        const target = first(currentByNorm, normalizeName(targetName));
        await moveReferences(client, source.id, target.id);
      }
      await client.query("DELETE FROM emergency_teams WHERE id = $1", [source.id]);
    }

    const afterRows = await loadCurrentTeams(client);
    const afterByNorm = new Map(afterRows.map((row) => [normalizeName(row.team_name), row]));

    for (const entry of desiredEntries) {
      const row = afterByNorm.get(normalizeName(entry.teamName));
      if (!row) throw new Error(`Final row not found: ${entry.teamName}`);
      await client.query(
        `
          UPDATE emergency_teams
          SET team_name = $2, division = $3, display_order = $4, is_active = TRUE
          WHERE id = $1
        `,
        [row.id, entry.teamName, entry.division, entry.displayOrder],
      );
    }

    const finalCountResult = await client.query("SELECT count(*)::int AS count FROM emergency_teams");
    if (finalCountResult.rows[0].count !== desiredEntries.length) {
      throw new Error(`Final team count mismatch: ${finalCountResult.rows[0].count}`);
    }

    const divisionsSql = VALID_DIVISIONS.map((value) => `'${value}'`).join(", ");
    await client.query(`
      ALTER TABLE emergency_teams
      ADD CONSTRAINT emergency_teams_division_check
      CHECK (division IN (${divisionsSql}))
    `);

    await client.query("COMMIT");

    const verification = await client.query(`
      SELECT id, team_code, team_name, division, display_order
      FROM emergency_teams
      ORDER BY display_order ASC, id ASC
      LIMIT 20
    `);
    console.log(JSON.stringify({ finalCount: desiredEntries.length, firstRows: verification.rows }, null, 2));
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
