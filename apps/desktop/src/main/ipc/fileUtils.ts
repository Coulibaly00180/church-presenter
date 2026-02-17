import { extname, resolve, sep } from "path";
import type { CpLibraryFileKind, CpMediaType } from "../../shared/ipc";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);
const PDF_EXTENSIONS = new Set([".pdf"]);
const DOCUMENT_EXTENSIONS = new Set([".doc", ".docx", ".odt", ".rtf", ".txt"]);

const MIME_BY_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".odt": "application/vnd.oasis.opendocument.text",
  ".rtf": "application/rtf",
  ".txt": "text/plain",
};

export function inferMediaType(filePath: string): CpMediaType | null {
  const ext = extname(filePath).toLowerCase();
  if (PDF_EXTENSIONS.has(ext)) return "PDF";
  if (IMAGE_EXTENSIONS.has(ext)) return "IMAGE";
  return null;
}

export function inferLibraryFileKind(filePath: string): CpLibraryFileKind | null {
  const ext = extname(filePath).toLowerCase();
  if (PDF_EXTENSIONS.has(ext)) return "PDF";
  if (IMAGE_EXTENSIONS.has(ext)) return "IMAGE";
  if (DOCUMENT_EXTENSIONS.has(ext)) return "DOCUMENT";
  return null;
}

export function inferMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
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
