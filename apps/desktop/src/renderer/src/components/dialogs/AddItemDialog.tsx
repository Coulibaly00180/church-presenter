import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, FileText, BookOpen, Music, ImagePlus, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { lookupLSG1910 } from "@/bible/lookupLSG1910";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  planId: string;
  onAdded: () => void;
};

type SongListItem = {
  id: string;
  title: string;
  artist?: string | null;
  matchSnippet?: string | null;
};

type SongBlock = {
  id: string;
  order: number;
  type: string;
  title?: string | null;
  content: string;
};

type SongDetail = {
  id: string;
  title: string;
  artist?: string | null;
  blocks: SongBlock[];
};

/* ─────────── Text tab ─────────── */
function TextTab({ planId, onAdded }: { planId: string; onAdded: () => void }) {
  const [title, setTitle] = useState("Annonce");
  const [content, setContent] = useState("");

  const add = async () => {
    if (!content.trim()) { toast.error("Ecrivez du contenu."); return; }
    await window.cp.plans.addItem({
      planId,
      kind: "ANNOUNCEMENT_TEXT",
      title: title.trim() || "Annonce",
      content: content.trim(),
    });
    toast.success("Annonce ajoutee au plan.");
    setContent("");
    onAdded();
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Label className="text-xs">Titre</Label>
        <Input className="h-7 text-xs" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Annonce" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Contenu</Label>
        <textarea
          className="w-full rounded-md border bg-background px-3 py-2 text-xs min-h-[80px] resize-y focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Contenu de l'annonce..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>
      <Button size="sm" className="w-full h-7 text-xs" onClick={add}>
        <Plus className="h-3 w-3 mr-1" /> Ajouter au plan
      </Button>
    </div>
  );
}

/* ─────────── Bible tab ─────────── */
function BibleTab({ planId, onAdded }: { planId: string; onAdded: () => void }) {
  const [reference, setReference] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [resolvedRef, setResolvedRef] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const lookup = async () => {
    if (!reference.trim()) return;
    setLoading(true);
    setPreview(null);
    try {
      const result = await lookupLSG1910(reference.trim());
      if (!result || !result.verses.length) {
        toast.error("Reference introuvable. Ex: Jean 3:16 ou Genese 1:1-3");
        return;
      }
      setResolvedRef(result.reference);
      const text = result.verses.map((v) => `${v.chapter}:${v.verse}  ${v.text}`).join("\n");
      setPreview(text);
    } finally {
      setLoading(false);
    }
  };

  const add = async () => {
    if (!preview || !resolvedRef) return;
    await window.cp.plans.addItem({
      planId,
      kind: "BIBLE_PASSAGE",
      title: `${resolvedRef} (FRLSG)`,
      content: preview,
      refId: resolvedRef,
      refSubId: "FRLSG",
    });
    toast.success("Verset ajoute au plan.");
    setReference("");
    setPreview(null);
    setResolvedRef(null);
    onAdded();
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Label className="text-xs">Reference (FRLSG)</Label>
        <div className="flex gap-1.5">
          <Input
            className="h-7 text-xs flex-1"
            placeholder="Ex: Jean 3:16 ou Genese 1:1-3"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") lookup(); }}
          />
          <Button size="sm" className="h-7 text-xs" onClick={lookup} disabled={loading}>
            Chercher
          </Button>
        </div>
      </div>
      {preview && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px]">{resolvedRef}</Badge>
          </div>
          <div className="text-xs bg-muted/50 rounded-md p-2 max-h-[120px] overflow-y-auto whitespace-pre-wrap">
            {preview}
          </div>
          <Button size="sm" className="w-full h-7 text-xs" onClick={add}>
            <Plus className="h-3 w-3 mr-1" /> Ajouter au plan
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─────────── Song tab ─────────── */
function SongTab({ planId, onAdded }: { planId: string; onAdded: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SongListItem[]>([]);
  const [song, setSong] = useState<SongDetail | null>(null);
  const [searching, setSearching] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSong(null);
    try {
      const items = await window.cp.songs.list(query.trim());
      setResults(items as SongListItem[]);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (!query.trim()) { setResults([]); setSong(null); }
  }, [query]);

  const selectSong = async (id: string) => {
    const detail = await window.cp.songs.get(id);
    if (detail) setSong(detail as SongDetail);
  };

  const addBlock = async (block: SongBlock) => {
    if (!song) return;
    await window.cp.plans.addItem({
      planId,
      kind: "SONG_BLOCK",
      title: `${song.title} - ${block.title || block.type}`,
      content: block.content || "",
      refId: song.id,
      refSubId: block.id,
    });
    toast.success("Bloc ajoute au plan.");
    onAdded();
  };

  const addAll = async () => {
    if (!song) return;
    for (const block of song.blocks) {
      await window.cp.plans.addItem({
        planId,
        kind: "SONG_BLOCK",
        title: `${song.title} - ${block.title || block.type}`,
        content: block.content || "",
        refId: song.id,
        refSubId: block.id,
      });
    }
    toast.success(`${song.blocks.length} bloc(s) ajoute(s) au plan.`);
    onAdded();
  };

  if (song) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSong(null)}>
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <span className="text-xs font-medium truncate">{song.title}</span>
        </div>
        <ScrollArea className="max-h-[200px]">
          <div className="space-y-1">
            {song.blocks.map((block) => (
              <div key={block.id} className="flex items-start gap-1.5 p-1.5 rounded hover:bg-accent text-xs">
                <div className="flex-1 min-w-0">
                  <Badge variant="outline" className="text-[9px] px-1 py-0 mr-1">{block.title || block.type}</Badge>
                  <span className="text-muted-foreground truncate">{block.content.slice(0, 60)}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => addBlock(block)}>
                  <Plus className="h-2.5 w-2.5" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
        <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={addAll}>
          <Plus className="h-3 w-3 mr-1" /> Tout ajouter ({song.blocks.length} blocs)
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        <Input
          className="h-7 text-xs flex-1"
          placeholder="Rechercher par titre, artiste ou paroles..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") search(); }}
        />
        <Button size="sm" className="h-7 text-xs" onClick={search} disabled={searching}>
          Chercher
        </Button>
      </div>
      {results.length > 0 && (
        <ScrollArea className="max-h-[200px]">
          <div className="space-y-0.5">
            {results.map((s) => (
              <button
                key={s.id}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-accent text-xs"
                onClick={() => selectSong(s.id)}
              >
                <div className="font-medium">{s.title}</div>
                {s.artist && <div className="text-muted-foreground text-[10px]">{s.artist}</div>}
                {s.matchSnippet && <div className="text-muted-foreground/70 text-[10px] italic truncate">{s.matchSnippet}</div>}
              </button>
            ))}
          </div>
        </ScrollArea>
      )}
      {results.length === 0 && query.trim() && !searching && (
        <p className="text-xs text-muted-foreground text-center py-2">Aucun resultat.</p>
      )}
    </div>
  );
}

