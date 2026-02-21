import { dialog, ipcMain } from "electron";
import type { Prisma } from "@prisma/client";
import { getPrisma } from "../db";
import { Document, Packer, Paragraph, TextRun } from "docx";
import mammoth from "mammoth";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import AdmZip from "adm-zip";
import type { CpSongImportDocError, CpSongImportJsonError, CpSongImportReportEntry } from "../../shared/ipc";
import {
  parseNonEmptyString,
  parseOptionalQuery,
  parseSongCreatePayload,
  parseSongExportWordPackPayload,
  parseSongReplaceBlocksPayload,
  parseSongUpdateMetaPayload,
} from "./runtimeValidation";

const SUPPORTED_DOC_EXTENSIONS = [".docx", ".odt"] as const;
const SONGS_JSON_KIND = "CHURCH_PRESENTER_SONGS_EXPORT" as const;
const SONGS_JSON_SCHEMA_VERSION = 2 as const;

type PrismaClientType = ReturnType<typeof getPrisma>;
type SongImportPrisma = Pick<PrismaClientType, "$transaction">;

type NormalizedImportSongBlock = { order: number; type: string; title?: string; content: string };
type NormalizedImportSong = {
  title: string;
  artist?: string;
  album?: string;
  year?: string;
  language?: string;
  tags?: string;
  blocks: NormalizedImportSongBlock[];
};

type ParsedSongTextResult = {
  title: string;
  artist?: string;
  album?: string;
  year?: string;
  language?: string;
  tags?: string;
  lyrics: string;
  blocks: NormalizedImportSongBlock[];
  warnings: string[];
};

type ImportedJsonEnvelope = {
  songs: unknown[];
  warnings: string[];
};

type SongImportDocSuccess = {
  song: NonNullable<Awaited<ReturnType<PrismaClientType["song"]["findUnique"]>>>;
  report: CpSongImportReportEntry;
};

type SongJsonImportResult = {
  imported: number;
  errors: CpSongImportJsonError[];
  report: CpSongImportReportEntry[];
};

type WordSongSource = {
  title: string;
  artist?: string | null;
  album?: string | null;
  year?: string | null;
  tags?: string | null;
  blocks: Array<{ content?: string | null }>;
};

export type SongImportEntity = NormalizedImportSong;

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return String(err);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const CP1252_UNICODE_TO_BYTE: Record<string, number> = {
  "\u20AC": 0x80,
  "\u201A": 0x82,
  "\u0192": 0x83,
  "\u201E": 0x84,
  "\u2026": 0x85,
  "\u2020": 0x86,
  "\u2021": 0x87,
  "\u02C6": 0x88,
  "\u2030": 0x89,
  "\u0160": 0x8a,
  "\u2039": 0x8b,
  "\u0152": 0x8c,
  "\u017D": 0x8e,
  "\u2018": 0x91,
  "\u2019": 0x92,
  "\u201C": 0x93,
  "\u201D": 0x94,
  "\u2022": 0x95,
  "\u2013": 0x96,
  "\u2014": 0x97,
  "\u02DC": 0x98,
  "\u2122": 0x99,
  "\u0161": 0x9a,
  "\u203A": 0x9b,
  "\u0153": 0x9c,
  "\u017E": 0x9e,
  "\u0178": 0x9f,
};

const MOJIBAKE_TOKENS = [
  "\u00C3",
  "\u00C2",
  "\u00E2\u0080",
  "\u00E2\u20AC",
  "\u00EF\u00BF\u00BD",
  "\uFFFD",
] as const;

function countOccurrences(value: string, token: string): number {
  let count = 0;
  let fromIndex = 0;
  while (fromIndex < value.length) {
    const foundIndex = value.indexOf(token, fromIndex);
    if (foundIndex === -1) break;
    count += 1;
    fromIndex = foundIndex + token.length;
  }
  return count;
}

function countMojibakeMarkers(value: string): number {
  let markers = 0;
  for (const token of MOJIBAKE_TOKENS) {
    markers += countOccurrences(value, token);
  }
  const controls = value.match(/[\u0080-\u009F]/g);
  if (controls) markers += controls.length;
  return markers;
}

function toLikelyLatin1Bytes(value: string): number[] | null {
  const bytes: number[] = [];
  for (const char of value) {
    const codepoint = char.codePointAt(0);
    if (codepoint == null) continue;

    if (codepoint <= 0xff) {
      bytes.push(codepoint);
      continue;
    }

    const cp1252Byte = CP1252_UNICODE_TO_BYTE[char];
    if (cp1252Byte != null) {
      bytes.push(cp1252Byte);
      continue;
    }

    return null;
  }
  return bytes;
}

