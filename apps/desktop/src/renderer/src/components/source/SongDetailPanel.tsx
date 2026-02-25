import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Edit2, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SongEditorDialog } from "@/components/dialogs/SongEditorDialog";
import { useLive } from "@/hooks/useLive";
import { usePlan } from "@/hooks/usePlan";
import { projectPlanItemToTarget } from "@/lib/projection";
import type { PlanItem } from "@/lib/types";

interface SongDetailPanelProps {
  songId: string;
  onClose: () => void;
}

function blockLabel(block: CpSongBlock): string {
  return (
    block.title ??
    (block.type === "CHORUS"
      ? "Refrain"
      : block.type === "VERSE"
        ? "Couplet"
        : block.type === "BRIDGE"
          ? "Pont"
          : block.type === "INTRO"
            ? "Intro"
            : block.type === "OUTRO"
              ? "Outro"
              : block.type)
  );
}

export function SongDetailPanel({ songId, onClose }: SongDetailPanelProps) {
  const { live } = useLive();
  const { addItem } = usePlan();
  const [song, setSong] = useState<CpSongDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const loadSong = useCallback(async () => {
    setLoading(true);
    try {
      const detail = await window.cp.songs.get(songId);
      setSong(detail);
    } catch {
      toast.error("Impossible de charger le chant");
    } finally {
      setLoading(false);
    }
  }, [songId]);

  useEffect(() => {
    void loadSong();
  }, [loadSong]);

  const handleAddBlock = useCallback(
    async (block: CpSongBlock) => {
      if (!song) return;
      const item = await addItem({
        kind: "SONG_BLOCK",
        title: `${song.title} — ${blockLabel(block)}`,
        content: block.content,
        refId: song.id,
        refSubId: block.id,
      });
      if (item) toast.success("Ajouté au plan");
    },
    [song, addItem],
  );

  const handleAddAll = useCallback(async () => {
    if (!song || song.blocks.length === 0) return;
    let added = 0;
    for (const block of song.blocks) {
      const item = await addItem({
        kind: "SONG_BLOCK",
        title: `${song.title} — ${blockLabel(block)}`,
        content: block.content,
        refId: song.id,
        refSubId: block.id,
      });
      if (item) added++;
    }
    if (added > 0)
      toast.success(
        `${added} bloc${added > 1 ? "s" : ""} ajouté${added > 1 ? "s" : ""} au plan`,
      );
  }, [song, addItem]);

  const handleProjectBlock = useCallback(
    async (block: CpSongBlock) => {
      if (!live) {
        toast.error("Mode Direct inactif");
        return;
      }
      if (!song) return;
      const fakeItem: PlanItem = {
        id: block.id,
        order: 0,
        kind: "SONG_BLOCK",
        title: song.title,
        content: block.content,
        refId: song.id,
        refSubId: block.id,
      };
      await projectPlanItemToTarget(live.target, fakeItem, live);
    },
    [live, song],
  );

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-bg-base">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0 bg-bg-surface">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Retour au plan"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          {song ? (
            <>
              <p className="text-sm font-semibold text-text-primary truncate">
                {song.title}
              </p>
              {song.artist && (
                <p className="text-xs text-text-muted truncate">{song.artist}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-text-muted">Chargement…</p>
          )}
        </div>
        {song && (
          <div className="flex items-center gap-1 shrink-0">
            {song.blocks.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-7 text-xs"
                onClick={() => void handleAddAll()}
              >
                <Plus className="h-3 w-3" />
                Tout ajouter
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setEditOpen(true)}
              aria-label="Modifier le chant"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        </div>
      ) : !song ? (
        <div className="flex items-center justify-center flex-1 text-text-muted text-sm">
          Chant introuvable
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {song.blocks.map((block) => (
              <div
                key={block.id}
                className="group rounded-lg border border-border bg-bg-surface overflow-hidden"
              >
                {/* Block header */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-bg-elevated/60 border-b border-border">
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    {blockLabel(block)}
                  </span>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => void handleProjectBlock(block)}
                      title="Projeter"
                      aria-label={`Projeter ${blockLabel(block)}`}
                      className="h-6 w-6 text-text-muted hover:text-primary"
                    >
                      <span className="text-[10px] leading-none">▶</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => void handleAddBlock(block)}
                      title="Ajouter au plan"
                      aria-label={`Ajouter ${blockLabel(block)} au plan`}
                      className="h-6 w-6 text-text-muted hover:text-success"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {/* Block content */}
                <pre className="px-3 py-2.5 text-sm text-text-primary font-sans whitespace-pre-wrap leading-relaxed">
                  {block.content}
                </pre>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {song && (
        <SongEditorDialog
          open={editOpen}
          songId={song.id}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            void loadSong();
          }}
        />
      )}
    </div>
  );
}
