import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { PlanEditor } from "@/components/plan/PlanEditor";
import { SourcePanel } from "@/components/source/SourcePanel";
import { SongEditorDialog } from "@/components/dialogs/SongEditorDialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { WorkspaceInspector } from "@/components/inspector/WorkspaceInspector";
import type { BibleInspectorPreview, WorkspaceInspectorState } from "@/lib/workspaceInspector";

const DESKTOP_INSPECTOR_BREAKPOINT = 1280;

export function MainPage() {
  const [showWelcome, setShowWelcome] = useState<boolean | null>(null);
  const [songEditorOpen, setSongEditorOpen] = useState(false);
  const [importingWelcome, setImportingWelcome] = useState(false);
  const [inspectorState, setInspectorState] = useState<WorkspaceInspectorState | null>(null);
  const [wideInspector, setWideInspector] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth >= DESKTOP_INSPECTOR_BREAKPOINT,
  );

  useEffect(() => {
    void Promise.all([
      window.cp.songs.list(),
      window.cp.plans.list(),
    ]).then(([songs, plans]) => {
      setShowWelcome(songs.length === 0 && plans.length === 0);
    });
  }, []);

  useEffect(() => {
    const onResize = () => {
      setWideInspector(window.innerWidth >= DESKTOP_INSPECTOR_BREAKPOINT);
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleImportWelcome = async () => {
    setImportingWelcome(true);
    try {
      const result = await window.cp.data.importAll({ mode: "MERGE" });
      if (result.ok) {
        toast.success(
          `Import terminé — ${result.counts.songs} chant${result.counts.songs !== 1 ? "s" : ""}, ${result.counts.plans} plan${result.counts.plans !== 1 ? "s" : ""}`,
        );
        setShowWelcome(false);
      } else if (!("canceled" in result)) {
        toast.error("Import échoué", { description: "error" in result ? result.error : undefined });
      }
    } finally {
      setImportingWelcome(false);
    }
  };

  const inspectedSongId = inspectorState?.kind === "SONG" ? inspectorState.songId : null;
  const inspectedMediaPath =
    inspectorState?.kind === "MEDIA" ? inspectorState.file.path : null;
  const inspectedItemId = inspectorState?.kind === "PLAN_ITEM" ? inspectorState.itemId : null;
  const inspectorOpen = inspectorState !== null;

  const openSongInspector = useCallback((songId: string) => {
    setInspectorState({ kind: "SONG", songId });
  }, []);

  const openMediaInspector = useCallback((file: CpMediaFile) => {
    setInspectorState({ kind: "MEDIA", file });
  }, []);

  const openPlanItemInspector = useCallback((itemId: string) => {
    setInspectorState({ kind: "PLAN_ITEM", itemId });
  }, []);

  const handleBiblePreview = useCallback((preview: BibleInspectorPreview | null) => {
    setInspectorState((current) => {
      if (!preview) {
        return current?.kind === "BIBLE" ? null : current;
      }
      if (
        current?.kind === "BIBLE" &&
        current.preview.id === preview.id &&
        current.preview.title === preview.title &&
        current.preview.subtitle === preview.subtitle &&
        current.preview.content === preview.content
      ) {
        return current;
      }
      return { kind: "BIBLE", preview };
    });
  }, []);

  return (
    <AppShell>
      <div className="relative flex flex-1 overflow-hidden">
        <SourcePanel
          onSelectSong={openSongInspector}
          onInspectMedia={openMediaInspector}
          onInspectBible={handleBiblePreview}
          inspectedSongId={inspectedSongId}
          inspectedMediaPath={inspectedMediaPath}
        />

        <PlanEditor
          quickStart={{
            visible: showWelcome === true,
            importing: importingWelcome,
            onDismiss: () => setShowWelcome(false),
            onCreateSong: () => setSongEditorOpen(true),
            onImportData: () => void handleImportWelcome(),
          }}
          onInspectItem={openPlanItemInspector}
          inspectedItemId={inspectedItemId}
        />

        {wideInspector && (
          <aside className="hidden h-full w-[360px] shrink-0 border-l border-border bg-bg-surface xl:flex xl:flex-col">
            <WorkspaceInspector
              state={inspectorState}
              onClose={() => setInspectorState(null)}
              onInspectSong={openSongInspector}
              onInspectMedia={openMediaInspector}
            />
          </aside>
        )}
      </div>

      {!wideInspector && (
        <Sheet open={inspectorOpen} onOpenChange={(nextOpen) => !nextOpen && setInspectorState(null)}>
          <SheetContent side="right" className="w-full max-w-md p-0">
            <SheetTitle className="sr-only">Inspecteur de contenu</SheetTitle>
            <SheetDescription className="sr-only">
              Detail du chant, du media, du passage biblique ou de l&apos;element de plan selectionne.
            </SheetDescription>
            <WorkspaceInspector
              state={inspectorState}
              onClose={() => setInspectorState(null)}
              onInspectSong={openSongInspector}
              onInspectMedia={openMediaInspector}
            />
          </SheetContent>
        </Sheet>
      )}

      <SongEditorDialog
        open={songEditorOpen}
        onClose={() => setSongEditorOpen(false)}
        onSaved={() => {
          setSongEditorOpen(false);
          setShowWelcome(false);
        }}
      />
    </AppShell>
  );
}
