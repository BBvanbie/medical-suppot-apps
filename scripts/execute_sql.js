/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

function readDatabaseUrl() {
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

async function main() {
  const sqlFile = process.argv[2];
  if (!sqlFile) {
    throw new Error("SQL file path is required.");
  }

  const sql = fs.readFileSync(sqlFile, "utf8");
  const client = new Client({ connectionString: readDatabaseUrl() });

  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
