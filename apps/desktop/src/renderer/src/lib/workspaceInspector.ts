export interface BibleInspectorPreview {
  id: string;
  title: string;
  subtitle?: string;
  content: string;
  itemKind: "BIBLE_VERSE" | "BIBLE_PASSAGE";
  translation?: string;
  secondaryTexts?: Array<{ label: string; body: string }>;
}

export type WorkspaceInspectorState =
  | { kind: "SONG"; songId: string }
  | { kind: "MEDIA"; file: CpMediaFile }
  | { kind: "BIBLE"; preview: BibleInspectorPreview }
  | { kind: "PLAN_ITEM"; itemId: string };

export function mediaFileFromPlanItem(item: CpPlanItem): CpMediaFile | null {
  if (!item.mediaPath) return null;
  const name = item.title ?? item.mediaPath.split(/[\\/]/).pop() ?? "Media";
  const folder: CpLibraryFileFolder =
    item.kind === "ANNOUNCEMENT_IMAGE"
      ? "images"
      : item.kind === "ANNOUNCEMENT_PDF"
        ? "documents"
        : "videos";

  if (item.kind === "ANNOUNCEMENT_IMAGE") {
    return { path: item.mediaPath, name, kind: "IMAGE", folder };
  }
  if (item.kind === "ANNOUNCEMENT_PDF") {
    return { path: item.mediaPath, name, kind: "PDF", folder };
  }
  if (item.kind === "ANNOUNCEMENT_VIDEO") {
    return { path: item.mediaPath, name, kind: "VIDEO", folder };
  }

  return null;
}
