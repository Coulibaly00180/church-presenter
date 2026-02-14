import { access, copyFile, mkdir } from "fs/promises";
import { dirname, join, resolve } from "path";
import { spawn } from "child_process";

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
  const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(npxCmd, ["prisma", "migrate", "deploy"], {
      stdio: "inherit",
      cwd: process.cwd(),
      env: process.env,
    });
    child.on("error", rejectPromise);
    child.on("exit", (code) => {
      if (code === 0) resolvePromise();
      else rejectPromise(new Error(`prisma migrate deploy failed with exit code ${code}`));
    });
  });
}

async function main() {
  const backupPath = await backupIfNeeded();
  if (backupPath) {
    console.log(`Backup database created: ${backupPath}`);
  } else {
    console.log("No local SQLite database found to backup.");
  }
  await runPrismaMigrateDeploy();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
