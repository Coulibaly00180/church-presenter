import { useCallback, useEffect, useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DndContext, DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Modifier } from "@dnd-kit/core";

const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 });
import { CSS } from "@dnd-kit/utilities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface SongEditorDialogProps {
  songId?: string;
  open: boolean;
  onClose: () => void;
  onSaved?: (song: CpSongDetail) => void;
}

type EditableBlock = {
  id: string;
  type: string;
  title: string;
  content: string;
};

let blockCounter = 0;
function newBlockId() { return `new-${++blockCounter}`; }

export function SongEditorDialog({ songId, open, onClose, onSaved }: SongEditorDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [blocks, setBlocks] = useState<EditableBlock[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState("");

  // Load song on open
  useEffect(() => {
    if (!open) return;
    if (!songId) {
      // New song
      setTitle("");
      setArtist("");
      setBlocks([{ id: newBlockId(), type: "VERSE", title: "Couplet 1", content: "" }]);
      setActiveBlockId(null);
      return;
    }
    setLoading(true);
    void window.cp.songs.get(songId).then((song) => {
      if (!song) return;
      setTitle(song.title);
      setArtist(song.artist ?? "");
      setBlocks(song.blocks.map((b) => ({
        id: b.id,
        type: b.type,
        title: b.title ?? b.type,
        content: b.content,
      })));
      setActiveBlockId(song.blocks[0]?.id ?? null);
    }).finally(() => setLoading(false));
  }, [songId, open]);

  // Update preview when active block changes
  useEffect(() => {
    const active = blocks.find((b) => b.id === activeBlockId);
    setPreviewContent(active?.content ?? "");
  }, [activeBlockId, blocks]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const updateBlock = useCallback((id: string, field: keyof EditableBlock, value: string) => {
    setBlocks((prev) => prev.map((b) => b.id === id ? { ...b, [field]: value } : b));
    if (field === "content" && id === activeBlockId) setPreviewContent(value);
  }, [activeBlockId]);

  const addBlock = useCallback(() => {
    const id = newBlockId();
    setBlocks((prev) => [
      ...prev,
      { id, type: "VERSE", title: `Couplet ${prev.filter((b) => b.type === "VERSE").length + 1}`, content: "" },
    ]);
    setActiveBlockId(id);
  }, []);

  const removeBlock = useCallback((id: string) => {
    setBlocks((prev) => {
      const next = prev.filter((b) => b.id !== id);
      if (activeBlockId === id) setActiveBlockId(next[0]?.id ?? null);
      return next;
    });
  }, [activeBlockId]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks((prev) => {
      const from = prev.findIndex((b) => b.id === active.id);
      const to = prev.findIndex((b) => b.id === over.id);
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      if (moved) next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!title.trim()) { toast.error("Le titre est requis"); return; }
    setSaving(true);
    try {
      let song: CpSongDetail;
      if (songId) {
        await window.cp.songs.updateMeta({ id: songId, title: title.trim(), artist: artist.trim() || undefined });
        const updated = await window.cp.songs.replaceBlocks({
          songId,
          blocks: blocks.map((b, i) => ({
            order: i + 1,
            type: b.type,
            title: b.title.trim() || b.type,
            content: b.content,
          })),
        });
        if (!updated) throw new Error("Échec de la sauvegarde");
        song = updated;
      } else {
        const created = await window.cp.songs.create({ title: title.trim(), artist: artist.trim() || undefined });
        const withBlocks = await window.cp.songs.replaceBlocks({
          songId: created.id,
          blocks: blocks.map((b, i) => ({
            order: i + 1,
            type: b.type,
            title: b.title.trim() || b.type,
            content: b.content,
          })),
        });
        song = withBlocks ?? created;
      }
      toast.success(songId ? "Chant mis à jour" : "Chant créé");
      onSaved?.(song);
      onClose();
    } catch (err) {
      toast.error("Échec de la sauvegarde", { description: String(err) });
    } finally {
      setSaving(false);
    }
  }, [title, artist, blocks, songId, onSaved, onClose]);

  const activeBlock = blocks.find((b) => b.id === activeBlockId);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        showClose
      >
        <DialogHeader>
          <DialogTitle>{songId ? "Modifier le chant" : "Nouveau chant"}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <DialogBody>
            <div className="flex items-center justify-center py-8 text-text-muted">
              Chargement…
            </div>
          </DialogBody>
        ) : (
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Left: meta + blocks list */}
            <div className="flex flex-col w-56 border-r border-border p-3 gap-3 shrink-0">
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Titre</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre du chant" />
                </div>
                <div>
                  <Label className="text-xs">Artiste</Label>
                  <Input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Auteur (optionnel)" />
                </div>
              </div>

              <Separator />

              <div className="flex-1 overflow-auto">
                <p className="text-xs font-medium text-text-muted mb-1 uppercase tracking-wide">Blocs</p>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  modifiers={[restrictToVerticalAxis]}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-0.5">
                      {blocks.map((block) => (
                        <SortableBlockItem
                          key={block.id}
                          block={block}
                          isActive={block.id === activeBlockId}
                          onSelect={() => setActiveBlockId(block.id)}
                          onRemove={() => removeBlock(block.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>

              <Button variant="outline" size="sm" className="gap-1.5" onClick={addBlock}>
                <Plus className="h-3.5 w-3.5" />
                Ajouter un bloc
              </Button>
            </div>

            {/* Right: block editor + preview */}
            <div className="flex flex-col flex-1 overflow-hidden">
              {activeBlock ? (
                <div className="flex flex-col h-full">
                  {/* Block meta */}
                  <div className="flex gap-2 p-3 border-b border-border">
                    <Input
                      placeholder="Titre du bloc (ex: Couplet 1)"
                      value={activeBlock.title}
                      onChange={(e) => updateBlock(activeBlock.id, "title", e.target.value)}
                      className="flex-1"
                    />
                    <select
                      aria-label="Type de bloc"
                      value={activeBlock.type}
                      onChange={(e) => updateBlock(activeBlock.id, "type", e.target.value)}
                      className="px-2 py-1 text-sm rounded-md border border-border bg-bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="VERSE">Couplet</option>
                      <option value="CHORUS">Refrain</option>
                      <option value="BRIDGE">Pont</option>
                      <option value="INTRO">Intro</option>
                      <option value="OUTRO">Outro</option>
                    </select>
                  </div>

                  {/* Editor + preview side by side */}
                  <div className="flex flex-1 overflow-hidden">
                    <textarea
                      value={activeBlock.content}
                      onChange={(e) => updateBlock(activeBlock.id, "content", e.target.value)}
                      placeholder="Contenu du bloc…"
                      className="flex-1 p-3 text-sm bg-bg-surface text-text-primary placeholder:text-text-muted focus:outline-none resize-none border-r border-border"
                    />
                    {/* Preview */}
                    <div className="w-48 shrink-0 flex items-center justify-center p-3 text-center bg-black">
                      <p
                        className="text-white text-[11px] leading-relaxed whitespace-pre-wrap"
                      >
                        {previewContent || <span className="opacity-30">Aperçu</span>}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center text-text-muted text-sm">
                  Sélectionnez un bloc
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>Annuler</Button>
          <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SortableBlockItem({
  block,
  isActive,
  onSelect,
  onRemove,
}: {
  block: EditableBlock;
  isActive: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const dndStyle: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={dndStyle}
      className={cn(
        "flex items-center gap-1 rounded px-1.5 py-1 cursor-pointer transition-colors",
        isActive ? "bg-bg-elevated text-text-primary" : "hover:bg-bg-elevated text-text-secondary",
        isDragging && "opacity-50"
      )}
      onClick={onSelect}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-0.5 text-text-muted hover:text-text-secondary"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <span className="flex-1 text-xs truncate">{block.title || block.type}</span>
      <button
        type="button"
        className="opacity-0 group-hover:opacity-100 p-0.5 text-text-muted hover:text-danger"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        tabIndex={-1}
        aria-label="Supprimer ce bloc"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
