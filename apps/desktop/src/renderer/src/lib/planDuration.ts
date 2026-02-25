/**
 * Duration estimation for plan items.
 * Used in LiveBar (US-077) and ServicePreviewDialog (US-026).
 */

export function estimateItemDurationSeconds(item: CpPlanItem): number {
  if (item.kind === "TIMER" && item.content) {
    const parts = item.content.split(":");
    const m = parseInt(parts[0] ?? "0", 10) || 0;
    const s = parseInt(parts[1] ?? "0", 10) || 0;
    return m * 60 + s;
  }
  switch (item.kind as CpPlanItemKind) {
    case "SONG_BLOCK":           return 3 * 60;
    case "BIBLE_VERSE":
    case "BIBLE_PASSAGE":
    case "VERSE_MANUAL":         return 2 * 60;
    case "ANNOUNCEMENT_TEXT":    return 60;
    case "ANNOUNCEMENT_IMAGE":
    case "ANNOUNCEMENT_PDF":     return 2 * 60;
    default:                     return 2 * 60;
  }
}

export function formatMinutes(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}`;
  return `${m} min`;
}

export function formatMMSS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
