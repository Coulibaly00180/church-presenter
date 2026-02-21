import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Plus, Play, Trash2, Save } from "lucide-react";
import { projectTextToScreen } from "../../projection/target";

type SongEditorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  song: CpSongDetail;
  target: ScreenKey;
  planId: string;
  // meta form
  title: string; onSetTitle: (v: string) => void;
  artist: string; onSetArtist: (v: string) => void;
  album: string; onSetAlbum: (v: string) => void;
  year: string; onSetYear: (v: string) => void;
  saving: boolean;
  // actions
  onSaveMeta: () => void;
  onSaveBlocks: () => void;
  onDelete: () => void;
  onAddBlock: (type: string) => void;
  onRemoveBlock: (i: number) => void;
  onUpdateBlock: (i: number, patch: Partial<CpSongBlock>) => void;
  onAddBlockToPlan: (i: number) => void;
  onAddAllBlocksToPlan: () => void;
};

export function SongEditorDialog({
  open, onOpenChange,
  song, target, planId,
  title, onSetTitle, artist, onSetArtist, album, onSetAlbum, year, onSetYear,
  saving,
  onSaveMeta, onSaveBlocks, onDelete,
  onAddBlock, onRemoveBlock, onUpdateBlock,
  onAddBlockToPlan, onAddAllBlocksToPlan,
}: SongEditorDialogProps) {
  const projectBlock = async (i: number) => {
    const b = song.blocks[i];
    await projectTextToScreen({
      target,
      title: song.title,
      body: b.content || "",
      metaSong: {
        title: song.title,
        artist: song.artist ?? undefined,
        album: song.album ?? undefined,
        year: song.year ?? song.tags ?? undefined,
      },
    });
  };

  const projectAll = async () => {
    const text = song.blocks.map((b) => (b.content ?? "").trim()).filter(Boolean).join("\n\n");
    await projectTextToScreen({
      target,
      title: song.title,
      body: text,
      metaSong: {
        title: song.title,
        artist: song.artist ?? undefined,
        album: song.album ?? undefined,
        year: song.year ?? song.tags ?? undefined,
      },
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[450px] sm:max-w-[500px] flex flex-col min-h-0 overflow-hidden">
        <SheetHeader>
          <SheetTitle>Edition du chant</SheetTitle>
          <SheetDescription>{song.title}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pr-2">
          <div className="flex flex-col gap-4 pb-6">
            {/* Meta form */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium">Titre</label>
                <Input className="h-7 text-xs" value={title} onChange={(e) => onSetTitle(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Artiste</label>
                <Input className="h-7 text-xs" value={artist} onChange={(e) => onSetArtist(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Album</label>
                <Input className="h-7 text-xs" value={album} onChange={(e) => onSetAlbum(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Annee</label>
                <Input className="h-7 text-xs" value={year} onChange={(e) => onSetYear(e.target.value)} />
              </div>
            </div>

            <div className="flex gap-1.5">
              <Button size="sm" className="h-7 text-xs" onClick={onSaveMeta} disabled={saving}>
                <Save className="h-3 w-3 mr-1" /> Sauver meta
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onSaveBlocks} disabled={saving}>
                <Save className="h-3 w-3 mr-1" /> Sauver blocs
              </Button>
              <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={onDelete} disabled={saving}>
                <Trash2 className="h-3 w-3 mr-1" /> Supprimer
              </Button>
            </div>

            <Separator />

            {/* Add block buttons */}
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onAddBlock("VERSE")}>
                + Couplet
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onAddBlock("CHORUS")}>
                + Refrain
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onAddBlock("BRIDGE")}>
                + Pont
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={projectAll}>
                <Play className="h-3 w-3 mr-1" /> Projeter tout
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onAddAllBlocksToPlan} disabled={!planId}>
                <Plus className="h-3 w-3 mr-1" /> Tout au plan
              </Button>
            </div>

            {/* Blocks */}
            <div className="space-y-2">
              {song.blocks.map((b, idx) => (
                <div key={idx} className="rounded-md border p-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] px-1 py-0">{b.type}</Badge>
                    <span className="text-xs font-medium flex-1">{b.title || b.type} #{idx + 1}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => projectBlock(idx)}>
                      <Play className="h-2.5 w-2.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onAddBlockToPlan(idx)} disabled={!planId}>
                      <Plus className="h-2.5 w-2.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => onRemoveBlock(idx)}>
                      <Trash2 className="h-2.5 w-2.5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <Select value={b.type} onValueChange={(v) => onUpdateBlock(idx, { type: v })}>
                      <SelectTrigger className="h-6 text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VERSE">VERSE</SelectItem>
                        <SelectItem value="CHORUS">CHORUS</SelectItem>
                        <SelectItem value="BRIDGE">BRIDGE</SelectItem>
                        <SelectItem value="TAG">TAG</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      className="h-6 text-[10px]"
                      placeholder="Titre du bloc"
                      value={b.title ?? ""}
                      onChange={(e) => onUpdateBlock(idx, { title: e.target.value })}
                    />
                  </div>

                  <textarea
                    value={b.content}
                    onChange={(e) => onUpdateBlock(idx, { content: e.target.value })}
                    rows={4}
                    className="w-full rounded-md border bg-transparent px-2 py-1 text-xs resize-y focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Paroles..."
                  />
                </div>
              ))}
              {song.blocks.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Aucun bloc. Ajoutez un couplet ou refrain.</p>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
