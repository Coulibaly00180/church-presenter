import { Button } from "@/components/ui/button";
import { SongDetailPanel } from "@/components/source/SongDetailPanel";
import { MediaDetailPanel } from "./MediaDetailPanel";
import { BiblePreviewPanel } from "./BiblePreviewPanel";
import { PlanItemInspector } from "./PlanItemInspector";
import type { WorkspaceInspectorState } from "@/lib/workspaceInspector";

interface WorkspaceInspectorProps {
  state: WorkspaceInspectorState | null;
  onClose: () => void;
  onInspectSong?: (songId: string) => void;
  onInspectMedia?: (file: CpMediaFile) => void;
}

export function WorkspaceInspector({
  state,
  onClose,
  onInspectSong,
  onInspectMedia,
}: WorkspaceInspectorProps) {
  if (!state) {
    return (
      <div className="flex h-full flex-col bg-bg-base">
        <div className="border-b border-border bg-bg-surface px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            Inspecteur
          </p>
          <h2 className="mt-1 text-base font-semibold text-text-primary">
            Aucun detail ouvert
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            Ouvrez un chant, un media, un passage biblique ou un element du plan pour
            inspecter son contenu sans perdre le plan de vue.
          </p>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <div className="max-w-sm space-y-3">
            <p className="text-sm text-text-muted">
              L&apos;inspecteur accompagne la preparation et le direct. Il reste secondaire,
              le plan de service reste au centre.
            </p>
            <Button variant="outline" className="rounded-xl" disabled>
              Selectionnez un contenu
            </Button>
          </div>
        </div>
      </div>
    );
  }

  switch (state.kind) {
    case "SONG":
      return <SongDetailPanel songId={state.songId} onClose={onClose} />;

    case "MEDIA":
      return <MediaDetailPanel file={state.file} onClose={onClose} />;

    case "BIBLE":
      return <BiblePreviewPanel preview={state.preview} onClose={onClose} />;

    case "PLAN_ITEM":
      return (
        <PlanItemInspector
          itemId={state.itemId}
          onClose={onClose}
          onInspectSong={onInspectSong}
          onInspectMedia={onInspectMedia}
        />
      );
  }
}
