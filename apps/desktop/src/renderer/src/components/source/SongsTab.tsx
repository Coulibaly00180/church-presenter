import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Music2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useLive } from "@/hooks/useLive";
import { usePlan } from "@/hooks/usePlan";
import { projectPlanItemToTarget } from "@/lib/projection";
import type { PlanItem } from "@/lib/types";

export function SongsTab() {
  const { live } = useLive();
  const { addItem } = usePlan();
  const [query, setQuery] = useState("");
  const [songs, setSongs] = useState<CpSongListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [songDetail, setSongDetail] = useState<CpSongDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadSongs = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const list = await window.cp.songs.list(q || undefined);
      setSongs(list);
    } catch {
      toast.error("Impossible de charger les chants");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSongs("");
  }, [loadSongs]);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void loadSongs(value), 250);
  }, [loadSongs]);

  const handleExpand = useCallback(async (songId: string) => {
    if (expandedId === songId) {
      setExpandedId(null);
      setSongDetail(null);
      return;
    }
    setExpandedId(songId);
    setSongDetail(null);
    setLoadingDetail(true);
    try {
      const detail = await window.cp.songs.get(songId);
      setSongDetail(detail);
    } catch {
      toast.error("Impossible de charger le chant");
    } finally {
      setLoadingDetail(false);
    }
  }, [expandedId]);

  const handleAddBlock = useCallback(async (song: CpSongListItem, block: CpSongBlock) => {
    const item = await addItem({
      kind: "SONG_BLOCK",
      title: `${song.title} — ${block.title ?? block.type}`,
      content: block.content,
      refId: song.id,
      refSubId: block.id,
    });
    if (item) toast.success("Ajouté au plan");
  }, [addItem]);

  const handleProjectBlock = useCallback(async (song: CpSongListItem, block: CpSongBlock) => {
    if (!live) {
      toast.error("Mode Direct inactif");
      return;
    }
    const fakeItem: PlanItem = {
      id: block.id,
      order: 0,
      kind: "SONG_BLOCK",
      title: `${song.title} — ${block.title ?? block.type}`,
      content: block.content,
      refId: song.id,
      refSubId: block.id,
    };
    await projectPlanItemToTarget(live.target, fakeItem, live);
  }, [live]);

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-3 py-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
          <Input
            placeholder="Rechercher un chant…"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
          </div>
        ) : songs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-text-muted">
            <Music2 className="h-8 w-8 opacity-40" />
            <p className="text-sm">Aucun chant trouvé</p>
          </div>
        ) : (
          <div className="py-1">
            {songs.map((song) => (
              <SongRow
                key={song.id}
                song={song}
                isExpanded={expandedId === song.id}
                songDetail={expandedId === song.id ? songDetail : null}
                loadingDetail={expandedId === song.id && loadingDetail}
                onExpand={() => void handleExpand(song.id)}
                onAddBlock={(block) => void handleAddBlock(song, block)}
                onProjectBlock={(block) => void handleProjectBlock(song, block)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

interface SongRowProps {
  song: CpSongListItem;
  isExpanded: boolean;
  songDetail: CpSongDetail | null;
  loadingDetail: boolean;
  onExpand: () => void;
  onAddBlock: (block: CpSongBlock) => void;
  onProjectBlock: (block: CpSongBlock) => void;
}

function SongRow({
  song,
  isExpanded,
  songDetail,
  loadingDetail,
  onExpand,
  onAddBlock,
  onProjectBlock,
}: SongRowProps) {
  return (
    <div className="group">
      {/* Song header row */}
      <button
        className={cn(
          "flex w-full items-center gap-2 px-3 py-2 text-left",
          "hover:bg-bg-elevated transition-colors",
          isExpanded && "bg-bg-elevated"
        )}
        onClick={onExpand}
        aria-expanded={isExpanded}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-text-secondary" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{song.title}</p>
          {song.artist && (
            <p className="text-xs text-text-muted truncate">{song.artist}</p>
          )}
        </div>
      </button>

      {/* Expanded blocks */}
      {isExpanded && (
        <div className="bg-bg-elevated border-b border-border">
          {loadingDetail ? (
            <div className="flex justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
            </div>
          ) : songDetail?.blocks.map((block) => (
            <BlockRow
              key={block.id}
              block={block}
              onAdd={() => onAddBlock(block)}
              onProject={() => onProjectBlock(block)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface BlockRowProps {
  block: CpSongBlock;
  onAdd: () => void;
  onProject: () => void;
}

function BlockRow({ block, onAdd, onProject }: BlockRowProps) {
  const blockLabel = block.title ?? (block.type === "CHORUS" ? "Refrain" : block.type === "VERSE" ? "Couplet" : block.type);

  return (
    <div className="flex items-center gap-2 pl-8 pr-3 py-1.5 hover:bg-bg-surface/60 group/block">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-text-secondary">{blockLabel}</p>
        <p className="text-xs text-text-muted truncate">{block.content.slice(0, 80)}</p>
      </div>
      <div className="flex gap-1 opacity-0 group-hover/block:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onProject}
          title="Projeter"
          aria-label={`Projeter ${blockLabel}`}
        >
          <span className="text-xs">▶</span>
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onAdd}
          title="Ajouter au plan"
          aria-label={`Ajouter ${blockLabel} au plan`}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