function maybeRepairMojibake(value: string): string {
  const source = value.replace(/\uFEFF/g, "");
  const sourceScore = countMojibakeMarkers(source);
  if (sourceScore === 0) return source;

  const bytes = toLikelyLatin1Bytes(source);
  if (!bytes) return source;

  let repaired: string;
  try {
    repaired = Buffer.from(bytes).toString("utf8");
  } catch {
    return source;
  }

  if (!repaired) return source;
  const repairedScore = countMojibakeMarkers(repaired);
  const sourceReplacement = (source.match(/\uFFFD/g) || []).length;
  const repairedReplacement = (repaired.match(/\uFFFD/g) || []).length;

  if (repairedReplacement > sourceReplacement + 1) return source;
  if (repairedScore < sourceScore) return repaired;
  if (repairedScore === sourceScore && repairedReplacement < sourceReplacement) return repaired;
  return source;
}
function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = maybeRepairMojibake(value).trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asStringLike(value: unknown): string | undefined {
  if (typeof value === "string") return asString(value);
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeMultiline(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function canonicalLabel(value: string): string {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeYear(value?: string): string | undefined {
  if (!value) return undefined;
  const clean = normalizeWhitespace(value);
  const explicit = clean.match(/\b(19\d{2}|20\d{2}|21\d{2})\b/);
  if (explicit?.[1]) return explicit[1];

  const digits = clean.replace(/\D/g, "");
  if (/^\d{4}$/.test(digits)) return digits;
  return undefined;
}

function sanitizeFilename(value: string): string {
  const normalized = normalizeWhitespace(value)
    .replace(/[<>:"/\\|?*]/g, " ")
    .split("")
    .map((char) => (char.charCodeAt(0) < 32 ? " " : char))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  const compact = normalized.replace(/[. ]+$/g, "");
  return compact.length > 0 ? compact : "chant";
}

function splitBlocks(text: string): string[] {
  return normalizeMultiline(text)
    .split(/\n\s*\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function classifyMetadataLabel(labelRaw: string):
  | "TITLE"
  | "ARTIST"
  | "ALBUM"
  | "YEAR"
  | "LANGUAGE"
  | "TAGS"
  | "LYRICS"
  | null {
  const label = canonicalLabel(labelRaw);
  if (!label) return null;

  if (label === "title" || label.startsWith("titre") || label === "nom") return "TITLE";
  if (
    label === "artist" ||
    label.startsWith("auteur") ||
    label.includes("interprete") ||
    label.includes("compositeur")
  ) return "ARTIST";
  if (label.startsWith("album")) return "ALBUM";
  if (
    label === "year" ||
    label.includes("annee") ||
    label.includes("published") ||
    label.includes("release year") ||
    label.includes("sortie")
  ) return "YEAR";
  if (label === "lang" || label === "language" || label.startsWith("langue")) return "LANGUAGE";
  if (label.startsWith("tag")) return "TAGS";
  if (label === "lyrics" || label.startsWith("paroles") || label === "texte") return "LYRICS";

  return null;
}

type ParsedSectionHeading = {
  type: "VERSE" | "CHORUS" | "BRIDGE";
  title: string;
  inline: string;
};

type RepeatingChunk = {
  length: number;
  indices: number[];
  lines: string[];
  score: number;
};

function parseSectionHeading(line: string, fallbackVerseIndex: number): ParsedSectionHeading | null {
  const match = line.match(/^(refrain|chorus|couplet|verse|pont|bridge)\s*([0-9]+)?\s*[:\-\u2013\u2014]?\s*(.*)$/i);
  if (!match) return null;

  const head = canonicalLabel(match[1] ?? "");
  const sequence = (match[2] ?? "").trim();
  const inline = (match[3] ?? "").trim();

  if (head === "refrain" || head === "chorus") {
    return {
      type: "CHORUS",
      title: sequence ? `Refrain ${sequence}` : "Refrain",
      inline,
    };
  }

  if (head === "pont" || head === "bridge") {
    return {
      type: "BRIDGE",
      title: sequence ? `Pont ${sequence}` : "Pont",
      inline,
    };
  }

  return {
    type: "VERSE",
    title: sequence ? `Couplet ${sequence}` : `Couplet ${fallbackVerseIndex}`,
    inline,
  };
}

function parseParagraphToBlock(paragraph: string, idx: number): NormalizedImportSongBlock {
  const lines = paragraph.split("\n").map((line) => line.trim());
  const first = lines[0] ?? "";
  const heading = parseSectionHeading(first, idx + 1);

  let type = "VERSE";
  let title = `Couplet ${idx + 1}`;
  let bodyLines = [...lines];

  if (heading) {
    type = heading.type;
    title = heading.title;
    bodyLines = lines.slice(1);
    if (heading.inline.length > 0) bodyLines.unshift(heading.inline);
  }

  const content = normalizeMultiline(bodyLines.join("\n"));
  return {
    order: idx + 1,
    type,
    title,
    content,
  };
}

function parseLyricsByHeadings(lyrics: string): NormalizedImportSongBlock[] | null {
  const lines = normalizeMultiline(lyrics).split("\n");
  if (lines.length === 0) return null;

  let headingCount = 0;
  let verseCounter = 0;
  let currentType: "VERSE" | "CHORUS" | "BRIDGE" = "VERSE";
  let currentTitle = "";
  let currentLines: string[] = [];
  const blocks: NormalizedImportSongBlock[] = [];

  const flushCurrent = () => {
    const content = normalizeMultiline(currentLines.join("\n"));
    if (!content) return;
    blocks.push({
      order: blocks.length + 1,
      type: currentType,
      title: currentTitle || `Couplet ${Math.max(verseCounter, 1)}`,
      content,
    });
    currentLines = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (currentLines.length > 0) currentLines.push("");
      continue;
    }

    const heading = parseSectionHeading(line, verseCounter + 1);
    if (heading) {
      headingCount += 1;
      flushCurrent();

      if (heading.type === "VERSE" && !/^couplet\s+\d+$/i.test(heading.title)) {
        verseCounter += 1;
      }

      if (heading.type === "VERSE" && /^couplet\s+\d+$/i.test(heading.title)) {
        const parsed = heading.title.match(/(\d+)/);
        if (parsed?.[1]) verseCounter = Math.max(verseCounter, Number(parsed[1]));
      }

      currentType = heading.type;
      currentTitle = heading.title;
      currentLines = heading.inline ? [heading.inline] : [];
      continue;
    }

    if (!currentTitle) {
      verseCounter += 1;
      currentType = "VERSE";
      currentTitle = `Couplet ${verseCounter}`;
    }
    currentLines.push(rawLine.trim());
  }

  flushCurrent();
  if (headingCount === 0 || blocks.length === 0) return null;
  return blocks.map((block, idx) => ({ ...block, order: idx + 1 }));
}

function normalizeLineForRepeatMatch(line: string): string {
  return canonicalLabel(line);
}

function findBestRepeatingChunk(lines: string[]): RepeatingChunk | null {
  const maxLen = Math.min(8, Math.floor(lines.length / 2));
  let best: RepeatingChunk | null = null;

  for (let len = maxLen; len >= 2; len -= 1) {
    const chunks = new Map<string, { lines: string[]; indices: number[] }>();
    for (let i = 0; i <= lines.length - len; i += 1) {
      const chunk = lines.slice(i, i + len);
      const key = chunk.map((line) => normalizeLineForRepeatMatch(line)).join("\n");
      if (!key || key.length < len) continue;
      const entry = chunks.get(key);
      if (entry) {
        entry.indices.push(i);
      } else {
        chunks.set(key, { lines: chunk, indices: [i] });
      }
    }

    for (const entry of chunks.values()) {
      const nonOverlapping: number[] = [];
      for (const idx of entry.indices) {
        const previous = nonOverlapping[nonOverlapping.length - 1];
        if (previous == null || idx >= previous + len) nonOverlapping.push(idx);
      }
      if (nonOverlapping.length < 2) continue;

      const coverage = (nonOverlapping.length * len) / lines.length;
      if (coverage < 0.18 && len < 4) continue;

      const score = nonOverlapping.length * len;
      if (!best || score > best.score || (score === best.score && len > best.length)) {
        best = {
          length: len,
          indices: nonOverlapping,
          lines: entry.lines,
          score,
        };
      }
    }
  }

  return best;
}

function parseLyricsByRepeatingChunk(lyrics: string): NormalizedImportSongBlock[] | null {
  const lines = normalizeMultiline(lyrics)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 6) return null;

  const repeating = findBestRepeatingChunk(lines);
  if (!repeating) return null;
  const repeatingStarts = new Set(repeating.indices);

  const blocks: NormalizedImportSongBlock[] = [];
  let verseCounter = 0;
  let chorusCounter = 0;
  let cursor = 0;
  let verseLines: string[] = [];

  const flushVerse = () => {
    if (verseLines.length === 0) return;
    const content = normalizeMultiline(verseLines.join("\n"));
    if (!content) return;
    verseCounter += 1;
    blocks.push({
      order: blocks.length + 1,
      type: "VERSE",
      title: `Couplet ${verseCounter}`,
      content,
    });
    verseLines = [];
  };

  while (cursor < lines.length) {
    if (repeatingStarts.has(cursor)) {
      flushVerse();
      chorusCounter += 1;
      blocks.push({
        order: blocks.length + 1,
        type: "CHORUS",
        title: chorusCounter > 1 ? `Refrain ${chorusCounter}` : "Refrain",
        content: normalizeMultiline(repeating.lines.join("\n")),
      });
      cursor += repeating.length;
      continue;
    }
    verseLines.push(lines[cursor]);
    cursor += 1;
  }

  flushVerse();
  if (blocks.length <= 1) return null;
  return blocks.map((block, idx) => ({ ...block, order: idx + 1 }));
}

function parseLyricsToBlocks(lyrics: string): NormalizedImportSongBlock[] {
  const normalizedLyrics = normalizeMultiline(lyrics);
  if (!normalizedLyrics) {
    return [{ order: 1, type: "VERSE", title: "Couplet 1", content: "" }];
  }

  const explicitHeadingBlocks = parseLyricsByHeadings(normalizedLyrics);
  if (explicitHeadingBlocks && explicitHeadingBlocks.length > 0) return explicitHeadingBlocks;

  const paragraphs = splitBlocks(lyrics);
  if (paragraphs.length > 1) {
    const blocks = paragraphs.map((paragraph, idx) => parseParagraphToBlock(paragraph, idx));
    const filtered = blocks.filter((block) => block.content.length > 0);
    const base = filtered.length > 0 ? filtered : blocks;
    return base.map((block, idx) => ({ ...block, order: idx + 1 }));
  }

  const repeatingChunkBlocks = parseLyricsByRepeatingChunk(normalizedLyrics);
  if (repeatingChunkBlocks && repeatingChunkBlocks.length > 0) return repeatingChunkBlocks;

  return [{ order: 1, type: "VERSE", title: "Couplet 1", content: normalizedLyrics }];
}

function buildCanonicalMap(record: Record<string, unknown>): Map<string, unknown> {
  const out = new Map<string, unknown>();
  Object.entries(record).forEach(([key, value]) => {
    const canonical = canonicalLabel(key);
    if (!canonical || out.has(canonical)) return;
    out.set(canonical, value);
  });
  return out;
}

function pickFromMaps(
  primary: Map<string, unknown>,
  secondary: Map<string, unknown>,
  keys: string[],
  normalizer: (value: string) => string = normalizeWhitespace,
): string | undefined {
  for (const key of keys) {
    const canonical = canonicalLabel(key);
    const primaryValue = asStringLike(primary.get(canonical));
    if (primaryValue) {
      const normalized = normalizer(primaryValue);
      if (normalized) return normalized;
    }
    const secondaryValue = asStringLike(secondary.get(canonical));
    if (secondaryValue) {
      const normalized = normalizer(secondaryValue);
      if (normalized) return normalized;
    }
  }
  return undefined;
}
export function parseSongText(raw: string, filename?: string): ParsedSongTextResult {
  const warnings: string[] = [];
  const rawLines = raw.replace(/\r\n?/g, "\n").split("\n");
  let title: string | undefined;
  let artist: string | undefined;
  let album: string | undefined;
  let yearRaw: string | undefined;
  let language: string | undefined;
  let tags: string | undefined;
  let lyricsStarted = false;
  const lyricsLines: string[] = [];

  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    if (!lyricsStarted) {
      const labelOnly = classifyMetadataLabel(line.replace(/[:\uFF1A]\s*$/, ""));
      if (labelOnly === "LYRICS") {
        lyricsStarted = true;
        continue;
      }

      const match = line.match(/^([^:\uFF1A]{1,120})\s*[:\uFF1A]\s*(.*)$/);
      if (match) {
        const field = classifyMetadataLabel(match[1] ?? "");
        const value = normalizeWhitespace(match[2] ?? "");

        if (field === "LYRICS") {
          lyricsStarted = true;
          if (value) lyricsLines.push(value);
          continue;
        }

        if (field) {
          if (field === "TITLE" && !title) title = value || undefined;
          if (field === "ARTIST" && !artist) artist = value || undefined;
          if (field === "ALBUM" && !album) album = value || undefined;
          if (field === "YEAR" && !yearRaw) yearRaw = value || undefined;
          if (field === "LANGUAGE" && !language) language = value || undefined;
          if (field === "TAGS" && !tags) tags = value || undefined;
          continue;
        }
      }

      if (line.length > 0) {
        lyricsStarted = true;
        lyricsLines.push(rawLine);
      }
      continue;
    }

    lyricsLines.push(rawLine);
  }

  const fallbackTitle = filename?.replace(/\.(docx|odt)$/i, "").trim();
  const normalizedTitle = normalizeWhitespace(title || fallbackTitle || "Sans titre");
  if (!title && fallbackTitle) {
    warnings.push("Titre absent: nom de fichier utilise.");
  }

  const normalizedYear = normalizeYear(yearRaw);
  if (yearRaw && !normalizedYear) {
    warnings.push(`Annee ignoree (format invalide): "${yearRaw}".`);
  }

  const lyrics = normalizeMultiline(lyricsLines.join("\n"));
  if (!lyrics) warnings.push("Paroles absentes ou vides.");
  const blocks = parseLyricsToBlocks(lyrics);

  return {
    title: normalizedTitle,
    artist: artist ? normalizeWhitespace(artist) : undefined,
    album: album ? normalizeWhitespace(album) : undefined,
    year: normalizedYear,
    language: language ? normalizeWhitespace(language) : undefined,
    tags: tags ? normalizeWhitespace(tags) : undefined,
    lyrics,
    blocks,
    warnings,
  };
}

async function extractTextFromDoc(buffer: Buffer, ext: string) {
  if (ext === ".docx") {
    const { value } = await mammoth.extractRawText({ buffer });
    return value || "";
  }
  if (ext === ".odt") {
    const zip = new AdmZip(buffer);
    const entry = zip.getEntry("content.xml");
    if (!entry) throw new Error("content.xml manquant");
    const xml = entry.getData().toString("utf-8");
    return xml
      .replace(/<\/text:p>/g, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  throw new Error("Extension non supportee");
}

function normalizeBlock(rawBlock: unknown, idx: number): NormalizedImportSongBlock | null {
  if (!isRecord(rawBlock)) return null;
  const content = normalizeMultiline(asStringLike(rawBlock.content) || "");
  const parsedOrder =
    typeof rawBlock.order === "number" && Number.isFinite(rawBlock.order) ? Math.floor(rawBlock.order) : idx + 1;
  return {
    order: parsedOrder > 0 ? parsedOrder : idx + 1,
    type: normalizeWhitespace(asString(rawBlock.type) || "VERSE"),
    title: asString(rawBlock.title) ? normalizeWhitespace(asString(rawBlock.title) as string) : undefined,
    content,
  };
}

export function normalizeSongFromJson(rawSong: unknown, songIdx: number, filePath: string):
  | { ok: true; song: NormalizedImportSong; warnings: string[] }
  | { ok: false; error: CpSongImportJsonError; report: CpSongImportReportEntry } {
  if (!isRecord(rawSong)) {
    const message = `Entree #${songIdx + 1}: format invalide (objet attendu)`;
    return {
      ok: false,
      error: { path: filePath, message },
      report: { path: filePath, status: "ERROR", message },
    };
  }

  const warnings: string[] = [];
  const topMap = buildCanonicalMap(rawSong);
  const metaRaw = isRecord(rawSong.meta) ? rawSong.meta : {};
  const metaMap = buildCanonicalMap(metaRaw);

  const title = pickFromMaps(topMap, metaMap, ["title", "titre", "nom"]) || "Sans titre";
  const artist = pickFromMaps(topMap, metaMap, [
    "artist",
    "auteur",
    "interprete",
    "auteur interprete",
    "compositeur",
  ]);
  const album = pickFromMaps(topMap, metaMap, ["album", "album inclus dans"]);
  const yearRaw = pickFromMaps(topMap, metaMap, [
    "year",
    "annee",
    "annee de parution",
    "annee de sortie",
    "annee de sortie single",
    "published",
    "release year",
  ]);
  const year = normalizeYear(yearRaw);
  if (yearRaw && !year) warnings.push(`Annee ignoree (format invalide): "${yearRaw}"`);

  const language = pickFromMaps(topMap, metaMap, ["language", "lang", "langue"]);
  const tags = pickFromMaps(topMap, metaMap, ["tags", "tag"]) || pickFromMaps(topMap, metaMap, ["notes", "note"]);
  const lyrics = pickFromMaps(topMap, metaMap, ["lyrics", "paroles", "texte"], normalizeMultiline);

  let blocks: NormalizedImportSongBlock[] = [];
  if (Array.isArray(rawSong.blocks)) {
    const parsedBlocks = rawSong.blocks
      .map((block, idx) => normalizeBlock(block, idx))
      .filter((block): block is NormalizedImportSongBlock => !!block);
    if (parsedBlocks.length !== rawSong.blocks.length) {
      warnings.push("Certains blocs ont ete ignores (format invalide).");
    }
    blocks = parsedBlocks;
  } else if (rawSong.blocks != null) {
    warnings.push("Le champ blocks est ignore (tableau attendu).");
  }

  if (blocks.length === 0 && lyrics) {
    blocks = parseLyricsToBlocks(lyrics);
  }

  if (blocks.length === 0) {
    blocks = [{ order: 1, type: "VERSE", title: "Couplet 1", content: "" }];
    warnings.push("Aucun contenu detecte: bloc vide ajoute.");
  }

  const normalizedSong: NormalizedImportSong = {
    title: normalizeWhitespace(title),
    artist: artist ? normalizeWhitespace(artist) : undefined,
    album: album ? normalizeWhitespace(album) : undefined,
    year,
    language: language ? normalizeWhitespace(language) : undefined,
    tags: tags ? normalizeWhitespace(tags) : undefined,
    blocks: blocks.map((block, idx) => ({ ...block, order: idx + 1 })),
  };

  return { ok: true, song: normalizedSong, warnings };
}

export function migrateSongsJsonPayload(raw: unknown): ImportedJsonEnvelope {
  if (Array.isArray(raw)) return { songs: raw, warnings: [] };
  if (!isRecord(raw)) {
    throw new Error("Le fichier doit contenir un tableau de chants ou un objet.");
  }

  const kind = asStringLike(raw.kind);
  const schemaVersionRaw = raw.schemaVersion;
  const schemaVersion =
    typeof schemaVersionRaw === "number" && Number.isFinite(schemaVersionRaw)
      ? Math.trunc(schemaVersionRaw)
      : undefined;

  if (schemaVersion != null || kind != null || "payload" in raw) {
    if (kind != null && kind !== SONGS_JSON_KIND) {
      throw new Error(`Unsupported songs export kind: ${kind}`);
    }
    const detectedVersion = schemaVersion ?? 1;
    if (detectedVersion > SONGS_JSON_SCHEMA_VERSION) {
      throw new Error(`Unsupported songs schema version: ${detectedVersion}`);
    }

    if (detectedVersion >= 2) {
      if (!isRecord(raw.payload) || !Array.isArray(raw.payload.songs)) {
        throw new Error("Invalid songs JSON: payload.songs must be an array");
      }
      return { songs: raw.payload.songs, warnings: [] };
    }

    const legacySongs = Array.isArray(raw.songs)
      ? raw.songs
      : isRecord(raw.payload) && Array.isArray(raw.payload.songs)
        ? raw.payload.songs
        : [];
    return {
      songs: legacySongs,
      warnings: [
        "Legacy songs JSON detected (v1). Migration applied automatically.",
      ],
    };
  }

  if (Array.isArray(raw.songs)) {
    return {
      songs: raw.songs,
      warnings: [
        "Legacy songs JSON detected (missing schema metadata). Migration applied automatically.",
      ],
    };
  }

  return { songs: [raw], warnings: [] };
}

function buildWordLyrics(song: WordSongSource): string {
  return (song.blocks || [])
    .map((block) => normalizeMultiline(block.content || ""))
    .filter(Boolean)
    .join("\n\n");
}

function buildSongWordDocument(song: WordSongSource) {
  const title = normalizeWhitespace(song.title || "Sans titre");
  const artist = normalizeWhitespace(song.artist || "");
  const album = normalizeWhitespace(song.album || "");
  const year = normalizeYear(song.year || undefined) || normalizeYear(song.tags || undefined) || "";
  const lyrics = buildWordLyrics(song);

  const children: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: `Titre : ${title}`, bold: true })],
    }),
    new Paragraph(`Auteur : ${artist}`),
    new Paragraph(`Annee de parution : ${year}`),
    new Paragraph(`Album : ${album}`),
    new Paragraph(""),
    new Paragraph({
      children: [new TextRun({ text: "Paroles :", bold: true })],
    }),
    ...lyrics.split("\n").map((line) => new Paragraph(line)),
  ];

  return new Document({
    sections: [{ properties: {}, children }],
  });
}

