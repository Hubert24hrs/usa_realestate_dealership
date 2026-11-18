/**
 * Rebuilds the Typesense "listings" collection from PostgreSQL.
 *   SEARCH_PROVIDER=typesense TYPESENSE_HOST=… TYPESENSE_API_KEY=… npm run search:sync
 */
import { PrismaClient } from "@prisma/client";
import Typesense from "typesense";
import { TYPESENSE_COLLECTION, toTypesenseDocument, typesenseSchema, typesenseSourceSelect } from "../src/server/search/typesense-schema";

async function main() {
  if (!process.env.TYPESENSE_HOST || !process.env.TYPESENSE_API_KEY) {
    console.error("Set TYPESENSE_HOST and TYPESENSE_API_KEY (admin key) in .env.local first.");
    process.exit(1);
  }
  const client = new Typesense.Client({
    nodes: [{ host: process.env.TYPESENSE_HOST, port: Number(process.env.TYPESENSE_PORT ?? 443), protocol: process.env.TYPESENSE_PROTOCOL ?? "https" }],
    apiKey: process.env.TYPESENSE_API_KEY,
    connectionTimeoutSeconds: 10,
  });
  const prisma = new PrismaClient();
  try {
    await client.collections(TYPESENSE_COLLECTION).delete().catch(() => undefined);
    // Cast: the schema literal is readonly; the client's CollectionCreateSchema type is mutable.
    await client.collections().create(typesenseSchema as never);
    const listings = await prisma.listing.findMany({ where: { status: { not: "DRAFT" } }, select: typesenseSourceSelect });
    const docs = listings.map(toTypesenseDocument);
    const results = await client.collections(TYPESENSE_COLLECTION).documents().import(docs, { action: "upsert" });
    const failed = results.filter((r) => !r.success);
    console.log(`Indexed ${docs.length - failed.length}/${docs.length} listings into Typesense.`);
    if (failed.length) console.error(failed.slice(0, 5));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
