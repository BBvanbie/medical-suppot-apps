#!/usr/bin/env node

import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";
import pg from "pg";

const { Client } = pg;
const require = createRequire(import.meta.url);
const { readDatabaseUrl } = require("./db_url.js");

const DEFAULT_WARN_MS = 500;
const DEFAULT_FAIL_MS = 1500;

function parseArgs(argv) {
  const args = {
    warnMs: DEFAULT_WARN_MS,
    failMs: DEFAULT_FAIL_MS,
    explain: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--warn-ms") args.warnMs = Number(argv[index + 1] ?? args.warnMs);
    if (token === "--fail-ms") args.failMs = Number(argv[index + 1] ?? args.failMs);
    if (token === "--explain") args.explain = true;
  }
  return args;
}

function buildNeedle(source, fallback) {
  const raw = String(source ?? "").trim();
  if (!raw) return fallback;
  const tokens = raw.split(/\s+/).filter(Boolean);
  const candidate = tokens[tokens.length - 1] ?? raw;
  const needle = candidate.slice(Math.max(0, candidate.length - Math.min(4, candidate.length)));
  return `%${needle}%`;
}

function buildShortPrefix(source, fallback) {
  const raw = String(source ?? "").trim();
  if (!raw) return fallback;
  const tokens = raw.split(/\s+/).filter(Boolean);
  const candidate = tokens[tokens.length - 1] ?? raw;
  const token = candidate.slice(0, Math.min(2, candidate.length)).toLowerCase();
  return `${token}%`;
}

function buildShortContains(source, fallback) {
  const raw = String(source ?? "").trim();
  if (!raw) return fallback;
  const tokens = raw.split(/\s+/).filter(Boolean);
  const candidate = tokens[tokens.length - 1] ?? raw;
  const token = candidate.slice(Math.max(0, candidate.length - Math.min(2, candidate.length)));
  return `%${token}%`;
}

async function getSampleContext(client) {
  const [caseRes, teamRes, hospitalRes, userRes, emsUserRes, adminUserRes, searchSeedRes] = await Promise.all([
    client.query(`
      SELECT c.case_uid, c.case_id
      FROM cases c
      WHERE EXISTS (
        SELECT 1
        FROM hospital_requests r
        WHERE r.case_uid = c.case_uid
      )
      ORDER BY c.updated_at DESC, c.id DESC
      LIMIT 1
    `),
    client.query("SELECT team_id FROM cases WHERE team_id IS NOT NULL GROUP BY team_id ORDER BY COUNT(*) DESC LIMIT 1"),
    client.query("SELECT hospital_id FROM hospital_request_targets GROUP BY hospital_id ORDER BY COUNT(*) DESC LIMIT 1"),
    client.query("SELECT created_by_user_id FROM hospital_requests WHERE created_by_user_id IS NOT NULL GROUP BY created_by_user_id ORDER BY COUNT(*) DESC LIMIT 1"),
    client.query(`
      SELECT id, team_id, current_mode
      FROM users
      WHERE role = 'EMS'
        AND team_id IS NOT NULL
      ORDER BY id ASC
      LIMIT 1
    `),
    client.query(`
      SELECT current_mode
      FROM users
      WHERE role = 'ADMIN'
      ORDER BY id ASC
      LIMIT 1
    `),
    client.query(`
      SELECT
        c.patient_name,
        c.address,
        c.symptom,
        c.division,
        et.team_name,
        h.name AS hospital_name
      FROM cases c
      LEFT JOIN emergency_teams et ON et.id = c.team_id
      LEFT JOIN LATERAL (
        SELECT hh.name
        FROM hospital_requests hr
        JOIN hospital_request_targets ht ON ht.hospital_request_id = hr.id
        JOIN hospitals hh ON hh.id = ht.hospital_id
        WHERE hr.case_uid = c.case_uid
        ORDER BY ht.updated_at DESC, ht.id DESC
        LIMIT 1
      ) h ON TRUE
      WHERE c.patient_name IS NOT NULL
        AND c.patient_name <> ''
        AND c.address IS NOT NULL
        AND c.address <> ''
        AND et.team_name IS NOT NULL
        AND et.team_name <> ''
        AND h.name IS NOT NULL
        AND h.name <> ''
      ORDER BY c.updated_at DESC, c.id DESC
      LIMIT 1
    `),
  ]);

  return {
    caseUid: caseRes.rows[0]?.case_uid ?? "",
    caseId: caseRes.rows[0]?.case_id ?? "",
    teamId: teamRes.rows[0]?.team_id ?? null,
    hospitalId: hospitalRes.rows[0]?.hospital_id ?? null,
    userId: userRes.rows[0]?.created_by_user_id ?? null,
    emsUserId: emsUserRes.rows[0]?.id ?? null,
    emsUserTeamId: emsUserRes.rows[0]?.team_id ?? null,
    emsUserMode: emsUserRes.rows[0]?.current_mode ?? "LIVE",
    adminMode: adminUserRes.rows[0]?.current_mode ?? "LIVE",
    patientName: searchSeedRes.rows[0]?.patient_name ?? "",
    address: searchSeedRes.rows[0]?.address ?? "",
    symptom: searchSeedRes.rows[0]?.symptom ?? "",
    division: searchSeedRes.rows[0]?.division ?? "",
    teamName: searchSeedRes.rows[0]?.team_name ?? "",
    hospitalName: searchSeedRes.rows[0]?.hospital_name ?? "",
  };
}

