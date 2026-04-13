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

function hasValue(key) {
  return Boolean(String(process.env[key] ?? "").trim());
}

function maskUrlHost(raw) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "invalid-url";
  }
}

async function probeHealth(baseUrl) {
  if (!baseUrl) return { status: "skipped", reason: "APP_BASE_URL/BACKUP_REPORT_URL/AUTH_URL is not set" };
  const endpoint = new URL("/api/health", baseUrl);
  const response = await fetch(endpoint, { cache: "no-store" });
  const body = await response.json().catch(() => null);
  return {
    status: response.ok ? "ok" : "error",
    httpStatus: response.status,
    healthStatus: body?.status ?? null,
    db: body?.checks?.db ?? null,
    failSafe: body?.failSafe?.status ?? null,
  };
}

async function main() {
  loadEnv(path.join(process.cwd(), ".env.local"));
  loadEnv(path.join(process.cwd(), ".env"));

  const baseUrl = process.env.BACKUP_REPORT_URL ?? process.env.APP_BASE_URL ?? process.env.AUTH_URL ?? "";
  const required = ["DATABASE_URL", "DIRECT_URL", "BACKUP_REPORT_TOKEN"];
  const optional = ["APP_BASE_URL", "BACKUP_REPORT_URL", "AUTH_URL"];
  const missingRequired = required.filter((key) => !hasValue(key));

  const report = {
    required: Object.fromEntries(required.map((key) => [key, hasValue(key) ? "set" : "missing"])),
    optional: Object.fromEntries(optional.map((key) => [key, hasValue(key) ? "set" : "missing"])),
    databaseHost: maskUrlHost(process.env.DATABASE_URL),
    directHost: maskUrlHost(process.env.DIRECT_URL),
    reportBaseHost: maskUrlHost(baseUrl),
    healthProbe: await probeHealth(baseUrl).catch((error) => ({
      status: "error",
      message: error instanceof Error ? error.message : String(error),
    })),
    ok: missingRequired.length === 0,
    missingRequired,
  };

  console.log(JSON.stringify(report, null, 2));
  if (missingRequired.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
