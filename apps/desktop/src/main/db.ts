import { PrismaClient } from "@prisma/client";
import { app } from "electron";
import { access, copyFile, mkdir, readFile, readdir } from "fs/promises";
import { createHash, randomUUID } from "crypto";
import { dirname, join, resolve } from "path";

let prismaSingleton: PrismaClient | null = null;

function fileUrlFromPath(filePath: string) {
  return `file:${filePath.replace(/\\/g, "/")}`;
}

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return String(err);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function databasePathFromUrl(databaseUrl: string | undefined, cwd = process.cwd()): string | null {
  if (!databaseUrl || !databaseUrl.startsWith("file:")) return null;
  const raw = decodeURIComponent(databaseUrl.slice("file:".length).trim());
  if (!raw) return null;
  if (/^[A-Za-z]:[\\/]/.test(raw) || raw.startsWith("/")) return raw;
  return resolve(cwd, raw);
}

async function pathExists(pathToCheck: string) {
  try {
    await access(pathToCheck);
    return true;
  } catch {
    return false;
  }
}

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let buffer = "";

  for (const line of sql.replace(/\r\n/g, "\n").split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("--")) continue;
    buffer += `${line}\n`;
    if (trimmed.endsWith(";")) {
      const statement = buffer.trim();
      if (statement) statements.push(statement);
      buffer = "";
    }
  }

  const tail = buffer.trim();
  if (tail) statements.push(tail);
  return statements;
}

function isBenignMigrationError(err: unknown) {
  const msg = getErrorMessage(err).toLowerCase();
  return msg.includes("already exists") || msg.includes("duplicate column name");
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

export async function backupRuntimeDatabaseSnapshot(reason: string) {
  const dbPath = databasePathFromUrl(process.env["DATABASE_URL"]);
  if (!dbPath) return null;
  if (!(await pathExists(dbPath))) return null;

  const backupsDir = join(dirname(dbPath), "backups");
  await mkdir(backupsDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(backupsDir, `app.db.${reason}.${stamp}.bak`);
  await copyFile(dbPath, backupPath);
  return backupPath;
}

function getMigrationDirectory() {
  return join(app.getAppPath(), "prisma", "migrations");
}

type SafeMigrationSummary = {
  backupPath: string | null;
  appliedMigrations: string[];
  skippedMigrations: string[];
};

type PrismaMigrationRow = {
  migration_name?: unknown;
  finished_at?: unknown;
  rolled_back_at?: unknown;
};

async function ensurePrismaMigrationsTable(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "checksum" TEXT NOT NULL,
      "finished_at" DATETIME,
      "migration_name" TEXT NOT NULL,
      "logs" TEXT,
      "rolled_back_at" DATETIME,
      "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "applied_steps_count" INTEGER UNSIGNED NOT NULL DEFAULT 0
    );
  `);
}

async function getAppliedMigrationNames(prisma: PrismaClient) {
  const rows = await prisma.$queryRawUnsafe<PrismaMigrationRow[]>(
    `SELECT "migration_name", "finished_at", "rolled_back_at" FROM "_prisma_migrations"`
  );
  const names = new Set<string>();

  for (const row of rows) {
    if (!isRecord(row)) continue;
    const name = typeof row.migration_name === "string" ? row.migration_name : null;
    if (!name) continue;
    const finishedAt = row.finished_at;
    const rolledBackAt = row.rolled_back_at;
    if (finishedAt && !rolledBackAt) names.add(name);
  }
  return names;
}

async function applySingleMigration(prisma: PrismaClient, migrationName: string, sql: string) {
  const statements = splitSqlStatements(sql);
  const id = randomUUID();
  const checksum = createHash("sha256").update(sql).digest("hex");

  await prisma.$executeRawUnsafe(
    `DELETE FROM "_prisma_migrations" WHERE "migration_name" = ? AND "finished_at" IS NULL`,
    migrationName
  );
  await prisma.$executeRawUnsafe(
    `INSERT INTO "_prisma_migrations" ("id", "checksum", "migration_name", "started_at", "applied_steps_count")
     VALUES (?, ?, ?, ?, 0)`,
    id,
    checksum,
    migrationName,
    new Date().toISOString()
  );

  let appliedSteps = 0;
  try {
    for (const statement of statements) {
      try {
        await prisma.$executeRawUnsafe(statement);
      } catch (err) {
        if (!isBenignMigrationError(err)) {
          throw err;
        }
      }
      appliedSteps += 1;
    }

    await prisma.$executeRawUnsafe(
      `UPDATE "_prisma_migrations"
       SET "finished_at" = ?, "applied_steps_count" = ?, "logs" = NULL
       WHERE "id" = ?`,
      new Date().toISOString(),
      appliedSteps,
      id
    );
  } catch (err) {
    await prisma.$executeRawUnsafe(
      `UPDATE "_prisma_migrations" SET "logs" = ? WHERE "id" = ?`,
      getErrorMessage(err),
      id
    );
    throw err;
  }
}

export async function runSafeMigrationForPackagedRuntime(): Promise<SafeMigrationSummary> {
  if (!app.isPackaged) {
    return { backupPath: null, appliedMigrations: [], skippedMigrations: [] };
  }

  const migrationDir = getMigrationDirectory();
  const entries = await readdir(migrationDir);
  const migrations = entries.filter((entry) => /^\d+_/.test(entry)).sort((a, b) => a.localeCompare(b));

  const backupPath = await backupRuntimeDatabaseSnapshot("before-migrate");
  const prisma = getPrisma();
  await ensurePrismaMigrationsTable(prisma);
  const appliedSet = await getAppliedMigrationNames(prisma);

  const appliedMigrations: string[] = [];
  const skippedMigrations: string[] = [];

  for (const migration of migrations) {
    if (appliedSet.has(migration)) {
      skippedMigrations.push(migration);
      continue;
    }
    const sqlPath = join(migrationDir, migration, "migration.sql");
    const sql = await readFile(sqlPath, "utf-8");
    await applySingleMigration(prisma, migration, sql);
    appliedMigrations.push(migration);
  }

  return { backupPath, appliedMigrations, skippedMigrations };
}

export function getPrisma(): PrismaClient {
  if (prismaSingleton) return prismaSingleton;
  prismaSingleton = new PrismaClient();
  return prismaSingleton;
}
