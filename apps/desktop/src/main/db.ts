import { PrismaClient } from "@prisma/client";
import { app } from "electron";
import { mkdir } from "fs/promises";
import { dirname, join } from "path";

let prismaSingleton: PrismaClient | null = null;

function fileUrlFromPath(filePath: string) {
  return `file:${filePath.replace(/\\/g, "/")}`;
}

export async function ensureRuntimeDatabaseUrl() {
  const envUrl = process.env["DATABASE_URL"]?.trim();
  if (envUrl) return envUrl;

  if (app.isPackaged) {
    const dbPath = join(app.getPath("userData"), "app.db");
    await mkdir(dirname(dbPath), { recursive: true });
    const url = fileUrlFromPath(dbPath);
    process.env["DATABASE_URL"] = url;
    return url;
  }

  const devUrl = "file:../data/app.db";
  process.env["DATABASE_URL"] = devUrl;
  return devUrl;
}

export function getPrisma(): PrismaClient {
  if (prismaSingleton) return prismaSingleton;
  prismaSingleton = new PrismaClient();
  return prismaSingleton;
}
