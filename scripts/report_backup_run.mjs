#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex < 0) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = "true";
    } else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

function parseDetails(value) {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return { note: value };
  }
}

async function main() {
  loadEnv(path.join(process.cwd(), ".env.local"));
  loadEnv(path.join(process.cwd(), ".env"));

  const args = parseArgs(process.argv.slice(2));
  const status = args.status;
  if (status !== "success" && status !== "failure") {
    throw new Error("--status must be success or failure.");
  }

  const baseUrl = args.url ?? process.env.BACKUP_REPORT_URL ?? process.env.APP_BASE_URL ?? process.env.AUTH_URL;
  const token = args.token ?? process.env.BACKUP_REPORT_TOKEN;
  if (!baseUrl) throw new Error("Set BACKUP_REPORT_URL, APP_BASE_URL, AUTH_URL, or pass --url.");
  if (!token) throw new Error("Set BACKUP_REPORT_TOKEN or pass --token.");

  const payload = {
    status,
    startedAt: args.startedAt ?? null,
    completedAt: args.completedAt ?? new Date().toISOString(),
    retentionDays: args.retentionDays ? Number(args.retentionDays) : 14,
    details: {
      job: args.job ?? "postgres-backup",
      location: args.location ?? null,
      ...parseDetails(args.details),
    },
  };

  const endpoint = new URL("/api/admin/monitoring/backup-runs", baseUrl);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Backup report failed: ${response.status} ${body}`);
  }

  console.log(body || JSON.stringify({ ok: true }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
