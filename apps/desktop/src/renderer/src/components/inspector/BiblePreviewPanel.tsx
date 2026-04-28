import { useCallback } from "react";
import { BookOpen, Monitor, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLive } from "@/hooks/useLive";
import { usePlan } from "@/hooks/usePlan";
import { ensureReadyForFreeProjection } from "@/lib/liveProjection";
import { projectTextToScreen } from "@/projection/target";
import type { BibleInspectorPreview } from "@/lib/workspaceInspector";

interface BiblePreviewPanelProps {
  preview: BibleInspectorPreview;
  onClose: () => void;
}

export function BiblePreviewPanel({ preview, onClose }: BiblePreviewPanelProps) {
  const { addItem } = usePlan();
  const { live } = useLive();

  const handleAdd = useCallback(async () => {
    const item = await addItem({
      kind: preview.itemKind,
      title: preview.title,
      content: preview.content,
      secondaryContent: preview.secondaryTexts
        ? JSON.stringify(preview.secondaryTexts)
        : undefined,
    });

    if (item) toast.success("Passage ajoute au plan");
    else toast.error("Aucun plan ouvert");
  }, [addItem, preview]);

  const handleProject = useCallback(async () => {
    const currentLive = await ensureReadyForFreeProjection(live);
    if (!currentLive?.enabled) {
      toast.error("Activez le direct ou le mode libre pour projeter");
      return;
    }

    await projectTextToScreen({
      target: currentLive.target,
      lockedScreens: currentLive.lockedScreens,
      title: preview.title,
      body: preview.content,
      secondaryTexts: preview.secondaryTexts,
    });
    toast.success("Passage projete");
  }, [live, preview]);

  return (
    <div className="flex h-full flex-col bg-bg-base">
      <div className="flex items-start justify-between gap-3 border-b border-border bg-bg-surface px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            Bible
          </p>
          <h2 className="mt-1 truncate text-base font-semibold text-text-primary">
            {preview.title}
          </h2>
          {preview.subtitle && (
            <p className="mt-1 text-sm text-text-secondary">{preview.subtitle}</p>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Fermer l'inspecteur"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="rounded-2xl border border-border bg-bg-surface p-4 shadow-sm">
          <div className="flex items-center gap-2 text-text-secondary">
            <BookOpen className="h-4 w-4 text-kind-bible" />
            <span className="text-sm font-medium">
              {preview.translation ? `${preview.translation} · ${preview.itemKind === "BIBLE_VERSE" ? "Verset" : "Passage"}` : preview.itemKind === "BIBLE_VERSE" ? "Verset" : "Passage"}
            </span>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-bg-elevated/35 px-4 py-4">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-text-primary">
              {preview.content}
            </pre>
          </div>

          {preview.secondaryTexts && preview.secondaryTexts.length > 0 && (
            <div className="mt-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                Comparaisons
              </p>
              {preview.secondaryTexts.map((text) => (
                <div
                  key={`${preview.id}-${text.label}`}
                  className="rounded-xl border border-border bg-bg-elevated/30 px-3 py-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                    {text.label}
                  </p>
                  <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-text-secondary">
                    {text.body}
                  </pre>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Actions
            </p>
            <div className="flex flex-wrap gap-2">
              <Button className="gap-2 rounded-xl" onClick={() => void handleProject()}>
                <Monitor className="h-4 w-4" />
                Projeter
              </Button>
              <Button
                variant="outline"
                className="gap-2 rounded-xl"
                onClick={() => void handleAdd()}
              >
                <Plus className="h-4 w-4" />
                Ajouter au plan
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
