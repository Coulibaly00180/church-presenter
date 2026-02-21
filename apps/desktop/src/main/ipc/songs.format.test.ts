import { describe, expect, it } from "vitest";

import { migrateSongsJsonPayload, normalizeSongFromJson, parseSongText } from "./songs";

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

  it("parses section headings even without blank lines", () => {
    const parsed = parseSongText(
      [
        "Titre: Test heading",
        "Paroles:",
        "Couplet 1",
        "Ligne A",
        "Ligne B",
        "Refrain",
        "Alleluia alleluia",
        "Pont",
        "Je te loue",
      ].join("\n"),
      "heading.docx",
    );

    expect(parsed.blocks).toHaveLength(3);
    expect(parsed.blocks[0]).toMatchObject({ type: "VERSE", title: "Couplet 1" });
    expect(parsed.blocks[1]).toMatchObject({ type: "CHORUS", title: "Refrain" });
    expect(parsed.blocks[2]).toMatchObject({ type: "BRIDGE", title: "Pont" });
  });

  it("infers a repeated chorus when lyrics have no explicit separators", () => {
    const parsed = parseSongText(
      [
        "Titre: Repetition",
        "Paroles:",
        "Mon Dieu est grand",
        "Je chante sa bonté",
        "Yahwe tu regnes",
        "Yahwe tu sauves",
        "Quand je doute tu es la",
        "Ta paix m'accompagne",
        "Yahwe tu regnes",
        "Yahwe tu sauves",
      ].join("\n"),
      "repeat.docx",
    );

    expect(parsed.blocks.length).toBeGreaterThan(1);
    expect(parsed.blocks.some((b) => b.type === "CHORUS")).toBe(true);
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

describe("songs JSON content mapping", () => {
  it("supports single-song meta/paroles format", () => {
    const normalized = normalizeSongFromJson(
      {
        meta: {
          titre: "Maintenant je vis (This Is Living) [French cover]",
          auteur: "Mirella, Steven & Kanto (cover) \u00E2\u20AC\u201D original : Hillsong Young & Free",
          annee_de_parution: "2018",
          album: "Cover (single/video) \u00E2\u20AC\u201D original : This Is Living - EP",
        },
        paroles:
          "Je m\u00E2\u20AC\u2122\u00C3\u00A9veille car je sais qu\u00E2\u20AC\u2122avec Toi\nTous mes r\u00C3\u00AAves ont un sens\n\nMaintenant je vis",
      },
      0,
      "maintenant_je_vis.json",
    );

    expect(normalized.ok).toBe(true);
    if (!normalized.ok) return;
    expect(normalized.song.title).toContain("Maintenant je vis");
    expect(normalized.song.artist).toContain("Hillsong Young & Free");
    expect(normalized.song.year).toBe("2018");
    expect(normalized.song.blocks).toHaveLength(2);
    expect(normalized.song.blocks[0]?.content).toContain("Je m\u2019\u00E9veille");
    expect(normalized.song.blocks[0]?.content).not.toMatch(/\u00C3|\u00E2\u20AC/);
  });

  it("repairs mojibake values while importing JSON", () => {
    const artist = "Mirella \u2014 Hillsong";
    const lyric = "Je m\u2019eveille car je sais qu\u2019avec Toi";
    const mojibakeArtist = Buffer.from(artist, "utf8").toString("latin1");
    const mojibakeLyric = Buffer.from(lyric, "utf8").toString("latin1");

    const normalized = normalizeSongFromJson(
      {
        meta: {
          titre: "Maintenant je vis",
          auteur: mojibakeArtist,
          annee_de_parution: "2018",
        },
        paroles: mojibakeLyric,
      },
      0,
      "maintenant_je_vis.json",
    );

    expect(normalized.ok).toBe(true);
    if (!normalized.ok) return;
    expect(normalized.song.artist).toBe(artist);
    expect(normalized.song.blocks[0]?.content).toContain(lyric);
  });

  it("supports explicit blocks format as robust JSON contract", () => {
    const normalized = normalizeSongFromJson(
      {
        meta: {
          titre: "Format blocks",
          auteur: "Equipe",
          annee_de_parution: "2025",
        },
        blocks: [
          { type: "VERSE", title: "Couplet 1", content: "Ligne 1\nLigne 2" },
          { type: "CHORUS", title: "Refrain", content: "Alleluia" },
        ],
      },
      0,
      "format_blocks.json",
    );

    expect(normalized.ok).toBe(true);
    if (!normalized.ok) return;
    expect(normalized.song.title).toBe("Format blocks");
    expect(normalized.song.blocks).toHaveLength(2);
    expect(normalized.song.blocks[1]).toMatchObject({ type: "CHORUS", title: "Refrain" });
  });
});