function buildQueries(ctx) {
  const caseSearchTerm = buildNeedle(ctx.patientName || ctx.symptom || ctx.caseId, "%E2E%");
  const shortCaseSearchPrefix = buildShortPrefix(ctx.patientName || ctx.symptom || ctx.caseId, "e2%");
  const shortCaseSearchContains = buildShortContains(ctx.patientName || ctx.symptom || ctx.caseId, "%花子%");
  const areaSearchTerm = buildNeedle(ctx.address, "%東京%");
  const teamSearchTerm = buildNeedle(ctx.teamName, "%救急%");
  const hospitalSearchTerm = buildNeedle(ctx.hospitalName, "%病院%");

  return [
    {
      name: "cases_search_keyword",
      sql: `
        SELECT c.case_id, c.case_uid, c.updated_at
        FROM (
          SELECT c.*
          FROM cases c
          JOIN (
            SELECT id
            FROM cases
            WHERE mode = $2
              AND case_id ILIKE $1
            UNION
            SELECT id
            FROM cases
            WHERE mode = $2
              AND patient_name ILIKE $1
            UNION
            SELECT id
            FROM cases
            WHERE mode = $2
              AND address ILIKE $1
            UNION
            SELECT id
            FROM cases
            WHERE mode = $2
              AND symptom ILIKE $1
          ) matched_cases ON matched_cases.id = c.id
        ) c
        ORDER BY c.aware_date DESC, c.aware_time DESC, c.updated_at DESC, c.id DESC
        LIMIT 100
      `,
      values: [caseSearchTerm, ctx.emsUserMode],
    },
    {
      name: "cases_search_short_keyword",
      sql: `
        SELECT c.case_id, c.case_uid, c.updated_at
        FROM (
          SELECT c.*
          FROM cases c
          JOIN (
            SELECT id
            FROM cases
            WHERE mode = $1
              AND patient_name ILIKE $2
            UNION
            SELECT id
            FROM cases
            WHERE mode = $1
              AND symptom ILIKE $2
          ) matched_cases ON matched_cases.id = c.id
        ) c
        ORDER BY c.aware_date DESC, c.aware_time DESC, c.updated_at DESC, c.id DESC
        LIMIT 100
      `,
      values: [ctx.emsUserMode, shortCaseSearchContains],
    },
    {
      name: "cases_search_short_prefix_keyword",
      sql: `
        SELECT c.case_id, c.case_uid, c.updated_at
        FROM (
          SELECT c.*
          FROM cases c
          JOIN (
            SELECT id
            FROM cases
            WHERE mode = $1
              AND lower(case_id) LIKE $2
            UNION
            SELECT id
            FROM cases
            WHERE mode = $1
              AND lower(patient_name) LIKE $2
            UNION
            SELECT id
            FROM cases
            WHERE mode = $1
              AND lower(symptom) LIKE $2
          ) matched_cases ON matched_cases.id = c.id
        ) c
        ORDER BY c.aware_date DESC, c.aware_time DESC, c.updated_at DESC, c.id DESC
        LIMIT 100
      `,
      values: [ctx.emsUserMode, shortCaseSearchPrefix],
    },
    {
      name: "admin_cases_filtered_search",
      sql: `
        WITH filtered_cases AS (
          SELECT
            c.id,
            c.case_id,
            c.case_uid,
            c.updated_at,
            c.address,
            c.team_id
          FROM cases c
          LEFT JOIN emergency_teams et ON et.id = c.team_id
          WHERE c.mode = $1
            AND et.team_name ILIKE $2
            AND c.address ILIKE $3
        )
        SELECT c.case_id, c.updated_at
        FROM filtered_cases c
        WHERE EXISTS (
            SELECT 1
            FROM hospital_requests hr
            JOIN hospital_request_targets ht ON ht.hospital_request_id = hr.id
            JOIN hospitals hh ON hh.id = ht.hospital_id
            WHERE hr.case_uid = c.case_uid
              AND hh.name ILIKE $4
          )
        ORDER BY c.updated_at DESC, c.id DESC
        LIMIT 300
      `,
      values: [ctx.adminMode, teamSearchTerm, areaSearchTerm, hospitalSearchTerm],
    },
    {
      name: "admin_cases_latest",
      sql: `
        SELECT c.case_id, c.updated_at
        FROM cases c
        WHERE c.mode = 'LIVE'
        ORDER BY c.updated_at DESC, c.id DESC
        LIMIT 300
      `,
      values: [],
    },
    {
      name: "ems_cases_latest_by_team",
      sql: `
        SELECT c.case_id, c.aware_date, c.aware_time
        FROM cases c
        WHERE c.mode = 'LIVE'
          AND ($1::bigint IS NULL OR c.team_id = $1::bigint)
        ORDER BY c.aware_date DESC, c.aware_time DESC, c.updated_at DESC, c.id DESC
        LIMIT 300
      `,
      values: [ctx.teamId],
    },
    {
      name: "hospital_requests_by_hospital",
      sql: `
        SELECT t.id, r.request_id, t.status, r.sent_at
        FROM hospital_request_targets t
        JOIN hospital_requests r ON r.id = t.hospital_request_id
        WHERE t.hospital_id = $1
          AND r.mode = 'LIVE'
        ORDER BY r.sent_at DESC, t.id DESC
        LIMIT 300
      `,
      values: [ctx.hospitalId],
      skip: ctx.hospitalId == null,
    },
    {
      name: "case_send_history",
      sql: `
        SELECT t.id, r.request_id, t.status, t.updated_at
        FROM hospital_request_targets t
        JOIN hospital_requests r ON r.id = t.hospital_request_id
        WHERE r.case_uid = $1
        ORDER BY r.sent_at DESC, t.id DESC
      `,
      values: [ctx.caseUid],
      skip: !ctx.caseUid,
    },
    {
      name: "notifications_unread_scope",
      sql: `
        SELECT id, kind, created_at
        FROM notifications
        WHERE target_user_id IS NULL
          AND audience_role = 'EMS'
          AND mode = 'LIVE'
          AND team_id = $1
          AND is_read = FALSE
        ORDER BY created_at DESC, id DESC
        LIMIT 100
      `,
      values: [ctx.teamId],
      skip: ctx.teamId == null,
    },
    {
      name: "notifications_list_for_ems_user",
      sql: `
        WITH scoped_notifications AS (
          SELECT
            id,
            kind,
            title,
            body,
            created_at::text AS created_at,
            is_read
          FROM notifications
          WHERE target_user_id = $1
            AND mode = $2
            AND (expires_at IS NULL OR expires_at > NOW())
          UNION ALL
          SELECT
            id,
            kind,
            title,
            body,
            created_at::text AS created_at,
            is_read
          FROM notifications
          WHERE target_user_id IS NULL
            AND mode = $2
            AND audience_role = 'EMS'
            AND team_id = $3
            AND (expires_at IS NULL OR expires_at > NOW())
        )
        SELECT id, kind, created_at, is_read
        FROM scoped_notifications
        ORDER BY created_at DESC, id DESC
        LIMIT 30
      `,
      values: [ctx.emsUserId, ctx.emsUserMode, ctx.emsUserTeamId],
      skip: ctx.emsUserId == null || ctx.emsUserTeamId == null,
    },
    {
      name: "bulk_send_signal_window",
      sql: `
        SELECT COUNT(DISTINCT r.id)::int AS request_count, COUNT(t.id)::int AS target_count
        FROM hospital_requests r
        LEFT JOIN hospital_request_targets t ON t.hospital_request_id = r.id
        WHERE r.created_by_user_id = $1
          AND r.created_at >= NOW() - INTERVAL '15 minutes'
      `,
      values: [ctx.userId],
      skip: ctx.userId == null,
    },
    {
      name: "monitoring_recent_events",
      sql: `
        SELECT id, category, source, created_at
        FROM system_monitor_events
        ORDER BY created_at DESC, id DESC
        LIMIT 12
      `,
      values: [],
    },
  ];
}

