import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Edit2, Keyboard, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SongEditorDialog } from "@/components/dialogs/SongEditorDialog";
import { cn } from "@/lib/utils";
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

  // Keyboard cursor for block-by-block navigation (same ref pattern as BibleTab)
  const [blockCursor, setBlockCursor] = useState<number | null>(null);
  const blockCursorRef = useRef<number | null>(null);

  // Synchronous refs — updated during render so the keydown callback always reads
  // fresh values without needing a useEffect-based ref update (which is async).
  const liveRef = useRef(live);
  liveRef.current = live;
  const songRef = useRef(song);
  songRef.current = song;

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

  // Reset cursor when the song changes
  useEffect(() => {
    blockCursorRef.current = null;
    setBlockCursor(null);
  }, [songId]);

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
    async (block: CpSongBlock, cursorIndex?: number) => {
      if (!live?.enabled) {
        toast.error("Activez Mode Direct ou Mode Libre pour projeter");
        return;
      }
      if (!song) return;
      if (cursorIndex !== undefined) {
        blockCursorRef.current = cursorIndex;
        setBlockCursor(cursorIndex);
      }
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

  /** Move keyboard cursor by dir (+1 next, -1 prev) and project the block.
   * Reads liveRef/songRef so this callback is stable (empty deps) and never
   * becomes stale when live state updates after each projection.
   */
  const handleBlockCursorMove = useCallback(
    async (dir: 1 | -1) => {
      const currentLive = liveRef.current;
      const currentSong = songRef.current;
      if (!currentSong || !currentLive?.enabled) return;
      const curIdx = blockCursorRef.current ?? -1;
      const nextIdx = Math.max(0, Math.min(currentSong.blocks.length - 1, curIdx + dir));
      const block = currentSong.blocks[nextIdx];
      if (!block) return;
      blockCursorRef.current = nextIdx; // synchronous — rapid keypresses read correct value
      setBlockCursor(nextIdx);
      const fakeItem: PlanItem = {
        id: block.id,
        order: 0,
        kind: "SONG_BLOCK",
        title: currentSong.title,
        content: block.content,
        refId: currentSong.id,
        refSubId: block.id,
      };
      await projectPlanItemToTarget(currentLive.target, fakeItem, currentLive);
    },
    [], // stable — reads live/song from refs
  );

  // Free mode: receive arrow navigation forwarded from projection window
  // (fires when the projection window has focus and user presses arrows there)
  useEffect(() => {
    if (!song || !live?.enabled) return;
    const unsub = window.cp.live.onFreeNavigate((dir) => {
      void handleBlockCursorMove(dir);
    });
    return unsub;
  }, [song?.id, live?.enabled, handleBlockCursorMove]);

  // Arrow key capture — active when song is loaded and any live mode is on (capture phase)
  useEffect(() => {
    if (!song || !live?.enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        void handleBlockCursorMove(1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        void handleBlockCursorMove(-1);
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [song?.id, live?.enabled, handleBlockCursorMove]); // handleBlockCursorMove is stable (empty deps)

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
        <>
          {live?.enabled && (
            <div className="px-4 pt-3 pb-0">
              <p className="flex items-center gap-1 text-[10px] text-text-muted">
                <Keyboard className="h-3 w-3 opacity-50" />
                ← → pour naviguer · clic ▶ pour projeter
              </p>
            </div>
          )}
          <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {song.blocks.map((block, index) => {
              const isCursor = blockCursor === index;
              return (
                <div
                  key={block.id}
                  className={cn(
                    "group rounded-lg border bg-bg-surface overflow-hidden transition-colors",
                    isCursor
                      ? "border-primary/60 ring-1 ring-primary/30"
                      : "border-border",
                  )}
                >
                  {/* Block header */}
                  <div className="flex items-center justify-between px-3 py-1.5 bg-bg-elevated/60 border-b border-border">
                    <div className="flex items-center gap-1.5">
                      {isCursor && (
                        <span className="text-[9px] font-bold text-primary">▶</span>
                      )}
                      <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                        {blockLabel(block)}
                      </span>
                    </div>
                    <div className={cn(
                      "flex gap-0.5 transition-opacity",
                      isCursor ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                    )}>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => void handleProjectBlock(block, index)}
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
              );
            })}
          </div>
          </ScrollArea>
        </>
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
