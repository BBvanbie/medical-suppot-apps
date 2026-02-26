/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const VALID_STATUSES = new Set([
  "UNREAD",
  "READ",
  "NEGOTIATING",
  "ACCEPTABLE",
  "NOT_ACCEPTABLE",
  "TRANSPORT_DECIDED",
  "TRANSPORT_DECLINED",
]);

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
  return {
    dryRun: argv.includes("--dry-run"),
  };
}

function normalizeStatus(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "UNREAD";
  if (VALID_STATUSES.has(raw)) return raw;
  if (raw.includes("未読")) return "UNREAD";
  if (raw.includes("既読")) return "READ";
  if (raw.includes("要相談")) return "NEGOTIATING";
  if (raw.includes("受入可能")) return "ACCEPTABLE";
  if (raw.includes("受入不可")) return "NOT_ACCEPTABLE";
  if (raw.includes("搬送") && raw.includes("決定")) return "TRANSPORT_DECIDED";
  if (raw.includes("搬送") && (raw.includes("辞退") || raw.includes("キャンセル"))) return "TRANSPORT_DECLINED";
  return "UNREAD";
}

function normalizeDepartments(hospitalDepartments, selectedDepartments) {
  const source =
    Array.isArray(hospitalDepartments) && hospitalDepartments.length > 0
      ? hospitalDepartments
      : Array.isArray(selectedDepartments)
        ? selectedDepartments
        : [];
  return Array.from(new Set(source.map((v) => String(v).trim()).filter(Boolean)));
}

function parseHospitals(item) {
  const hospitals = [];
  if (Array.isArray(item.hospitals) && item.hospitals.length > 0) {
    for (const hospital of item.hospitals) {
      hospitals.push({
        sourceNo: Number(hospital?.hospitalId),
        name: String(hospital?.hospitalName ?? "").trim(),
        departments: normalizeDepartments(hospital?.departments, item.selectedDepartments),
      });
    }
    return hospitals;
  }

  if (Array.isArray(item.hospitalNames)) {
    for (const name of item.hospitalNames) {
      hospitals.push({
        sourceNo: Number.NaN,
        name: String(name ?? "").trim(),
        departments: normalizeDepartments(undefined, item.selectedDepartments),
      });
    }
  }
  return hospitals;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const client = new Client({ connectionString: readDatabaseUrl() });

  await client.connect();
  try {
    const hospitalsRes = await client.query("SELECT id, source_no, name FROM hospitals");
    const hospitalBySourceNo = new Map();
    const hospitalByName = new Map();
    for (const row of hospitalsRes.rows) {
      hospitalBySourceNo.set(row.source_no, row);
      hospitalByName.set(row.name, row);
    }

    const casesRes = await client.query(`
      SELECT case_id, team_id, case_payload
      FROM cases
      WHERE case_payload IS NOT NULL
    `);

    let requestsProcessed = 0;
    let targetsProcessed = 0;
    let requestsInsertedOrUpdated = 0;
    let targetsInsertedOrUpdated = 0;
    let eventsInserted = 0;
    let unresolvedTargets = 0;

    if (!args.dryRun) {
      await client.query("BEGIN");
    }

    for (const caseRow of casesRes.rows) {
      const payload = caseRow.case_payload && typeof caseRow.case_payload === "object" ? caseRow.case_payload : {};
      const sendHistory = Array.isArray(payload.sendHistory) ? payload.sendHistory : [];
      if (sendHistory.length === 0) continue;

      for (const item of sendHistory) {
        const requestId = String(item?.requestId ?? "").trim();
        const sentAtRaw = String(item?.sentAt ?? "").trim();
        if (!requestId || !sentAtRaw) continue;

        const sentAt = new Date(sentAtRaw);
        const sentAtIso = Number.isNaN(sentAt.getTime()) ? new Date().toISOString() : sentAt.toISOString();
        const status = normalizeStatus(item?.status);
        const parsedHospitals = parseHospitals(item);
        if (parsedHospitals.length === 0) continue;

        requestsProcessed += 1;

        let requestPk = -1;
        if (!args.dryRun) {
          const requestRes = await client.query(
            `
              INSERT INTO hospital_requests (
                request_id, case_id, from_team_id, created_by_user_id, sent_at, updated_at
              ) VALUES ($1, $2, $3, NULL, $4, NOW())
              ON CONFLICT (request_id)
              DO UPDATE SET
                case_id = EXCLUDED.case_id,
                from_team_id = EXCLUDED.from_team_id,
                sent_at = EXCLUDED.sent_at,
                updated_at = NOW()
              RETURNING id
            `,
            [requestId, caseRow.case_id, caseRow.team_id ?? null, sentAtIso],
          );
          requestPk = requestRes.rows[0].id;
          requestsInsertedOrUpdated += 1;
        }

        for (const target of parsedHospitals) {
          targetsProcessed += 1;
          const hospitalRow = hospitalBySourceNo.get(target.sourceNo) ?? hospitalByName.get(target.name) ?? null;
          if (!hospitalRow) {
            unresolvedTargets += 1;
            continue;
          }

          if (args.dryRun) continue;

          const targetRes = await client.query(
            `
              INSERT INTO hospital_request_targets (
                hospital_request_id,
                hospital_id,
                status,
                selected_departments,
                updated_by_user_id,
                updated_at
              ) VALUES ($1, $2, $3, $4::jsonb, NULL, NOW())
              ON CONFLICT (hospital_request_id, hospital_id)
              DO UPDATE SET
                status = EXCLUDED.status,
                selected_departments = EXCLUDED.selected_departments,
                updated_at = NOW()
              RETURNING id
            `,
            [requestPk, hospitalRow.id, status, JSON.stringify(target.departments)],
          );

          const targetId = targetRes.rows[0].id;
          targetsInsertedOrUpdated += 1;

          const eventRes = await client.query(
            `
              INSERT INTO hospital_request_events (
                target_id,
                event_type,
                from_status,
                to_status,
                acted_by_user_id,
                note,
                acted_at
              )
              SELECT $1, 'backfilled', NULL, $2, NULL, 'backfill from cases.sendHistory', NOW()
              WHERE NOT EXISTS (
                SELECT 1
                FROM hospital_request_events
                WHERE target_id = $1
                  AND event_type = 'backfilled'
              )
              RETURNING id
            `,
            [targetId, status],
          );
          if (eventRes.rowCount > 0) eventsInserted += 1;
        }
      }
    }

    if (!args.dryRun) {
      await client.query("COMMIT");
    }

    console.log(
      JSON.stringify(
        {
          mode: args.dryRun ? "dry-run" : "apply",
          requestsProcessed,
          targetsProcessed,
          unresolvedTargets,
          requestsInsertedOrUpdated,
          targetsInsertedOrUpdated,
          eventsInserted,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    if (!args.dryRun) {
      await client.query("ROLLBACK").catch(() => undefined);
    }
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