async function buildSongWordBuffer(song: WordSongSource) {
  const document = buildSongWordDocument(song);
  return Packer.toBuffer(document);
}

export async function createSongWithBlocksAtomic(prisma: SongImportPrisma, songEntry: SongImportEntity) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const song = await tx.song.create({
      data: {
        title: songEntry.title,
        artist: songEntry.artist,
        album: songEntry.album,
        year: songEntry.year,
        language: songEntry.language,
        tags: songEntry.tags,
      },
    });
    for (const b of songEntry.blocks) {
      await tx.songBlock.create({
        data: {
          songId: song.id,
          order: b.order,
          type: b.type || "VERSE",
          title: b.title,
          content: b.content.trim(),
        },
      });
    }
    return song;
  });
}

async function importDocSong(prisma: PrismaClientType, filePath: string): Promise<SongImportDocSuccess> {
  const buffer = Buffer.from(await readFile(filePath));
  const ext = path.extname(filePath).toLowerCase();
  if (!SUPPORTED_DOC_EXTENSIONS.includes(ext as (typeof SUPPORTED_DOC_EXTENSIONS)[number])) {
    throw new Error("Extension non supportee (docx / odt)");
  }

  const raw = await extractTextFromDoc(buffer, ext);
  const parsed = parseSongText(raw, path.basename(filePath));
  const created = await createSongWithBlocksAtomic(prisma, {
    title: parsed.title,
    artist: parsed.artist,
    album: parsed.album,
    year: parsed.year,
    language: parsed.language,
    tags: parsed.tags,
    blocks: parsed.blocks,
  });

  const song = await prisma.song.findUnique({
    where: { id: created.id },
    include: { blocks: { orderBy: { order: "asc" } } },
  });
  if (!song) throw new Error("Chant introuvable apres importation");

  const report: CpSongImportReportEntry = {
    path: filePath,
    status: "SUCCESS",
    title: song.title,
    warnings: parsed.warnings,
    normalized: {
      title: song.title,
      artist: song.artist || undefined,
      album: song.album || undefined,
      year: song.year || undefined,
      language: song.language || undefined,
    },
  };

  return { song, report };
}

