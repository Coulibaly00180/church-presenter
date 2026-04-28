import { PrismaClient } from "@prisma/pg-client";

let pgSingleton: PrismaClient | null = null;

export function getPgClient(): PrismaClient {
  if (!pgSingleton) {
    pgSingleton = new PrismaClient({
      datasources: { db: { url: process.env["DATABASE_URL_PG"] } },
    });
  }
  return pgSingleton;
}

export async function checkDbConnection(): Promise<boolean> {
  try {
    await getPgClient().$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export async function disconnectPgClient(): Promise<void> {
  if (pgSingleton) {
    await pgSingleton.$disconnect();
    pgSingleton = null;
  }
}
