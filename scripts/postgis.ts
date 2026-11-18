import { PrismaClient } from "@prisma/client";
import { applyPostgis } from "./lib/postgis";

const prisma = new PrismaClient();
applyPostgis(prisma)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