async function importJsonFile(prisma: PrismaClientType, filePath: string): Promise<SongJsonImportResult> {
  const rawText = await readFile(filePath, "utf-8");
  const parsedRaw = JSON.parse(rawText) as unknown;
  const envelope = migrateSongsJsonPayload(parsedRaw);

  const report: CpSongImportReportEntry[] = envelope.warnings.map((warning) => ({
    path: filePath,
    status: "ERROR",
    message: warning,
  }));
  const errors: CpSongImportJsonError[] = [];
  let imported = 0;

  for (const [songIdx, rawSong] of envelope.songs.entries()) {
    const normalized = normalizeSongFromJson(rawSong, songIdx, filePath);
    if (!normalized.ok) {
      errors.push(normalized.error);
      report.push(normalized.report);
      continue;
    }

    try {
      await createSongWithBlocksAtomic(prisma, normalized.song);
      imported += 1;
      report.push({
        path: filePath,
        status: "SUCCESS",
        title: normalized.song.title,
        warnings: normalized.warnings,
        normalized: {
          title: normalized.song.title,
          artist: normalized.song.artist,
          album: normalized.song.album,
          year: normalized.song.year,
          language: normalized.song.language,
        },
      });
    } catch (e: unknown) {
      const message = getErrorMessage(e);
      errors.push({ path: filePath, title: normalized.song.title, message });
      report.push({
        path: filePath,
        status: "ERROR",
        title: normalized.song.title,
        message,
      });
    }
  }

  return { imported, errors, report };
}

