import { useCallback, useDeferredValue, useEffect, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Modifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Clipboard, ClipboardList, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePlan } from "@/hooks/usePlan";
import { useLive } from "@/hooks/useLive";
import { reorderPlanItems } from "@/lib/reorder";
import type { PlanItem } from "@/lib/types";
import { AddItemDialog } from "@/components/dialogs/AddItemDialog";
import { SongEditorDialog } from "@/components/dialogs/SongEditorDialog";
import { EditItemDialog } from "@/components/dialogs/EditItemDialog";
import { ServicePreviewDialog } from "@/components/dialogs/ServicePreviewDialog";
import { PlanItemCard, PlanItemCardGhost } from "./PlanItemCard";
import { PlanToolbar } from "./PlanToolbar";
import { Dashboard } from "./Dashboard";
import { isPlanKindMedia } from "@/lib/planKinds";

const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 });

interface QuickStartConfig {
  visible: boolean;
  importing: boolean;
  onDismiss: () => void;
  onCreateSong: () => void;
  onImportData: () => void;
}

interface PlanEditorProps {
  quickStart?: QuickStartConfig;
  onInspectItem?: (itemId: string) => void;
  inspectedItemId?: string | null;
}

export function PlanEditor({ quickStart, onInspectItem, inspectedItemId }: PlanEditorProps) {
  const { plan, reorder, loadingPlan, addItem, removeItems } = usePlan();
  const { live } = useLive();
  const [activeItem, setActiveItem] = useState<CpPlanItem | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editSongId, setEditSongId] = useState<string | null>(null);
  const [songEditorOpen, setSongEditorOpen] = useState(false);
  const [editItem, setEditItem] = useState<CpPlanItem | null>(null);
  const [editItemOpen, setEditItemOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [clipboard, setClipboard] = useState<CpPlanItem | null>(null);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const handleCopyItem = useCallback((item: CpPlanItem) => {
    setClipboard(item);
  }, []);

  const handlePaste = useCallback(async () => {
    if (!clipboard) return;
    await addItem({
      kind: clipboard.kind as CpPlanItemKind,
      title: clipboard.title ?? undefined,
      content: clipboard.content ?? undefined,
      notes: clipboard.notes ?? undefined,
      refId: clipboard.refId ?? undefined,
      refSubId: clipboard.refSubId ?? undefined,
      mediaPath: clipboard.mediaPath ?? undefined,
      secondaryContent: clipboard.secondaryContent ?? undefined,
      backgroundConfig: clipboard.backgroundConfig ?? undefined,
    });
  }, [clipboard, addItem]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "v" && clipboard) {
        const tag = (event.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        event.preventDefault();
        void handlePaste();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [clipboard, handlePaste]);

  const toggleItemSelection = useCallback((id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBatchDelete = useCallback(async () => {
    const ids = [...selectedItemIds];
    setSelectedItemIds(new Set());
    await removeItems(ids);
  }, [selectedItemIds, removeItems]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const item = plan?.items.find((candidate) => candidate.id === event.active.id);
    setActiveItem(item ?? null);
  }, [plan]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveItem(null);
    const { active, over } = event;
    if (!over || active.id === over.id || !plan) return;

    const result = reorderPlanItems({
      items: plan.items as PlanItem[],
      visibleItems: plan.items as PlanItem[],
      filterSongsOnly: false,
      activeId: String(active.id),
      overId: String(over.id),
    });

    if (result) {
      await reorder(result.orderedItemIds);
    }
  }, [plan, reorder]);

  const handleEdit = useCallback((item: CpPlanItem) => {
    if (onInspectItem) {
      onInspectItem(item.id);
      return;
    }
    if (item.kind === "SONG_BLOCK" && item.refId) {
      setEditSongId(item.refId);
      setSongEditorOpen(true);
    } else if (
      item.kind === "TIMER" ||
      item.kind === "ANNOUNCEMENT_TEXT" ||
      item.kind === "VERSE_MANUAL"
    ) {
      setEditItem(item);
      setEditItemOpen(true);
    }
  }, [onInspectItem]);

  const handleEditBackground = useCallback((item: CpPlanItem) => {
    if (onInspectItem) {
      onInspectItem(item.id);
      return;
    }
    setEditItem(item);
    setEditItemOpen(true);
  }, [onInspectItem]);

  const handleSelectKind = useCallback(async (kind: CpPlanItemKind) => {
    if (kind === "SONG_BLOCK") {
      setEditSongId(null);
      setSongEditorOpen(true);
    } else if (isPlanKindMedia(kind)) {
      const result = await window.cp.files.pickMedia();
      if (!result.ok || !("path" in result)) return;
      const title = result.path.split(/[\\/]/).pop() ?? "";
      await addItem({ kind, title, mediaPath: result.path });
    } else {
      await addItem({ kind });
    }
  }, [addItem]);

  if (!plan) {
    return (
      <>
        <Dashboard
          showQuickStart={quickStart?.visible}
          importingData={quickStart?.importing}
          onDismissQuickStart={quickStart?.onDismiss}
          onCreateSong={quickStart?.onCreateSong}
          onImportData={quickStart?.onImportData}
        />
        <AddItemDialog
          open={addDialogOpen}
          onClose={() => setAddDialogOpen(false)}
          onSelect={(kind) => void handleSelectKind(kind)}
        />
      </>
    );
  }

  const currentCursor = live?.enabled && live.planId === plan.id ? live.cursor : -1;
  const liveItem = currentCursor >= 0 ? plan.items[currentCursor] : null;

  const normalizedQuery = deferredSearchQuery.trim().toLowerCase();
  const filteredItems = normalizedQuery
    ? plan.items.filter((item) => {
        const title = item.title?.toLowerCase() ?? "";
        const content = item.content?.toLowerCase() ?? "";
        return title.includes(normalizedQuery) || content.includes(normalizedQuery);
      })
    : plan.items;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PlanToolbar onAddItem={() => setAddDialogOpen(true)} onPreview={() => setPreviewOpen(true)} />

      {plan.items.length > 0 && (
        <div className="flex items-center gap-3 border-b border-border bg-bg-surface px-4 py-3 shrink-0">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Rechercher dans le plan…"
              className="h-9 bg-bg-base/70 pl-9 pr-9 text-sm"
              aria-label="Rechercher dans le plan"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text-primary"
                aria-label="Effacer la recherche"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {normalizedQuery && (
            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-full border border-border bg-bg-elevated px-2.5 py-1 text-xs font-medium text-text-secondary">
                {filteredItems.length} résultat{filteredItems.length > 1 ? "s" : ""}
              </span>
              <Button
                variant="ghost"
                size="xs"
                className="rounded-lg text-text-secondary"
                onClick={() => setSearchQuery("")}
              >
                Effacer
              </Button>
            </div>
          )}
        </div>
      )}

      {loadingPlan ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="animate-pulse text-sm text-text-muted">Chargement…</div>
        </div>
      ) : plan.items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center text-text-muted">
          <ClipboardList className="h-14 w-14 opacity-20" />
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-text-secondary">Plan vide</p>
            <p className="text-sm leading-relaxed">
              Ajoute du contenu depuis le panneau de gauche : chants, versets bibliques,
              annonces, médias ou minuterie.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Ajouter un élément
          </Button>
        </div>
      ) : (
        <>
          <ScrollArea className="flex-1">
            {normalizedQuery ? (
              <div className="flex flex-col gap-1 p-3">
                {filteredItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                    <p className="text-sm font-medium text-text-secondary">
                      Aucun résultat pour « {searchQuery} »
                    </p>
                    <p className="max-w-xs text-sm leading-relaxed text-text-muted">
                      Essayez un autre mot-clé ou effacez le filtre pour retrouver tout le plan.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
                      Effacer la recherche
                    </Button>
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const originalIndex = plan.items.indexOf(item);
                    return (
                      <PlanItemCard
                        key={item.id}
                        item={item}
                        index={originalIndex}
                        isCurrentLive={originalIndex === currentCursor}
                        isSelected={selectedItemIds.has(item.id)}
                        isInspectorActive={inspectedItemId === item.id}
                        onEdit={handleEdit}
                        onEditBackground={item.kind === "SONG_BLOCK" ? handleEditBackground : undefined}
                        onCopy={handleCopyItem}
                        onToggleSelect={toggleItemSelection}
                      />
                    );
                  })
                )}
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis]}
                onDragStart={handleDragStart}
                onDragEnd={(event) => void handleDragEnd(event)}
              >
                <SortableContext
                  items={plan.items.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col gap-1 p-3">
                    {plan.items.map((item, index) => (
                      <PlanItemCard
                        key={item.id}
                        item={item}
                        index={index}
                        isCurrentLive={index === currentCursor}
                        isSelected={selectedItemIds.has(item.id)}
                        isInspectorActive={inspectedItemId === item.id}
                        onEdit={handleEdit}
                        onEditBackground={item.kind === "SONG_BLOCK" ? handleEditBackground : undefined}
                        onCopy={handleCopyItem}
                        onToggleSelect={toggleItemSelection}
                      />
                    ))}
                  </div>
                </SortableContext>

                <DragOverlay>
                  {activeItem && <PlanItemCardGhost item={activeItem} />}
                </DragOverlay>
              </DndContext>
            )}
          </ScrollArea>

          {selectedItemIds.size > 0 ? (
            <div className="flex items-center justify-between border-t border-danger/30 bg-danger/5 px-4 py-2 shrink-0">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-danger">
                  Sélection multiple
                </p>
                <p className="text-sm font-medium text-danger">
                  {selectedItemIds.size} élément{selectedItemIds.size > 1 ? "s" : ""} sélectionné{selectedItemIds.size > 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-text-secondary"
                  onClick={() => setSelectedItemIds(new Set())}
                >
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  size="xs"
                  className="gap-1"
                  onClick={() => void handleBatchDelete()}
                >
                  <Trash2 className="h-3 w-3" />
                  Supprimer
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between border-t border-border bg-bg-surface px-4 py-2 shrink-0">
              <div className="min-w-0">
                <p className="text-xs text-text-muted">
                  {plan.items.length} élément{plan.items.length !== 1 ? "s" : ""}
                </p>
                {liveItem && (
                  <p className="truncate text-xs text-primary">
                    En direct: {liveItem.title?.trim() || "Élément actif"}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {clipboard && (
                  <div className="flex items-center gap-2 rounded-full border border-border bg-bg-elevated px-2 py-1">
                    <span className="max-w-[160px] truncate text-xs text-text-secondary">
                      Presse-papiers: {clipboard.title ?? "Élément copié"}
                    </span>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="gap-1 text-primary"
                      onClick={() => void handlePaste()}
                      title={`Coller « ${clipboard.title ?? "—"} » (Ctrl+V)`}
                    >
                      <Clipboard className="h-3.5 w-3.5" />
                      Coller
                    </Button>
                    <button
                      type="button"
                      className="text-text-muted transition-colors hover:text-text-primary"
                      onClick={() => setClipboard(null)}
                      aria-label="Effacer le presse-papier"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="xs"
                  className="gap-1 text-text-secondary"
                  onClick={() => setAddDialogOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <AddItemDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSelect={(kind) => void handleSelectKind(kind)}
      />

      <SongEditorDialog
        songId={editSongId ?? undefined}
        open={songEditorOpen}
        onClose={() => { setSongEditorOpen(false); setEditSongId(null); }}
      />

      <EditItemDialog
        item={editItem}
        open={editItemOpen}
        onClose={() => { setEditItemOpen(false); setEditItem(null); }}
      />

      {plan && (
        <ServicePreviewDialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          plan={plan}
        />
      )}
    </div>
  );
}
