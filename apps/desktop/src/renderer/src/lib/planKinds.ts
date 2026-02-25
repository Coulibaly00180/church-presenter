import {
  CP_PLAN_ITEM_KIND_DEFAULT_TITLES,
  CP_PLAN_ITEM_KIND_LABELS,
  isBiblePlanItemKind,
  isCpPlanItemKind,
  isMediaPlanItemKind,
  type CpPlanItemKind,
} from "../../../shared/planKinds";

export type PlanKindBadgeVariant = "default" | "secondary" | "outline" | "destructive";

const PLAN_KIND_BADGE_VARIANTS: Record<CpPlanItemKind, PlanKindBadgeVariant> = {
  ANNOUNCEMENT_TEXT: "outline",
  ANNOUNCEMENT_IMAGE: "outline",
  ANNOUNCEMENT_PDF: "outline",
  ANNOUNCEMENT_VIDEO: "outline",
  VERSE_MANUAL: "secondary",
  BIBLE_VERSE: "secondary",
  BIBLE_PASSAGE: "secondary",
  SONG_BLOCK: "default",
  TIMER: "outline",
};

export function getPlanKindLabel(kind: string): string {
  return isCpPlanItemKind(kind) ? CP_PLAN_ITEM_KIND_LABELS[kind] : kind;
}

export function getPlanKindDefaultTitle(kind: string): string {
  return isCpPlanItemKind(kind) ? CP_PLAN_ITEM_KIND_DEFAULT_TITLES[kind] : kind;
}

export function getPlanKindBadgeVariant(kind: string): PlanKindBadgeVariant {
  return isCpPlanItemKind(kind) ? PLAN_KIND_BADGE_VARIANTS[kind] : "outline";
}

export function isPlanKindBible(kind: string): kind is "VERSE_MANUAL" | "BIBLE_VERSE" | "BIBLE_PASSAGE" {
  return isBiblePlanItemKind(kind);
}

export function isPlanKindMedia(kind: string): kind is "ANNOUNCEMENT_IMAGE" | "ANNOUNCEMENT_PDF" | "ANNOUNCEMENT_VIDEO" {
  return isMediaPlanItemKind(kind);
}
