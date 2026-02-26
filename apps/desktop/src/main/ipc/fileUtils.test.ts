import { describe, expect, it } from "vitest";
import {
  getErrorMessage,
  inferFontFamilyFromPath,
  inferLibraryFileKind,
  inferMediaType,
  isFontPath,
  isPathInDir,
  validateFontHeader,
} from "./fileUtils";

describe("inferMediaType", () => {
  it("returns IMAGE for common image extensions", () => {
    expect(inferMediaType("photo.png")).toBe("IMAGE");
    expect(inferMediaType("photo.PNG")).toBe("IMAGE");
    expect(inferMediaType("photo.jpg")).toBe("IMAGE");
    expect(inferMediaType("photo.jpeg")).toBe("IMAGE");
    expect(inferMediaType("photo.gif")).toBe("IMAGE");
    expect(inferMediaType("photo.webp")).toBe("IMAGE");
  });

  it("returns PDF for .pdf extension", () => {
    expect(inferMediaType("doc.pdf")).toBe("PDF");
    expect(inferMediaType("doc.PDF")).toBe("PDF");
  });

  it("returns VIDEO for video extensions", () => {
    expect(inferMediaType("video.mp4")).toBe("VIDEO");
    expect(inferMediaType("clip.webm")).toBe("VIDEO");
    expect(inferMediaType("clip.MOV")).toBe("VIDEO");
  });

  it("returns null for unsupported extensions", () => {
    expect(inferMediaType("file.txt")).toBeNull();
    expect(inferMediaType("archive.zip")).toBeNull();
    expect(inferMediaType("noext")).toBeNull();
  });
});

describe("inferLibraryFileKind", () => {
  it("detects supported library kinds", () => {
    expect(inferLibraryFileKind("slide.png")).toBe("IMAGE");
    expect(inferLibraryFileKind("document.pdf")).toBe("PDF");
    expect(inferLibraryFileKind("notes.docx")).toBe("DOCUMENT");
    expect(inferLibraryFileKind("font.otf")).toBe("FONT");
  });

  it("returns null for unknown extension", () => {
    expect(inferLibraryFileKind("archive.7z")).toBeNull();
  });
});

describe("font helpers", () => {
  it("detects font paths case-insensitively", () => {
    expect(isFontPath("MyFont.ttf")).toBe(true);
    expect(isFontPath("MyFont.OTF")).toBe(true);
    expect(isFontPath("MyFont.woff2")).toBe(false);
  });

  it("infers font family from file name and fallback", () => {
    expect(inferFontFamilyFromPath("C:\\fonts\\Open Sans.ttf")).toBe("Open Sans");
    expect(inferFontFamilyFromPath("/fonts/Roboto.otf")).toBe("Roboto");
    expect(inferFontFamilyFromPath("/fonts/.ttf")).toBe("CustomFont");
  });

  it("validates known TrueType/OpenType signatures", () => {
    expect(validateFontHeader(new Uint8Array([0x00, 0x01, 0x00, 0x00]))).toEqual({ valid: true });
    expect(validateFontHeader(new Uint8Array([0x4f, 0x54, 0x54, 0x4f]))).toEqual({ valid: true }); // OTTO
    expect(validateFontHeader(new Uint8Array([0x74, 0x72, 0x75, 0x65]))).toEqual({ valid: true }); // true
    expect(validateFontHeader(new Uint8Array([0x74, 0x79, 0x70, 0x31]))).toEqual({ valid: true }); // typ1
  });

  it("rejects invalid or too-short headers", () => {
    expect(validateFontHeader(new Uint8Array([0x00, 0x00, 0x00]))).toEqual({
      valid: false,
      reason: "Font file too short",
    });
    expect(validateFontHeader(new Uint8Array([0xde, 0xad, 0xbe, 0xef]))).toEqual({
      valid: false,
      reason: "Unsupported or corrupted font header",
    });
  });
});

describe("isPathInDir", () => {
  it("returns true for a file inside the directory", () => {
    expect(isPathInDir("/media", "/media/photo.png")).toBe(true);
  });

  it("returns true for a file in a subdirectory", () => {
    expect(isPathInDir("/media", "/media/sub/photo.png")).toBe(true);
  });

  it("returns false for a file outside the directory", () => {
    expect(isPathInDir("/media", "/etc/passwd")).toBe(false);
  });

  it("returns false for path traversal attempt", () => {
    expect(isPathInDir("/media", "/media/../etc/passwd")).toBe(false);
  });

  it("returns false for a sibling directory with similar prefix", () => {
    expect(isPathInDir("/media", "/media-backup/file.txt")).toBe(false);
  });
});

describe("getErrorMessage", () => {
  it("extracts message from Error instances", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("converts non-Error values to string", () => {
    expect(getErrorMessage("oops")).toBe("oops");
    expect(getErrorMessage(42)).toBe("42");
    expect(getErrorMessage(null)).toBe("null");
  });
});
