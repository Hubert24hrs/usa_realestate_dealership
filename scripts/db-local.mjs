#!/usr/bin/env node
/**
 * Project-local PostgreSQL for development (no Docker / admin rights needed).
 * Uses the `embedded-postgres` package, which ships official PostgreSQL binaries.
 * Data lives in ./.data/postgres (git-ignored).
 *
 *   npm run db:start   → starts the server and keeps it running (Ctrl+C to stop)
 *
 * Connection string: postgresql://citiview:citiview@localhost:54329/citiview
 * PostGIS is not bundled; spatial queries fall back to lat/lng math locally.
 */
import EmbeddedPostgres from "embedded-postgres";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve(".data/postgres");
const port = Number(process.env.LOCAL_PG_PORT ?? 54329);

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "citiview",
  password: "citiview",
  port,
  persistent: true,
  // Windows clusters default to WIN1252; listings need full UTF-8.
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  onLog: () => {},
  onError: (message) => {
    const text = String(message ?? "");
    if (text.trim()) console.error("[postgres]", text.trim());
  },
});

async function main() {
  const initialised = fs.existsSync(path.join(dataDir, "PG_VERSION"));
  if (!initialised) {
    console.log("Initialising local PostgreSQL cluster in .data/postgres …");
    await pg.initialise();
  }
  await pg.start();
  const client = pg.getPgClient("postgres");
  await client.connect();
  try {
    const { rows } = await client.query(
      "SELECT pg_encoding_to_char(encoding) AS enc FROM pg_database WHERE datname = 'citiview'",
    );
    if (rows[0] && rows[0].enc !== "UTF8") {
      console.log(`Database 'citiview' uses ${rows[0].enc}; recreating it as UTF8 (dev data is re-seeded).`);
      await client.query("DROP DATABASE citiview WITH (FORCE)");
      rows.length = 0;
    }
    if (!rows[0]) {
      await client.query(
        "CREATE DATABASE citiview WITH ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C' TEMPLATE template0",
      );
      console.log("Created UTF8 database 'citiview'.");
    }
  } finally {
    await client.end();
  }
  console.log(`Local Postgres ready → postgresql://citiview:citiview@localhost:${port}/citiview`);

  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    console.log("\nStopping local Postgres …");
    await pg.stop().catch(() => {});
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("SIGBREAK", shutdown);
  setInterval(() => {}, 1 << 30);
}

main().catch(async (error) => {
  console.error(error);
  await pg.stop().catch(() => {});
  process.exit(1);
});
