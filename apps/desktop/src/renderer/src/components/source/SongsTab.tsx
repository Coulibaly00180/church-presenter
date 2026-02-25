import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, Music2, Plus, Search, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useLive } from "@/hooks/useLive";
import { usePlan } from "@/hooks/usePlan";
import { projectPlanItemToTarget } from "@/lib/projection";
import type { PlanItem } from "@/lib/types";

interface SongsTabProps {
  onCreateSong?: () => void;
}

export function SongsTab({ onCreateSong }: SongsTabProps) {
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

  // 150ms debounce per UX spec (US-030)
  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void loadSongs(value), 150);
  }, [loadSongs]);

  const handleClearSearch = useCallback(() => {
    setQuery("");
    void loadSongs("");
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

  const handleAddAllBlocks = useCallback(async (song: CpSongListItem, blocks: CpSongBlock[]) => {
    let added = 0;
    for (const block of blocks) {
      const item = await addItem({
        kind: "SONG_BLOCK",
        title: `${song.title} — ${block.title ?? block.type}`,
        content: block.content,
        refId: song.id,
        refSubId: block.id,
      });
      if (item) added++;
    }
    if (added > 0) toast.success(`${added} bloc${added > 1 ? "s" : ""} ajouté${added > 1 ? "s" : ""} au plan`);
  }, [addItem]);

  const handleImport = useCallback(async () => {
    const result = await window.cp.songs.importJson();
    if ("canceled" in result) return;
    if (!result.ok) { toast.error("Import échoué", { description: result.error }); return; }
    toast.success(`${result.imported} chant${result.imported !== 1 ? "s" : ""} importé${result.imported !== 1 ? "s" : ""}`);
    void loadSongs(query);
  }, [loadSongs, query]);

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
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
          <Input
            placeholder="Rechercher un chant…"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-8 pr-7 h-8 text-sm"
          />
          {query && (
            <button
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              onClick={handleClearSearch}
              aria-label="Effacer la recherche"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
          </div>
        ) : songs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-text-muted px-4 text-center">
            <Music2 className="h-10 w-10 opacity-30" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-text-secondary">
                {query ? "Aucun résultat" : "Aucun chant"}
              </p>
              <p className="text-xs leading-relaxed">
                {query
                  ? `Aucun chant trouvé pour « ${query} »`
                  : "Crée ton premier chant ou importe une bibliothèque."}
              </p>
            </div>
            {!query && (
              <div className="flex gap-2 mt-1 flex-wrap justify-center">
                {onCreateSong && (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={onCreateSong}>
                    <Plus className="h-3.5 w-3.5" />
                    Nouveau chant
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="gap-1.5 text-text-secondary" onClick={() => void handleImport()}>
                  <Upload className="h-3.5 w-3.5" />
                  Importer
                </Button>
              </div>
            )}
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
                onAddAll={(blocks) => void handleAddAllBlocks(song, blocks)}
                onProjectBlock={(block) => void handleProjectBlock(song, block)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer: count + create action */}
      <div className="px-3 py-2 border-t border-border flex items-center justify-between shrink-0">
        <span className="text-xs text-text-muted">
          {loading ? "…" : query
            ? `${songs.length} résultat${songs.length !== 1 ? "s" : ""}`
            : `${songs.length} chant${songs.length !== 1 ? "s" : ""}`}
        </span>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="xs" className="gap-1 text-text-muted hover:text-text-secondary" onClick={() => void handleImport()} title="Importer JSON / Word" aria-label="Importer des chants">
            <Upload className="h-3 w-3" />
          </Button>
          {onCreateSong && (
            <Button variant="ghost" size="xs" className="gap-1 text-text-secondary" onClick={onCreateSong}>
              <Plus className="h-3 w-3" />
              Nouveau
            </Button>
          )}
        </div>
      </div>
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
  onAddAll: (blocks: CpSongBlock[]) => void;
  onProjectBlock: (block: CpSongBlock) => void;
}

function SongRow({
  song,
  isExpanded,
  songDetail,
  loadingDetail,
  onExpand,
  onAddBlock,
  onAddAll,
  onProjectBlock,
}: SongRowProps) {
  return (
    <div className="group/song">
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-2 px-3 py-2 text-left",
          "hover:bg-bg-elevated transition-colors",
          isExpanded && "bg-bg-elevated"
        )}
        onClick={onExpand}
        aria-expanded={isExpanded}
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-muted" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate leading-snug">{song.title}</p>
          {song.artist && (
            <p className="text-xs text-text-muted truncate leading-snug">{song.artist}</p>
          )}
        </div>
      </button>

      {/* Expanded blocks */}
      {isExpanded && (
        <div className="border-b border-border bg-bg-elevated/50">
          {loadingDetail ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
            </div>
          ) : songDetail ? (
            <>
              {songDetail.blocks.map((block) => (
                <BlockRow
                  key={block.id}
                  block={block}
                  onAdd={() => onAddBlock(block)}
                  onProject={() => onProjectBlock(block)}
                />
              ))}
              {songDetail.blocks.length > 1 && (
                <div className="px-3 py-1.5 border-t border-border/50">
                  <Button
                    variant="ghost"
                    size="xs"
                    className="w-full gap-1 text-text-secondary text-xs justify-center"
                    onClick={() => onAddAll(songDetail.blocks)}
                  >
                    <Plus className="h-3 w-3" />
                    Ajouter tous les blocs
                  </Button>
                </div>
              )}
            </>
          ) : null}
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
  const blockLabel =
    block.title ??
    (block.type === "CHORUS" ? "Refrain" :
     block.type === "VERSE" ? "Couplet" :
     block.type === "BRIDGE" ? "Pont" :
     block.type === "INTRO" ? "Intro" :
     block.type === "OUTRO" ? "Outro" :
     block.type);

  return (
    <div className="flex items-center gap-2 pl-8 pr-2 py-1.5 hover:bg-bg-elevated/80 group/block transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-text-secondary leading-snug">{blockLabel}</p>
        <p className="text-xs text-text-muted truncate leading-snug">
          {block.content.split("\n")[0]?.slice(0, 60)}
        </p>
      </div>
      <div className="flex gap-0.5 opacity-0 group-hover/block:opacity-100 transition-opacity shrink-0">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onProject}
          title="Projeter directement"
          aria-label={`Projeter ${blockLabel}`}
          className="h-6 w-6 text-text-muted hover:text-primary"
        >
          <span className="text-[10px] leading-none">▶</span>
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onAdd}
          title="Ajouter au plan"
          aria-label={`Ajouter ${blockLabel} au plan`}
          className="h-6 w-6 text-text-muted hover:text-success"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
