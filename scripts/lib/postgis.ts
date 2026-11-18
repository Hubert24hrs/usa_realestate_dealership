import fs from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";

/** Split a SQL script into statements, respecting $$-quoted function bodies. */
export function splitSql(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inDollar = false;
  const lines = sql.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!inDollar && (trimmed.startsWith("--") || trimmed === "")) continue;
    current += `${line}\n`;
    const dollarCount = (line.match(/\$\$/g) ?? []).length;
    if (dollarCount % 2 === 1) inDollar = !inDollar;
    if (!inDollar && trimmed.endsWith(";")) {
      statements.push(current.trim());
      current = "";
    }
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

export async function postgisAvailable(prisma: PrismaClient): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    "SELECT name FROM pg_available_extensions WHERE name = 'postgis'",
  );
  return rows.length > 0;
}

/** Applies prisma/sql/postgis.sql when the server offers PostGIS. Returns whether it was applied. */
export async function applyPostgis(prisma: PrismaClient, log: (m: string) => void = console.log): Promise<boolean> {
  if (!(await postgisAvailable(prisma))) {
    log("PostGIS not available on this server — spatial queries will use the lat/lng fallback.");
    return false;
  }
  const sql = fs.readFileSync(path.resolve("prisma/sql/postgis.sql"), "utf8");
  for (const statement of splitSql(sql)) await prisma.$executeRawUnsafe(statement);
  log("PostGIS layer applied (geo.listing_location + GiST index + sync trigger).");
  return true;
}
