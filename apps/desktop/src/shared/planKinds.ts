export const CP_PLAN_ITEM_KIND_VALUES = [
  "ANNOUNCEMENT_TEXT",
  "ANNOUNCEMENT_IMAGE",
  "ANNOUNCEMENT_PDF",
  "ANNOUNCEMENT_VIDEO",
  "VERSE_MANUAL",
  "BIBLE_VERSE",
  "BIBLE_PASSAGE",
  "SONG_BLOCK",
  "TIMER",
] as const;

export type CpPlanItemKind = (typeof CP_PLAN_ITEM_KIND_VALUES)[number];

const PLAN_KIND_SET = new Set<string>(CP_PLAN_ITEM_KIND_VALUES);

export const CP_PLAN_ITEM_KIND_LABELS: Record<CpPlanItemKind, string> = {
  ANNOUNCEMENT_TEXT: "Annonce",
  ANNOUNCEMENT_IMAGE: "Image",
  ANNOUNCEMENT_PDF: "PDF",
  ANNOUNCEMENT_VIDEO: "Vidéo",
  VERSE_MANUAL: "Verset",
  BIBLE_VERSE: "Verset",
  BIBLE_PASSAGE: "Passage",
  SONG_BLOCK: "Chant",
  TIMER: "Minuterie",
};

export const CP_PLAN_ITEM_KIND_DEFAULT_TITLES: Record<CpPlanItemKind, string> = {
  ANNOUNCEMENT_TEXT: "Annonce",
  ANNOUNCEMENT_IMAGE: "Image",
  ANNOUNCEMENT_PDF: "PDF",
  ANNOUNCEMENT_VIDEO: "Vidéo",
  VERSE_MANUAL: "Bible",
  BIBLE_VERSE: "Bible",
  BIBLE_PASSAGE: "Bible",
  SONG_BLOCK: "Chant",
  TIMER: "Minuterie",
};

export function isCpPlanItemKind(value: unknown): value is CpPlanItemKind {
  return typeof value === "string" && PLAN_KIND_SET.has(value);
}

export function normalizeCpPlanItemKind(
  value: unknown,
  fallback: CpPlanItemKind = "ANNOUNCEMENT_TEXT",
): CpPlanItemKind {
  return isCpPlanItemKind(value) ? value : fallback;
}

export function isBiblePlanItemKind(kind: string): kind is "VERSE_MANUAL" | "BIBLE_VERSE" | "BIBLE_PASSAGE" {
  return kind === "VERSE_MANUAL" || kind === "BIBLE_VERSE" || kind === "BIBLE_PASSAGE";
}

export function isMediaPlanItemKind(kind: string): kind is "ANNOUNCEMENT_IMAGE" | "ANNOUNCEMENT_PDF" | "ANNOUNCEMENT_VIDEO" {
  return kind === "ANNOUNCEMENT_IMAGE" || kind === "ANNOUNCEMENT_PDF" || kind === "ANNOUNCEMENT_VIDEO";
}
