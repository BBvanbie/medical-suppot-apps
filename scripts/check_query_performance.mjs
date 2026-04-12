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

async function getSampleContext(client) {
  const [caseRes, teamRes, hospitalRes, userRes] = await Promise.all([
    client.query("SELECT case_uid, case_id FROM cases ORDER BY updated_at DESC, id DESC LIMIT 1"),
    client.query("SELECT team_id FROM cases WHERE team_id IS NOT NULL GROUP BY team_id ORDER BY COUNT(*) DESC LIMIT 1"),
    client.query("SELECT hospital_id FROM hospital_request_targets GROUP BY hospital_id ORDER BY COUNT(*) DESC LIMIT 1"),
    client.query("SELECT created_by_user_id FROM hospital_requests WHERE created_by_user_id IS NOT NULL GROUP BY created_by_user_id ORDER BY COUNT(*) DESC LIMIT 1"),
  ]);

  return {
    caseUid: caseRes.rows[0]?.case_uid ?? "",
    caseId: caseRes.rows[0]?.case_id ?? "",
    teamId: teamRes.rows[0]?.team_id ?? null,
    hospitalId: hospitalRes.rows[0]?.hospital_id ?? null,
    userId: userRes.rows[0]?.created_by_user_id ?? null,
  };
}

function buildQueries(ctx) {
  return [
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
          AND team_id IS NOT DISTINCT FROM $1
          AND is_read = FALSE
        ORDER BY created_at DESC, id DESC
        LIMIT 100
      `,
      values: [ctx.teamId],
      skip: ctx.teamId == null,
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