async function runQuery(client, query, args) {
  const startedAt = performance.now();
  const result = await client.query(query.sql, query.values);
  const elapsedMs = Math.round((performance.now() - startedAt) * 10) / 10;
  let plan = null;
  if (args.explain) {
    const explain = await client.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${query.sql}`, query.values);
    plan = explain.rows.map((row) => row["QUERY PLAN"]);
  }
  return {
    name: query.name,
    rows: result.rowCount ?? result.rows.length,
    elapsedMs,
    status: elapsedMs >= args.failMs ? "fail" : elapsedMs >= args.warnMs ? "warn" : "ok",
    plan,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const client = new Client({ connectionString: readDatabaseUrl() });
  await client.connect();
  try {
    const ctx = await getSampleContext(client);
    const queries = buildQueries(ctx).filter((query) => !query.skip);
    const results = [];
    for (const query of queries) {
      results.push(await runQuery(client, query, args));
    }
    const summary = {
      warnMs: args.warnMs,
      failMs: args.failMs,
      context: ctx,
      results,
      failed: results.filter((item) => item.status === "fail").map((item) => item.name),
      warned: results.filter((item) => item.status === "warn").map((item) => item.name),
    };
    console.log(JSON.stringify(summary, null, 2));
    if (summary.failed.length > 0) process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
