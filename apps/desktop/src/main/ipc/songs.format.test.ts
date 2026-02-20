import { describe, expect, it } from "vitest";

import { migrateSongsJsonPayload, parseSongText } from "./songs";

describe("song import format parsing", () => {
  it("parses accented metadata labels and normalizes year", () => {
    const parsed = parseSongText(
      [
        "Titre : Mon Chant",
        "Auteur / Interprete :  Jean   Dupont  ",
        "Annee de parution : sortie 2021",
        "Album inclus dans : Album   X",
        "",
        "Paroles :",
        "Couplet 1: Ligne A",
        "Ligne B",
        "",
        "Refrain: Alleluia",
      ].join("\n"),
      "mon-chant.docx",
    );

    expect(parsed.title).toBe("Mon Chant");
    expect(parsed.artist).toBe("Jean Dupont");
    expect(parsed.album).toBe("Album X");
    expect(parsed.year).toBe("2021");
    expect(parsed.blocks).toHaveLength(2);
    expect(parsed.blocks[0]).toMatchObject({ type: "VERSE" });
    expect(parsed.blocks[1]).toMatchObject({ type: "CHORUS" });
  });

  it("falls back to filename when title is missing", () => {
    const parsed = parseSongText("Paroles:\nLigne 1", "grace.odt");
    expect(parsed.title).toBe("grace");
    expect(parsed.warnings.some((w) => w.includes("Titre absent"))).toBe(true);
  });
});

describe("songs JSON versioning", () => {
  it("accepts v2 schema envelope", () => {
    const migrated = migrateSongsJsonPayload({
      kind: "CHURCH_PRESENTER_SONGS_EXPORT",
      schemaVersion: 2,
      payload: { songs: [{ title: "A" }] },
    });

    expect(migrated.songs).toHaveLength(1);
    expect(migrated.warnings).toEqual([]);
  });

  it("migrates legacy schema without metadata", () => {
    const migrated = migrateSongsJsonPayload({ songs: [{ title: "A" }] });
    expect(migrated.songs).toHaveLength(1);
    expect(migrated.warnings.length).toBeGreaterThan(0);
  });

  it("rejects unknown future schema", () => {
    expect(() =>
      migrateSongsJsonPayload({
        kind: "CHURCH_PRESENTER_SONGS_EXPORT",
        schemaVersion: 99,
        payload: { songs: [] },
      }),
    ).toThrow("Unsupported songs schema version");
  });
});
