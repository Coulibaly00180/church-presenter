import { describe, expect, it } from "vitest";
import {
  parseDataImportPayload,
  parseLiveSetPayload,
  parsePlanReorderPayload,
  parseProjectionSetMediaPayload,
  parseProjectionStatePatch,
  parseScreenMirrorMode,
  parseSongCreatePayload,
} from "./runtimeValidation";

describe("runtime validation", () => {
  it("parses songs:create payload with optional metadata", () => {
    expect(parseSongCreatePayload({ title: "  Alpha  ", artist: "  Beta " })).toEqual({
      title: "Alpha",
      artist: "Beta",
      album: undefined,
    });
  });

  it("rejects invalid songs:create payload", () => {
    expect(() => parseSongCreatePayload(null)).toThrow("Invalid payload");
    expect(() => parseSongCreatePayload({ title: "" })).toThrow("must not be empty");
  });

  it("validates plans:reorder ids", () => {
    expect(parsePlanReorderPayload({ planId: "p1", orderedItemIds: ["a", "b"] })).toEqual({
      planId: "p1",
      orderedItemIds: ["a", "b"],
    });
    expect(() => parsePlanReorderPayload({ planId: "p1", orderedItemIds: "bad" })).toThrow("must be an array");
  });

  it("validates projection media payload", () => {
    expect(parseProjectionSetMediaPayload({ title: "Slide", mediaPath: "/tmp/a.pdf", mediaType: "PDF" })).toEqual({
      title: "Slide",
      mediaPath: "/tmp/a.pdf",
      mediaType: "PDF",
    });
    expect(() => parseProjectionSetMediaPayload({ mediaPath: "/tmp/a.pdf", mediaType: "VIDEO" })).toThrow(
      "must be one of"
    );
  });

  it("validates screen mirror payload", () => {
    expect(parseScreenMirrorMode({ kind: "FREE" })).toEqual({ kind: "FREE" });
    expect(parseScreenMirrorMode({ kind: "MIRROR", from: "A" })).toEqual({ kind: "MIRROR", from: "A" });
    expect(() => parseScreenMirrorMode({ kind: "MIRROR", from: "Z" })).toThrow("must be one of");
  });

  it("validates live:set payload", () => {
    expect(parseLiveSetPayload({ enabled: true, target: "B", cursor: 2, planId: null })).toEqual({
      enabled: true,
      target: "B",
      cursor: 2,
      planId: null,
    });
    expect(() => parseLiveSetPayload({ cursor: 2.4 })).toThrow("must be an integer");
  });

  it("defaults data import mode to MERGE", () => {
    expect(parseDataImportPayload(undefined)).toEqual({ mode: "MERGE" });
    expect(parseDataImportPayload({})).toEqual({ mode: "MERGE" });
    expect(() => parseDataImportPayload({ mode: "INVALID" })).toThrow("must be one of");
  });

  it("sanitizes projection state patch", () => {
    expect(
      parseProjectionStatePatch({
        mode: "BLACK",
        textScale: 1.2,
        current: { kind: "TEXT", body: "Hello" },
      })
    ).toEqual({
      mode: "BLACK",
      textScale: 1.2,
      current: { kind: "TEXT", title: undefined, body: "Hello", mediaPath: undefined, mediaType: undefined, metaSong: undefined },
    });
    expect(() => parseProjectionStatePatch({ current: { kind: "NOPE" } })).toThrow("must be one of");
  });
});
