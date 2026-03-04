import { constants as fsConstants } from "fs";
import { access, mkdir, readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import type { CpDiagnosticsFolderState, CpMediaFile } from "../shared/ipc";
import {
  inferLibraryFileKind,
  isFontPath,
  inferFontFamilyFromPath,
  getErrorMessage,
  validateFontHeader,
} from "./ipc/fileUtils";

export type LibraryDirs = {
  rootDir: string;
  imagesDir: string;
  documentsDir: string;
  fontsDir: string;
  videosDir: string;
  songsJsonDir: string;
};

export function buildLibraryDirs(rootDir: string): LibraryDirs {
  return {
    rootDir,
    imagesDir: join(rootDir, "images"),
    documentsDir: join(rootDir, "documents"),
    fontsDir: join(rootDir, "fonts"),
    videosDir: join(rootDir, "videos"),
    songsJsonDir: join(rootDir, "songs"),
  };
}

export async function ensureLibraryDirs(rootDir: string): Promise<LibraryDirs> {
  const dirs = buildLibraryDirs(rootDir);
  await mkdir(dirs.rootDir, { recursive: true });
  await mkdir(dirs.imagesDir, { recursive: true });
  await mkdir(dirs.documentsDir, { recursive: true });
  await mkdir(dirs.fontsDir, { recursive: true });
  await mkdir(dirs.videosDir, { recursive: true });
  await mkdir(dirs.songsJsonDir, { recursive: true });
  return dirs;
}

export async function getFolderDiagnostics(path: string, pathExists: (p: string) => Promise<boolean>): Promise<CpDiagnosticsFolderState> {
  const exists = await pathExists(path);
  if (!exists) {
    return {
      path,
      exists: false,
      readable: false,
      writable: false,
      fileCount: 0,
      error: "Folder not found",
    };
  }

  let readable = true;
  let writable = true;
  let fileCount = 0;
  let error: string | undefined;

  try {
    await access(path, fsConstants.R_OK);
  } catch {
    readable = false;
  }
  try {
    await access(path, fsConstants.W_OK);
  } catch {
    writable = false;
  }
  try {
    const entries = await readdir(path);
    fileCount = entries.length;
  } catch (e: unknown) {
    error = getErrorMessage(e);
  }

  return { path, exists: true, readable, writable, fileCount, error };
}

export async function validateFontFilePath(filePath: string, pathExists: (p: string) => Promise<boolean>): Promise<{ valid: boolean; reason?: string; family?: string }> {
  if (!isFontPath(filePath)) {
    return { valid: false, reason: "Unsupported font extension" };
  }
  if (!(await pathExists(filePath))) {
    return { valid: false, reason: "Font file not found" };
  }
  try {
    const data = await readFile(filePath);
    const validation = validateFontHeader(data.subarray(0, 4));
    if (!validation.valid) return { valid: false, reason: validation.reason };
    return { valid: true, family: inferFontFamilyFromPath(filePath) };
  } catch (e: unknown) {
    return { valid: false, reason: getErrorMessage(e) };
  }
}

export async function listLibraryFilesInDir(dirPath: string, folder: "images" | "documents" | "fonts" | "videos" | "root", pathExists: (p: string) => Promise<boolean>): Promise<CpMediaFile[]> {
  if (!(await pathExists(dirPath))) return [];
  const entries = await readdir(dirPath);
  const filesRaw = await Promise.all(
    entries.map(async (name): Promise<CpMediaFile | null> => {
      const full = join(dirPath, name);
      const st = await stat(full);
      if (!st.isFile()) return null;
      const kind = inferLibraryFileKind(name);
      if (!kind) return null;
      return { name, path: full, kind, folder };
    })
  );
  return filesRaw.filter((x): x is CpMediaFile => !!x);
}
