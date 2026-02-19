import { projectMediaToScreen, projectTextToScreen } from "../projection/target";
import { LiveState, PlanItem, ScreenKey } from "./types";

const KIND_DEFAULT_TITLE: Record<string, string> = {
  SONG_BLOCK: "Chant",
  BIBLE_VERSE: "Bible",
  BIBLE_PASSAGE: "Bible",
  VERSE_MANUAL: "Bible",
  ANNOUNCEMENT_TEXT: "Annonce",
  ANNOUNCEMENT_IMAGE: "Image",
  ANNOUNCEMENT_PDF: "PDF",
  TIMER: "Timer",
};

function formatBibleTitle(item: PlanItem): string {
  const rawTitle = (item.title || "").trim();
  if (rawTitle) return rawTitle;
  const reference = (item.refId || "").trim();
  if (!reference) return KIND_DEFAULT_TITLE[item.kind] || item.kind;
  const translation = (item.refSubId || "").trim();
  return translation ? `${reference} (${translation})` : reference;
}

function inferProjectionTitle(item: PlanItem): string {
  if (item.kind === "BIBLE_VERSE" || item.kind === "BIBLE_PASSAGE" || item.kind === "VERSE_MANUAL") {
    return formatBibleTitle(item);
  }
  const rawTitle = (item.title || "").trim();
  if (rawTitle) return rawTitle;
  return KIND_DEFAULT_TITLE[item.kind] || item.kind;
}

function formatForProjection(item: PlanItem) {
  return {
    title: inferProjectionTitle(item),
    body: (item.content ?? "").trim(),
  };
}

export async function projectPlanItemToTarget(target: ScreenKey, item: PlanItem, live: LiveState | null) {
  const { title, body } = formatForProjection(item);
  const lockedScreens = live?.lockedScreens;
  if (item.kind === "ANNOUNCEMENT_IMAGE" && item.mediaPath) {
    await projectMediaToScreen({ target, title, mediaPath: item.mediaPath, mediaType: "IMAGE", lockedScreens });
    return;
  }
  if (item.kind === "ANNOUNCEMENT_PDF" && item.mediaPath) {
    await projectMediaToScreen({ target, title, mediaPath: item.mediaPath, mediaType: "PDF", lockedScreens });
    return;
  }
  if (item.kind === "TIMER") {
    await projectTextToScreen({ target, title: `TIMER:${title}`, body, lockedScreens });
    return;
  }
  await projectTextToScreen({ target, title, body, lockedScreens });
}
