import { toast } from "sonner";
import { projectMediaToScreen, projectTextToScreen } from "../projection/target";
import { getPlanKindDefaultTitle, isPlanKindBible } from "./planKinds";
import { LiveState, PlanItem, ScreenKey } from "./types";
import type { CpItemBackground } from "../../../shared/ipc";

/** Parse le backgroundConfig JSON d'un plan ou d'un item. Loggue un warning si corrompu. */
export function parsePlanBackground(backgroundConfig: string | null | undefined): CpItemBackground | undefined {
  if (!backgroundConfig) return undefined;
  try {
    return JSON.parse(backgroundConfig) as CpItemBackground;
  } catch (e) {
    console.warn("[projection] backgroundConfig corrompu :", e);
    return undefined;
  }
}

/** Vérifie que le fichier media existe. Affiche un toast et retourne false si absent. */
async function mediaFileExists(mediaPath: string): Promise<boolean> {
  const result = await window.cp.files.existsMedia({ path: mediaPath });
  if (!result.ok || !result.exists) {
    const filename = mediaPath.split(/[\\/]/).pop() ?? mediaPath;
    toast.error("Fichier introuvable", { description: filename });
    return false;
  }
  return true;
}

function formatBibleTitle(item: PlanItem): string {
  const rawTitle = (item.title || "").trim();
  if (rawTitle) return rawTitle;
  const reference = (item.refId || "").trim();
  if (!reference) return getPlanKindDefaultTitle(item.kind);
  const translation = (item.refSubId || "").trim();
  return translation ? `${reference} (${translation})` : reference;
}

function inferProjectionTitle(item: PlanItem): string {
  if (isPlanKindBible(item.kind)) {
    return formatBibleTitle(item);
  }
  const rawTitle = (item.title || "").trim();
  if (rawTitle) return rawTitle;
  return getPlanKindDefaultTitle(item.kind);
}

function formatForProjection(item: PlanItem) {
  return {
    title: inferProjectionTitle(item),
    body: (item.content ?? "").trim(),
  };
}

export async function projectPlanItemToTarget(target: ScreenKey, item: PlanItem, live: LiveState | null, planBackground?: CpItemBackground) {
  const { title, body } = formatForProjection(item);
  const lockedScreens = live?.lockedScreens;

  const itemBg = parsePlanBackground(item.backgroundConfig);
  const backgroundOverride: CpItemBackground | undefined =
    (planBackground || itemBg) ? { ...planBackground, ...itemBg } : undefined;

  if (item.kind === "ANNOUNCEMENT_IMAGE" && item.mediaPath) {
    if (!await mediaFileExists(item.mediaPath)) return;
    await projectMediaToScreen({ target, title, mediaPath: item.mediaPath, mediaType: "IMAGE", lockedScreens });
    return;
  }
  if (item.kind === "ANNOUNCEMENT_PDF" && item.mediaPath) {
    if (!await mediaFileExists(item.mediaPath)) return;
    await projectMediaToScreen({ target, title, mediaPath: item.mediaPath, mediaType: "PDF", lockedScreens });
    return;
  }
  if (item.kind === "ANNOUNCEMENT_VIDEO" && item.mediaPath) {
    if (!await mediaFileExists(item.mediaPath)) return;
    await projectMediaToScreen({ target, title, mediaPath: item.mediaPath, mediaType: "VIDEO", lockedScreens });
    return;
  }
  if (item.kind === "TIMER") {
    await projectTextToScreen({ target, title: `TIMER:${title}`, body, lockedScreens });
    return;
  }
  const secondaryTexts = (() => {
    if (!item.secondaryContent) return undefined;
    try { return JSON.parse(item.secondaryContent) as Array<{ label: string; body: string }>; }
    catch (e) {
      console.warn(`[projection] secondaryContent corrompu sur l'item "${item.id}" :`, e);
      return undefined;
    }
  })();
  await projectTextToScreen({ target, title, body, secondaryTexts, backgroundOverride, lockedScreens });
}
