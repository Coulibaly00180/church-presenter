import { describe, expect, it } from "vitest";
import { inferMediaType, isPathInDir, getErrorMessage } from "./fileUtils";

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

  it("returns null for unsupported extensions", () => {
    expect(inferMediaType("video.mp4")).toBeNull();
    expect(inferMediaType("file.txt")).toBeNull();
    expect(inferMediaType("archive.zip")).toBeNull();
    expect(inferMediaType("noext")).toBeNull();
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
