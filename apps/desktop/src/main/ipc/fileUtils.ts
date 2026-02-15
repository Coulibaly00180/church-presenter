import { extname, resolve, sep } from "path";
import type { CpMediaType } from "../../shared/ipc";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);
const PDF_EXTENSIONS = new Set([".pdf"]);

export function inferMediaType(filePath: string): CpMediaType | null {
  const ext = extname(filePath).toLowerCase();
  if (PDF_EXTENSIONS.has(ext)) return "PDF";
  if (IMAGE_EXTENSIONS.has(ext)) return "IMAGE";
  return null;
}

export function isPathInDir(baseDir: string, candidatePath: string): boolean {
  const base = (resolve(baseDir) + sep).toLowerCase();
  const candidate = resolve(candidatePath).toLowerCase();
  return candidate.startsWith(base);
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
