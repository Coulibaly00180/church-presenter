import { useCallback, useMemo, useState } from "react";
import { Copy, ExternalLink, Monitor, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { KindBadge } from "@/components/ui/badge";
import { useLive } from "@/hooks/useLive";
import { usePlan } from "@/hooks/usePlan";
import { getPlanKindDefaultTitle } from "@/lib/planKinds";
import { parsePlanBackground, projectPlanItemToTarget } from "@/lib/projection";
import { mediaFileFromPlanItem } from "@/lib/workspaceInspector";
import type { PlanItem } from "@/lib/types";
import { EditItemDialog } from "@/components/dialogs/EditItemDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";

interface PlanItemInspectorProps {
  itemId: string;
  onClose: () => void;
  onInspectSong?: (songId: string) => void;
  onInspectMedia?: (file: CpMediaFile) => void;
}

function parseSecondaryTexts(secondaryContent: string | null | undefined) {
  if (!secondaryContent) return [];
  try {
    return JSON.parse(secondaryContent) as Array<{ label: string; body: string }>;
  } catch {
    return [];
  }
}

export function PlanItemInspector({
  itemId,
  onClose,
  onInspectSong,
  onInspectMedia,
}: PlanItemInspectorProps) {
  const { plan, duplicateItem, removeItem } = usePlan();
  const { live } = useLive();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const item = useMemo(
    () => plan?.items.find((candidate) => candidate.id === itemId) ?? null,
    [itemId, plan],
  );

  const secondaryTexts = useMemo(
    () => parseSecondaryTexts(item?.secondaryContent),
    [item?.secondaryContent],
  );

  const mediaFile = useMemo(() => (item ? mediaFileFromPlanItem(item) : null), [item]);

  const handleProject = useCallback(async () => {
    if (!item || !live) return;
    await projectPlanItemToTarget(
      live.target,
      item as PlanItem,
      live,
      parsePlanBackground(plan?.backgroundConfig),
    );
    toast.success("Element projete");
  }, [item, live, plan]);

  const handleDuplicate = useCallback(async () => {
    if (!item) return;
    await duplicateItem(item.id);
    toast.success("Element duplique");
  }, [duplicateItem, item]);

  const handleDelete = useCallback(async () => {
    if (!item) return;
    await removeItem(item.id);
    setConfirmDeleteOpen(false);
    onClose();
    toast.success("Element supprime");
  }, [item, onClose, removeItem]);

  if (!item) {
    return (
      <div className="flex h-full items-center justify-center bg-bg-base px-6 text-center">
        <p className="text-sm text-text-muted">
          Cet element n&apos;est plus disponible dans le plan.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full flex-col bg-bg-base">
        <div className="flex items-start justify-between gap-3 border-b border-border bg-bg-surface px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Element du plan
            </p>
            <h2 className="mt-1 truncate text-base font-semibold text-text-primary">
              {item.title?.trim() || getPlanKindDefaultTitle(item.kind)}
            </h2>
            <div className="mt-2">
              <KindBadge kind={item.kind as CpPlanItemKind} />
            </div>
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
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                Resume
              </p>
              {item.content ? (
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-text-primary">
                  {item.content}
                </pre>
              ) : mediaFile ? (
                <p className="text-sm text-text-secondary">{mediaFile.name}</p>
              ) : (
                <p className="text-sm text-text-muted">Aucun contenu texte disponible.</p>
              )}
            </div>

            {item.notes && (
              <div className="mt-4 rounded-xl border border-border bg-bg-elevated/35 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  Notes de regie
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                  {item.notes}
                </p>
              </div>
            )}

            {secondaryTexts.length > 0 && (
              <div className="mt-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                  Textes secondaires
                </p>
                {secondaryTexts.map((text) => (
                  <div
                    key={`${item.id}-${text.label}`}
                    className="rounded-xl border border-border bg-bg-elevated/30 px-3 py-3"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                      {text.label}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                      {text.body}
                    </p>
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
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="h-4 w-4" />
                  Modifier
                </Button>
                <Button
                  variant="ghost"
                  className="gap-2 rounded-xl text-text-secondary"
                  onClick={() => void handleDuplicate()}
                >
                  <Copy className="h-4 w-4" />
                  Dupliquer
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {item.kind === "SONG_BLOCK" && item.refId && onInspectSong && (
                  <Button
                    variant="ghost"
                    className="gap-2 rounded-xl text-text-secondary"
                    onClick={() => onInspectSong(item.refId!)}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ouvrir le chant source
                  </Button>
                )}
                {mediaFile && onInspectMedia && (
                  <Button
                    variant="ghost"
                    className="gap-2 rounded-xl text-text-secondary"
                    onClick={() => onInspectMedia(mediaFile)}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ouvrir le media
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="gap-2 rounded-xl text-danger hover:bg-danger/10 hover:text-danger"
                  onClick={() => setConfirmDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EditItemDialog item={item} open={editOpen} onClose={() => setEditOpen(false)} />
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Supprimer l'element"
        description={`Supprimer "${item.title?.trim() || getPlanKindDefaultTitle(item.kind)}" du plan ?`}
        confirmLabel="Supprimer"
        confirmVariant="destructive"
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </>
  );
}
