import { useCallback, useEffect, useState } from "react";
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

const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 });

export function PlanEditor() {
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

  // Ctrl+V → paste
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "v" && clipboard) {
        // Don't intercept when typing in inputs/textareas
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
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
    const item = plan?.items.find((i) => i.id === event.active.id);
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
  }, []);

  const handleEditBackground = useCallback((item: CpPlanItem) => {
    setEditItem(item);
    setEditItemOpen(true);
  }, []);

  const handleSelectKind = useCallback(async (kind: CpPlanItemKind) => {
    if (kind === "SONG_BLOCK") {
      setEditSongId(null);
      setSongEditorOpen(true);
    } else {
      await addItem({ kind });
    }
  }, [addItem]);

  if (!plan) {
    return (
      <>
        <Dashboard />
        <AddItemDialog
          open={addDialogOpen}
          onClose={() => setAddDialogOpen(false)}
          onSelect={(kind) => void handleSelectKind(kind)}
        />
      </>
    );
  }

  const currentCursor = live?.enabled && live.planId === plan.id ? live.cursor : -1;

  const normalizedQuery = searchQuery.trim().toLowerCase();
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

      {/* Search bar */}
      {plan.items.length > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border bg-bg-surface shrink-0">
          <Search className="h-3.5 w-3.5 text-text-muted shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher dans le plan…"
            className="flex-1 text-xs bg-transparent outline-none text-text-primary placeholder:text-text-muted"
            aria-label="Rechercher dans le plan"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-text-muted hover:text-text-primary"
              aria-label="Effacer la recherche"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {loadingPlan ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-sm text-text-muted animate-pulse">Chargement…</div>
        </div>
      ) : plan.items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-text-muted px-8 text-center">
          <ClipboardList className="h-14 w-14 opacity-20" />
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-text-secondary">Plan vide</p>
            <p className="text-xs leading-relaxed">
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
              // Search mode: plain list, no DnD
              <div className="flex flex-col gap-1 p-3">
                {filteredItems.length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-6">Aucun résultat pour « {searchQuery} »</p>
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
                onDragEnd={(e) => void handleDragEnd(e)}
              >
                <SortableContext
                  items={plan.items.map((i) => i.id)}
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

          {/* Footer — selection mode or normal */}
          {selectedItemIds.size > 0 ? (
            <div className="flex items-center justify-between px-4 py-2 border-t border-danger/30 bg-danger/5 shrink-0">
              <span className="text-xs text-danger font-medium">
                {selectedItemIds.size} élément{selectedItemIds.size > 1 ? "s" : ""} sélectionné{selectedItemIds.size > 1 ? "s" : ""}
              </span>
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
            <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-bg-surface shrink-0">
              <span className="text-xs text-text-muted">
                {plan.items.length} élément{plan.items.length !== 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-1">
                {clipboard && (
                  <>
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
                      className="text-text-muted hover:text-text-primary transition-colors"
                      onClick={() => setClipboard(null)}
                      aria-label="Effacer le presse-papier"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <span className="text-border text-xs mx-0.5">|</span>
                  </>
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
