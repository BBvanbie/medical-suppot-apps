/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const { Client } = require("pg");
const { readDatabaseUrl } = require("./db_url");

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
