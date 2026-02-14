import { access, copyFile, mkdir } from "fs/promises";
import { dirname, join, resolve } from "path";
import { spawn } from "child_process";
import { pathToFileURL } from "url";

const DEFAULT_DATABASE_URL = "file:../data/app.db";

function databasePathFromUrl(url, cwd) {
  if (!url.startsWith("file:")) return null;
  const raw = decodeURIComponent(url.slice("file:".length));
  if (!raw) return null;
  if (/^[A-Za-z]:[\\/]/.test(raw) || raw.startsWith("/")) return raw;
  return resolve(cwd, raw);
}

async function pathExists(pathToCheck) {
  try {
    await access(pathToCheck);
    return true;
  } catch {
    return false;
  }
}

async function backupIfNeeded() {
  const databaseUrl = process.env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL;
  const databasePath = databasePathFromUrl(databaseUrl, process.cwd());
  if (!databasePath) return null;
  if (!(await pathExists(databasePath))) return null;

  const backupsDir = join(dirname(databasePath), "backups");
  await mkdir(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(backupsDir, `app.db.before-migrate.${stamp}.bak`);
  await copyFile(databasePath, backupPath);
  return backupPath;
}

function runPrismaMigrateDeploy() {
  const command = "npx prisma migrate deploy";
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, [], {
      stdio: "inherit",
      cwd: process.cwd(),
      env: process.env,
      shell: true,
    });
    child.on("error", rejectPromise);
    child.on("exit", (code) => {
      if (code === 0) resolvePromise();
      else rejectPromise(new Error(`prisma migrate deploy failed with exit code ${code}`));
    });
  });
}

export async function runSafePrismaMigrate(options = {}) {
  const { cwd = process.cwd() } = options;
  const previousCwd = process.cwd();
  try {
    if (cwd && cwd !== previousCwd) {
      process.chdir(cwd);
    }
    const backupPath = await backupIfNeeded();
    if (backupPath) {
      console.log(`Backup database created: ${backupPath}`);
    } else {
      console.log("No local SQLite database found to backup.");
    }
    await runPrismaMigrateDeploy();
  } finally {
    if (process.cwd() !== previousCwd) {
      process.chdir(previousCwd);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSafePrismaMigrate().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
