import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Play, Search, Trash2, Music, ChevronRight, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSongsState } from "../../pages/songs/useSongsState";
import { projectTextToScreen } from "../../projection/target";
import { SongEditorDialog } from "@/components/dialogs/SongEditorDialog";

type SongsTabProps = {
  planId: string | null;
};

export function SongsTab({ planId }: SongsTabProps) {
  const state = useSongsState();
  const [editorOpen, setEditorOpen] = useState(false);

  // Override planId from parent
  React.useEffect(() => {
    if (planId) state.setPlanId(planId);
  }, [planId]);

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          className="h-8 text-xs pl-7"
          placeholder="Rechercher par titre, artiste ou paroles..."
          value={state.q}
          onChange={(e) => state.setQ(e.target.value)}
        />
      </div>

      {/* Create new song */}
      <div className="flex gap-1.5">
        <Input
          className="h-7 text-xs flex-1"
          placeholder="Nouveau chant..."
          value={state.newSongTitle}
          onChange={(e) => state.setNewSongTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && state.onCreate()}
        />
        <Button size="sm" className="h-7 text-xs px-2" onClick={state.onCreate}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <Separator />

      {/* Song list */}
      <div className="space-y-0.5">
        {state.filtered.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => state.loadSong(s.id)}
            className={cn(
              "w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors",
              state.selectedId === s.id ? "bg-primary/15 text-primary" : "hover:bg-accent",
            )}
          >
            <Music className="h-3 w-3 shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{s.title}</div>
              {s.artist && <div className="text-[10px] text-muted-foreground truncate">{s.artist}</div>}
              {s.matchSnippet && <div className="text-[10px] text-muted-foreground/70 truncate italic">&#9835; {s.matchSnippet}</div>}
            </div>
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
          </button>
        ))}
        {state.filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">Aucun chant trouve.</p>
        )}
      </div>

      {/* Song detail / blocks */}
      {state.song && (
        <>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium truncate">{state.song.title}</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => setEditorOpen(true)}>
                <Pencil className="h-2.5 w-2.5 mr-0.5" /> Editer
              </Button>
              <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => state.addAllBlocksToPlan()}>
                <Plus className="h-2.5 w-2.5 mr-0.5" /> Tout ajouter
              </Button>
              <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive" onClick={state.onDelete}>
                <Trash2 className="h-2.5 w-2.5" />
              </Button>
            </div>
          </div>

          <div className="max-h-[200px] overflow-y-auto">
            <div className="space-y-1">
              {state.song.blocks.map((block, i) => (
                <div
                  key={block.id || i}
                  className="flex items-start gap-2 px-2 py-1.5 rounded-md border text-xs bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[9px] px-1 py-0">{block.type}</Badge>
                      <span className="font-medium text-[11px]">{block.title || block.type}</span>
                    </div>
                    <p className="text-muted-foreground mt-0.5 line-clamp-2 whitespace-pre-line">
                      {block.content.slice(0, 100)}{block.content.length > 100 ? "..." : ""}
                    </p>
                  </div>
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => state.addBlockToPlan(i)}
                    >
                      <Plus className="h-2.5 w-2.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => projectTextToScreen({
                        target: state.target,
                        title: `${state.song!.title} - ${block.title || block.type}`,
                        body: block.content,
                      })}
                    >
                      <Play className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Status */}
      {state.err && <p className="text-xs text-destructive">{state.err}</p>}
      {state.info && <p className={cn("text-xs", state.info.kind === "success" ? "text-green-600" : "text-muted-foreground")}>{state.info.text}</p>}

      {/* Song editor dialog */}
      {state.song && (
        <SongEditorDialog
          open={editorOpen}
          onOpenChange={setEditorOpen}
          song={state.song}
          target={state.target}
          planId={state.planId}
          title={state.title}
          onSetTitle={state.setTitle}
          artist={state.artist}
          onSetArtist={state.setArtist}
          album={state.album}
          onSetAlbum={state.setAlbum}
          year={state.year}
          onSetYear={state.setYear}
          saving={state.saving}
          onSaveMeta={state.onSaveMeta}
          onSaveBlocks={state.onSaveBlocks}
          onDelete={state.onDelete}
          onAddBlock={state.addBlock}
          onRemoveBlock={state.removeBlock}
          onUpdateBlock={state.updateBlock}
          onAddBlockToPlan={state.addBlockToPlan}
          onAddAllBlocksToPlan={state.addAllBlocksToPlan}
        />
      )}
    </div>
  );
}