function toDocErrors(report: CpSongImportReportEntry[]): CpSongImportDocError[] {
  return report
    .filter((entry) => entry.status === "ERROR")
    .map((entry) => ({ path: entry.path, message: entry.message || "Import failed" }));
}

function uniqueDocxName(baseTitle: string, used: Set<string>) {
  const base = sanitizeFilename(baseTitle);
  let candidate = `${base}.docx`;
  let index = 2;
  while (used.has(candidate.toLowerCase())) {
    candidate = `${base} (${index}).docx`;
    index += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

export function registerSongsIpc() {
  ipcMain.handle("songs:list", async (_evt, rawQ?: unknown) => {
    const prisma = getPrisma();
    const query = (parseOptionalQuery(rawQ, "songs:list.query") ?? "").trim();

    if (query.length > 0) {
      const songs = await prisma.song.findMany({
        where: {
          deletedAt: null,
          OR: [
            { title: { contains: query } },
            { artist: { contains: query } },
            { album: { contains: query } },
            { tags: { contains: query } },
            { blocks: { some: { content: { contains: query } } } },
          ],
        },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true, title: true, artist: true, album: true, year: true, updatedAt: true,
          blocks: { where: { content: { contains: query } }, select: { content: true }, take: 1 },
        },
        take: 200,
      });

      return songs.map((s) => {
        const { blocks, ...rest } = s;
        let matchSnippet: string | null = null;
        if (blocks && blocks.length > 0) {
          const content = blocks[0].content;
          const idx = content.toLowerCase().indexOf(query.toLowerCase());
          if (idx >= 0) {
            const start = Math.max(0, idx - 30);
            const end = Math.min(content.length, idx + query.length + 50);
            matchSnippet =
              (start > 0 ? "..." : "") +
              content.slice(start, end).trim() +
              (end < content.length ? "..." : "");
          }
        }
        return { ...rest, matchSnippet };
      });
    }

    return prisma.song.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, artist: true, album: true, year: true, updatedAt: true },
      take: 200,
    });
  });

  ipcMain.handle("songs:get", async (_evt, rawId: unknown) => {
    const prisma = getPrisma();
    const id = parseNonEmptyString(rawId, "songs:get.id");
    return prisma.song.findUnique({
      where: { id },
      include: { blocks: { orderBy: { order: "asc" } } },
    });
  });

  ipcMain.handle("songs:create", async (_evt, rawPayload: unknown) => {
    const prisma = getPrisma();
    const payload = parseSongCreatePayload(rawPayload);
    return prisma.song.create({
      data: {
        title: payload.title,
        artist: payload.artist,
        album: payload.album,
        year: payload.year,
        blocks: {
          create: [
            { order: 1, type: "VERSE", title: "Couplet 1", content: "" },
            { order: 2, type: "CHORUS", title: "Refrain", content: "" },
          ],
        },
      },
      include: { blocks: { orderBy: { order: "asc" } } },
    });
  });

  ipcMain.handle("songs:updateMeta", async (_evt, rawPayload: unknown) => {
    const prisma = getPrisma();
    const payload = parseSongUpdateMetaPayload(rawPayload);
    return prisma.song.update({
      where: { id: payload.id },
      data: { title: payload.title, artist: payload.artist, album: payload.album, year: payload.year },
      include: { blocks: { orderBy: { order: "asc" } } },
    });
  });

  ipcMain.handle("songs:replaceBlocks", async (_evt, rawPayload: unknown) => {
    const prisma = getPrisma();
    const payload = parseSongReplaceBlocksPayload(rawPayload);
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.songBlock.deleteMany({ where: { songId: payload.songId } });
      await tx.songBlock.createMany({
        data: payload.blocks.map((b) => ({
          songId: payload.songId,
          order: b.order,
          type: b.type,
          title: b.title,
          content: b.content,
        })),
      });

      return tx.song.findUnique({
        where: { id: payload.songId },
        include: { blocks: { orderBy: { order: "asc" } } },
      });
    });
  });

  ipcMain.handle("songs:delete", async (_evt, rawId: unknown) => {
    const prisma = getPrisma();
    const id = parseNonEmptyString(rawId, "songs:delete.id");
    await prisma.song.update({ where: { id }, data: { deletedAt: new Date() } });
    return { ok: true };
  });

  ipcMain.handle("songs:exportWord", async (_evt, rawSongId: unknown) => {
    const prisma = getPrisma();
    const songId = parseNonEmptyString(rawSongId, "songs:exportWord.songId");
    const song = await prisma.song.findUnique({
      where: { id: songId },
      include: { blocks: { orderBy: { order: "asc" } } },
    });
    if (!song) throw new Error("Song not found");

    const buffer = await buildSongWordBuffer(song);
    const res = await dialog.showSaveDialog({
      title: "Exporter le chant",
      defaultPath: `${sanitizeFilename(song.title)}.docx`,
      filters: [{ name: "Word", extensions: ["docx"] }],
    });
    if (res.canceled || !res.filePath) return { ok: false, canceled: true };
    await writeFile(res.filePath, buffer);
    return { ok: true, path: res.filePath, format: "SINGLE_DOCX" };
  });

  ipcMain.handle("songs:exportWordPack", async (_evt, rawPayload: unknown) => {
    const prisma = getPrisma();
    const payload = parseSongExportWordPackPayload(rawPayload);
    const where = payload.songIds?.length
      ? { deletedAt: null, id: { in: payload.songIds } }
      : { deletedAt: null };

    const songs = await prisma.song.findMany({
      where,
      include: { blocks: { orderBy: { order: "asc" } } },
      orderBy: { title: "asc" },
    });
    if (songs.length === 0) throw new Error("No songs to export");

    const zip = new AdmZip();
    const usedNames = new Set<string>();
    for (const song of songs) {
      const fileName = uniqueDocxName(song.title || "chant", usedNames);
      const buffer = await buildSongWordBuffer(song);
      zip.addFile(fileName, buffer);
    }

    const output = await dialog.showSaveDialog({
      title: "Exporter un pack DOCX",
      defaultPath: "chants-pack.zip",
      filters: [{ name: "ZIP", extensions: ["zip"] }],
    });
    if (output.canceled || !output.filePath) return { ok: false, canceled: true };
    await writeFile(output.filePath, zip.toBuffer());
    return { ok: true, path: output.filePath, count: songs.length, format: "PACK_ZIP_DOCX" };
  });

  ipcMain.handle("songs:importWord", async () => {
    const res = await dialog.showOpenDialog({
      title: "Importer un chant (Word)",
      filters: [{ name: "Word", extensions: ["docx", "odt"] }],
      properties: ["openFile"],
    });
    if (res.canceled || !res.filePaths?.[0]) return { ok: false, canceled: true };

    const prisma = getPrisma();
    const imported = await importDocSong(prisma, res.filePaths[0]);
    return { ok: true, song: imported.song, report: [imported.report] };
  });

  ipcMain.handle("songs:importJson", async () => {
    const prisma = getPrisma();
    const res = await dialog.showOpenDialog({
      title: "Importer des chants (JSON)",
      filters: [{ name: "JSON", extensions: ["json"] }],
      properties: ["openFile"],
    });
    if (res.canceled || !res.filePaths?.[0]) return { ok: false, canceled: true };

    try {
      const imported = await importJsonFile(prisma, res.filePaths[0]);
      return {
        ok: true,
        imported: imported.imported,
        errors: imported.errors,
        path: res.filePaths[0],
        report: imported.report,
      };
    } catch (e: unknown) {
      return { ok: false, error: getErrorMessage(e) };
    }
  });

  ipcMain.handle("songs:importWordBatch", async () => {
    const res = await dialog.showOpenDialog({
      title: "Importer des chants (Word/ODT)",
      filters: [{ name: "Documents", extensions: ["docx", "odt"] }],
      properties: ["openFile", "multiSelections"],
    });
    if (res.canceled || !res.filePaths?.length) return { ok: false, canceled: true };

    const prisma = getPrisma();
    let imported = 0;
    const report: CpSongImportReportEntry[] = [];

    for (const filePath of res.filePaths) {
      try {
        const created = await importDocSong(prisma, filePath);
        imported += 1;
        report.push(created.report);
      } catch (e: unknown) {
        report.push({
          path: filePath,
          status: "ERROR",
          message: getErrorMessage(e),
        });
      }
    }

    return {
      ok: true,
      imported,
      errors: toDocErrors(report),
      files: res.filePaths,
      report,
    };
  });

  ipcMain.handle("songs:importAuto", async () => {
    const res = await dialog.showOpenDialog({
      title: "Importer des chants (docx / odt / json)",
      filters: [
        { name: "Chants", extensions: ["docx", "odt", "json"] },
        { name: "Tous", extensions: ["*"] },
      ],
      properties: ["openFile", "multiSelections"],
    });
    if (res.canceled || !res.filePaths?.length) return { ok: false, canceled: true };

    const prisma = getPrisma();
    let imported = 0;
    let jsonFiles = 0;
    let docFiles = 0;
    const report: CpSongImportReportEntry[] = [];

    for (const filePath of res.filePaths) {
      const ext = path.extname(filePath).toLowerCase();
      try {
        if (ext === ".json") {
          const result = await importJsonFile(prisma, filePath);
          imported += result.imported;
          jsonFiles += 1;
          report.push(...result.report);
        } else if (SUPPORTED_DOC_EXTENSIONS.includes(ext as (typeof SUPPORTED_DOC_EXTENSIONS)[number])) {
          const result = await importDocSong(prisma, filePath);
          imported += 1;
          docFiles += 1;
          report.push(result.report);
        } else {
          report.push({
            path: filePath,
            status: "ERROR",
            message: "Extension non supportee",
          });
        }
      } catch (e: unknown) {
        report.push({
          path: filePath,
          status: "ERROR",
          message: getErrorMessage(e),
        });
      }
    }

    return {
      ok: true,
      imported,
      docFiles,
      jsonFiles,
      errors: toDocErrors(report),
      files: res.filePaths,
      report,
    };
  });
}