/* ─────────── Media tab ─────────── */
function MediaTab({ planId, onAdded }: { planId: string; onAdded: () => void }) {
  const pick = async () => {
    const result = await window.cp.files.pickMedia();
    if (!result?.ok || !("path" in result)) return;
    const isPdf = result.path.toLowerCase().endsWith(".pdf");
    await window.cp.plans.addItem({
      planId,
      kind: isPdf ? "ANNOUNCEMENT_PDF" : "ANNOUNCEMENT_IMAGE",
      title: result.path.split(/[\\/]/).pop() || "Media",
      mediaPath: result.path,
    });
    toast.success("Media ajoute au plan.");
    onAdded();
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Importer une image ou un PDF pour l'ajouter au plan.</p>
      <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={pick}>
        <ImagePlus className="h-3 w-3 mr-1" /> Choisir un fichier...
      </Button>
    </div>
  );
}

/* ─────────── Main dialog ─────────── */
export function AddItemDialog({ open, onOpenChange, planId, onAdded }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un element</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="text">
          <TabsList className="w-full">
            <TabsTrigger value="text" className="text-xs gap-1">
              <FileText className="h-3 w-3" /> Texte
            </TabsTrigger>
            <TabsTrigger value="bible" className="text-xs gap-1">
              <BookOpen className="h-3 w-3" /> Verset
            </TabsTrigger>
            <TabsTrigger value="song" className="text-xs gap-1">
              <Music className="h-3 w-3" /> Chant
            </TabsTrigger>
            <TabsTrigger value="media" className="text-xs gap-1">
              <ImagePlus className="h-3 w-3" /> Media
            </TabsTrigger>
          </TabsList>
          <TabsContent value="text">
            <TextTab planId={planId} onAdded={onAdded} />
          </TabsContent>
          <TabsContent value="bible">
            <BibleTab planId={planId} onAdded={onAdded} />
          </TabsContent>
          <TabsContent value="song">
            <SongTab planId={planId} onAdded={onAdded} />
          </TabsContent>
          <TabsContent value="media">
            <MediaTab planId={planId} onAdded={onAdded} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
