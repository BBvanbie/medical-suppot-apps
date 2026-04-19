/* eslint-disable @typescript-eslint/no-require-imports */
const { spawnSync } = require("child_process");
const path = require("path");

function main() {
  const migrateScript = path.join(__dirname, "db_migrate.js");
  const result = spawnSync(process.execPath, [migrateScript], {
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error("Failed while applying schema migrations");
  }

  console.log("[bootstrap_schema] completed");
}

main();
