#!/usr/bin/env node

import { spawn } from "node:child_process";
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
  const separatorIndex = argv.indexOf("--");
  const optionTokens = separatorIndex >= 0 ? argv.slice(0, separatorIndex) : argv;
  const commandTokens = separatorIndex >= 0 ? argv.slice(separatorIndex + 1) : [];
  const args = {};

  for (let index = 0; index < optionTokens.length; index += 1) {
    const token = optionTokens[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = optionTokens[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = "true";
    } else {
      args[key] = next;
      index += 1;
    }
  }

  return { args, commandTokens };
}

function runCommand(commandTokens) {
  return new Promise((resolve) => {
    const [command, ...args] = commandTokens;
    const child = spawn(command, args, { stdio: "inherit", shell: false });
    child.on("error", (error) => resolve({ code: 1, signal: null, error }));
    child.on("close", (code, signal) => resolve({ code: code ?? 1, signal, error: null }));
  });
}

async function reportBackupRun(input) {
  const baseUrl = input.args.url ?? process.env.BACKUP_REPORT_URL ?? process.env.APP_BASE_URL ?? process.env.AUTH_URL;
  const token = input.args.token ?? process.env.BACKUP_REPORT_TOKEN;
  if (!baseUrl) throw new Error("Set BACKUP_REPORT_URL, APP_BASE_URL, AUTH_URL, or pass --url.");
  if (!token) throw new Error("Set BACKUP_REPORT_TOKEN or pass --token.");

  const endpoint = new URL("/api/admin/monitoring/backup-runs", baseUrl);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      status: input.status,
      startedAt: input.startedAt,
      completedAt: input.completedAt,
      retentionDays: input.args.retentionDays ? Number(input.args.retentionDays) : 14,
      details: {
        job: input.args.job ?? "postgres-backup",
        location: input.args.location ?? null,
        command: input.commandLabel,
        durationMs: input.durationMs,
        exitCode: input.result.code,
        signal: input.result.signal,
        error: input.result.error instanceof Error ? input.result.error.message : null,
      },
    }),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Backup report failed: ${response.status} ${body}`);
  }
  console.log(body || JSON.stringify({ ok: true }));
}

async function main() {
  loadEnv(path.join(process.cwd(), ".env.local"));
  loadEnv(path.join(process.cwd(), ".env"));

  const { args, commandTokens } = parseArgs(process.argv.slice(2));
  if (commandTokens.length === 0) {
    throw new Error("Provide a backup command after --. Example: npm run backup:job -- --job postgres-noon-backup -- pg_dump --version");
  }

  const startedAt = new Date();
  const result = await runCommand(commandTokens);
  const completedAt = new Date();
  const status = result.code === 0 ? "success" : "failure";

  await reportBackupRun({
    args,
    status,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    durationMs: completedAt.getTime() - startedAt.getTime(),
    commandLabel: commandTokens[0],
    result,
  });

  process.exit(result.code);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
