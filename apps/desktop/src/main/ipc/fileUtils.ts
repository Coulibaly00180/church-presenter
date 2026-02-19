import { extname, resolve, sep } from "path";
import type { CpLibraryFileKind, CpMediaType } from "../../shared/ipc";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);
const PDF_EXTENSIONS = new Set([".pdf"]);
const DOCUMENT_EXTENSIONS = new Set([".doc", ".docx", ".odt", ".rtf", ".txt"]);
const FONT_EXTENSIONS = new Set([".ttf", ".otf"]);

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
  ".ttf": "font/ttf",
  ".otf": "font/otf",
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
  if (FONT_EXTENSIONS.has(ext)) return "FONT";
  return null;
}

export function inferMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

export function isFontPath(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return FONT_EXTENSIONS.has(ext);
}

export function inferFontFamilyFromPath(filePath: string): string {
  // Handle both POSIX and Windows separators regardless of host OS.
  const fileName = filePath.split(/[\\/]/).pop() ?? "";
  const name = fileName.replace(/\.(ttf|otf)$/i, "").trim();
  return name || "CustomFont";
}

export function validateFontHeader(data: Uint8Array): { valid: boolean; reason?: string } {
  if (!data || data.length < 4) {
    return { valid: false, reason: "Font file too short" };
  }
  const b0 = data[0];
  const b1 = data[1];
  const b2 = data[2];
  const b3 = data[3];
  const tag = String.fromCharCode(b0, b1, b2, b3);

  const isTrueTypeV1 = b0 === 0x00 && b1 === 0x01 && b2 === 0x00 && b3 === 0x00;
  const isOpenType = tag === "OTTO";
  const isAppleTrueType = tag === "true";
  const isType1 = tag === "typ1";

  if (isTrueTypeV1 || isOpenType || isAppleTrueType || isType1) {
    return { valid: true };
  }

  return { valid: false, reason: "Unsupported or corrupted font header" };
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
