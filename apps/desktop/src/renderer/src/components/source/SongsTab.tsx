import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Play, Search, Trash2, Music, Pencil, FileJson, FileUp, FileDown, Loader2, CalendarDays, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { localNowYmd } from "@/lib/date";
import { useSongsState } from "../../pages/songs/useSongsState";
import { projectTextToScreen } from "../../projection/target";
import { SongEditorDialog } from "@/components/dialogs/SongEditorDialog";

type SongsTabProps = {
  planId: string | null;
};

function formatPlanOption(p: { id: string; date?: string | Date; title?: string | null }) {
  if (!p.date) return p.title || "Culte";
  const d = p.date instanceof Date ? p.date : new Date(p.date);
  if (isNaN(d.getTime())) return p.title || "Culte";
  const dateStr = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  return `${dateStr} — ${p.title || "Culte"}`;
}

export function SongsTab({ planId }: SongsTabProps) {
  const state = useSongsState();
  const [editorOpen, setEditorOpen] = useState(false);
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [newPlanDate, setNewPlanDate] = useState(localNowYmd());
  const [creatingPlan, setCreatingPlan] = useState(false);

  // Override planId from parent
  React.useEffect(() => {
    if (planId) state.setPlanId(planId);
  }, [planId]);

  const createPlanForDate = async () => {
    if (!newPlanDate) return;
    setCreatingPlan(true);
    try {
      const created = await window.cp.plans.create({ dateIso: newPlanDate, title: "Culte" });
      if (created?.id) {
        await state.refreshPlans();
        state.setPlanId(created.id);
        setShowNewPlan(false);
      }
    } catch {
      // ignore
    } finally {
      setCreatingPlan(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="relative shrink-0">
        <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          className="h-8 text-xs pl-7"
          placeholder="Rechercher par titre, artiste ou paroles..."
          value={state.q}
          onChange={(e) => state.setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") e.currentTarget.blur(); }}
        />
      </div>

      <div className="flex gap-1.5 shrink-0">
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

      <div className="flex gap-1.5 shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs flex-1"
          onClick={state.onImportWord}
          disabled={state.importing}
        >
          {state.importing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <FileUp className="h-3 w-3 mr-1" />}
          Import Word
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs flex-1"
          onClick={state.onImportJson}
          disabled={state.importing}
        >
          {state.importing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <FileJson className="h-3 w-3 mr-1" />}
          Import JSON
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs shrink-0"
          title="Exporter tous les chants en Word (ZIP)"
          onClick={async () => {
            const r = await window.cp.songs.exportWordPack();
            if (r.ok) { /* toast shown by ipc */ }
          }}
        >
          <FileDown className="h-3 w-3" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs shrink-0"
          title="Import auto (Word + JSON)"
          onClick={state.onImportAuto}
          disabled={state.importing}
        >
          {state.importing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
        </Button>
      </div>

      {/* Plan selector */}
      <div className="shrink-0 space-y-1">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="h-3 w-3 text-muted-foreground shrink-0" />
          {state.plans.length > 0 ? (
            <select
              value={state.planId}
              onChange={(e) => state.setPlanId(e.target.value)}
              className="flex-1 h-7 text-xs rounded-md border border-input bg-background px-2 cursor-pointer"
              title="Plan actif"
            >
              {state.plans.map((p) => (
                <option key={p.id} value={p.id}>{formatPlanOption(p)}</option>
              ))}
            </select>
          ) : (
            <span className="flex-1 text-xs text-muted-foreground italic">Aucun plan</span>
          )}
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setShowNewPlan((v) => !v)}
            title="Nouveau plan"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        {showNewPlan && (
          <div className="flex items-center gap-1.5 pl-5">
            <input
              type="date"
              title="Date du nouveau plan"
              value={newPlanDate}
              onChange={(e) => setNewPlanDate(e.target.value)}
              className="flex-1 h-7 text-xs rounded-md border border-input bg-background px-2"
            />
            <Button size="sm" className="h-7 text-xs px-2" onClick={createPlanForDate} disabled={creatingPlan}>
              {creatingPlan ? <Loader2 className="h-3 w-3 animate-spin" /> : "Creer"}
            </Button>
          </div>
        )}
      </div>

      <Separator className="shrink-0" />

      {/* Target screen selector */}
      <div className="shrink-0 flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground">Ecran :</span>
        {(["A", "B", "C"] as ScreenKey[]).map((k) => (
          <Button
            key={k}
            variant={state.target === k ? "default" : "outline"}
            size="sm"
            className="h-6 w-6 p-0 text-[10px] font-semibold"
            onClick={() => state.setTarget(k)}
          >
            {k}
          </Button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
        <div className="space-y-0.5">
          {state.filtered.map((s) => (
            <div key={s.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => state.loadSong(s.id)}
                className={cn(
                  "flex-1 min-w-0 text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors",
                  state.selectedId === s.id ? "bg-primary/15 text-primary" : "hover:bg-accent",
                )}
              >
                <Music className="h-3 w-3 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{s.title}</div>
                  {s.artist && <div className="text-[10px] text-muted-foreground truncate">{s.artist}</div>}
                  {s.matchSnippet && <div className="text-[10px] text-muted-foreground/70 truncate italic">&#9835; {s.matchSnippet}</div>}
                </div>
              </button>
              <button
                type="button"
                title="Ajouter au plan"
                onClick={() => { void state.quickAddSongToPlan(s.id); }}
                className="shrink-0 h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          ))}
          {state.filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Aucun chant trouve.</p>
          )}
        </div>

        {state.song && (
          <>
            <Separator />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium truncate">{state.song.title}</span>
              <div className="flex gap-1 shrink-0">
                <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => setEditorOpen(true)}>
                  <Pencil className="h-2.5 w-2.5 mr-0.5" /> Editer
                </Button>
                <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => state.addAllBlocksToPlan()}>
                  <Plus className="h-2.5 w-2.5 mr-0.5" /> Tout ajouter
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  title="Exporter ce chant en Word"
                  onClick={() => { void window.cp.songs.exportWord(state.song!.id); }}
                >
                  <FileDown className="h-2.5 w-2.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive" onClick={state.onDelete}>
                  <Trash2 className="h-2.5 w-2.5" />
                </Button>
              </div>
            </div>

            <div className="max-h-[260px] overflow-y-auto pr-1">
              <div className="space-y-1">
                {state.song.blocks.map((block, i) => (
                  <div
                    key={block.id || i}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/cp-item", JSON.stringify({
                        kind: "SONG_BLOCK",
                        title: `${state.song!.title} - ${block.title || block.type}`,
                        content: block.content,
                        refId: state.song!.id,
                        refSubId: block.id,
                      }));
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    className="flex items-start gap-2 px-2 py-1.5 rounded-md border text-xs bg-card hover:bg-accent/50 transition-colors cursor-grab active:cursor-grabbing"
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
                    {/* draggable={false} + onMouseDown stop prevent drag from stealing clicks */}
                    <div className="flex flex-col gap-0.5 shrink-0" draggable={false} onMouseDown={(e) => e.stopPropagation()}>
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
      </div>

      <div className="shrink-0">
        {state.err && <p className="text-xs text-destructive">{state.err}</p>}
        {state.info && <p className={cn("text-xs", state.info.kind === "success" ? "text-green-600" : "text-muted-foreground")}>{state.info.text}</p>}
      </div>

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
