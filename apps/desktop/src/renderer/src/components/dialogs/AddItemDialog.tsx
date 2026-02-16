import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, FileText, BookOpen, Music, ImagePlus, ChevronLeft, Type, Timer } from "lucide-react";
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

/* ─────────── Text / Announcement tab ─────────── */
function TextTab({ planId, onAdded }: { planId: string; onAdded: () => void }) {
  const [title, setTitle] = useState("Annonce");
  const [content, setContent] = useState("");

  const add = async () => {
    if (!content.trim()) { toast.error("Ecrivez du contenu."); return; }
    try {
      await window.cp.plans.addItem({
        planId,
        kind: "ANNOUNCEMENT_TEXT",
        title: title.trim() || "Annonce",
        content: content.trim(),
      });
      toast.success("Annonce ajoutee au plan.");
      setContent("");
      onAdded();
    } catch {
      toast.error("Erreur lors de l'ajout.");
    }
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
  const [manualTitle, setManualTitle] = useState("");
  const [manualContent, setManualContent] = useState("");

  const lookup = async () => {
    if (!reference.trim()) { toast.error("Entrez une reference. Ex: Jean 3:16"); return; }
    setLoading(true);
    setPreview(null);
    setResolvedRef(null);
    try {
      const result = await lookupLSG1910(reference.trim());
      if (!result || !result.verses.length) {
        toast.error("Reference introuvable. Essayez: Jean 3:16, Genese 1:1-3, Psaumes 23:1-6");
        return;
      }
      setResolvedRef(result.reference);
      const text = result.verses.map((v) => `${v.chapter}:${v.verse}  ${v.text}`).join("\n");
      setPreview(text);
    } catch {
      toast.error("Erreur lors de la recherche du verset.");
    } finally {
      setLoading(false);
    }
  };

  const addLookedUp = async () => {
    if (!preview || !resolvedRef) return;
    try {
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
    } catch {
      toast.error("Erreur lors de l'ajout.");
    }
  };

  const addManual = async () => {
    if (!manualContent.trim()) { toast.error("Ecrivez le texte du verset."); return; }
    try {
      await window.cp.plans.addItem({
        planId,
        kind: "BIBLE_PASSAGE",
        title: manualTitle.trim() || "Verset",
        content: manualContent.trim(),
        refId: manualTitle.trim() || undefined,
      });
      toast.success("Verset ajoute au plan.");
      setManualTitle("");
      setManualContent("");
      onAdded();
    } catch {
      toast.error("Erreur lors de l'ajout.");
    }
  };

  return (
    <div className="space-y-3">
      {/* Recherche automatique */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Recherche Bible (FRLSG)</Label>
        <div className="flex gap-1.5">
          <Input
            className="h-7 text-xs flex-1"
            placeholder="Ex: Jean 3:16 ou Psaumes 23:1-6"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") lookup(); }}
          />
          <Button size="sm" className="h-7 text-xs" onClick={lookup} disabled={loading}>
            {loading ? "..." : "Chercher"}
          </Button>
        </div>
      </div>
      {preview && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px]">{resolvedRef}</Badge>
          </div>
          <div className="text-xs bg-muted/50 rounded-md p-2 max-h-[100px] overflow-y-auto whitespace-pre-wrap">
            {preview}
          </div>
          <Button size="sm" className="w-full h-7 text-xs" onClick={addLookedUp}>
            <Plus className="h-3 w-3 mr-1" /> Ajouter au plan
          </Button>
        </div>
      )}

      <Separator />

      {/* Saisie manuelle */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Saisie manuelle</Label>
        <Input
          className="h-7 text-xs"
          placeholder="Reference (ex: Romains 8:28)"
          value={manualTitle}
          onChange={(e) => setManualTitle(e.target.value)}
        />
        <textarea
          className="w-full rounded-md border bg-background px-3 py-2 text-xs min-h-[60px] resize-y focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Collez ou tapez le texte du verset..."
          value={manualContent}
          onChange={(e) => setManualContent(e.target.value)}
        />
        <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={addManual}>
          <Plus className="h-3 w-3 mr-1" /> Ajouter manuellement
        </Button>
      </div>
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
      if (!items.length) toast.info("Aucun chant trouve.");
    } catch {
      toast.error("Erreur lors de la recherche.");
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (!query.trim()) { setResults([]); setSong(null); }
  }, [query]);

  const selectSong = async (id: string) => {
    try {
      const detail = await window.cp.songs.get(id);
      if (detail) setSong(detail as SongDetail);
    } catch {
      toast.error("Erreur lors du chargement du chant.");
    }
  };

  const addBlock = async (block: SongBlock) => {
    if (!song) return;
    try {
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
    } catch {
      toast.error("Erreur lors de l'ajout.");
    }
  };

  const addAll = async () => {
    if (!song) return;
    try {
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
    } catch {
      toast.error("Erreur lors de l'ajout.");
    }
  };

  if (song) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSong(null)}>
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <span className="text-xs font-medium truncate">{song.title}</span>
          {song.artist && <span className="text-[10px] text-muted-foreground truncate">— {song.artist}</span>}
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
          {searching ? "..." : "Chercher"}
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

/* ─────────── Free text / Title card tab ─────────── */
function FreeTextTab({ planId, onAdded }: { planId: string; onAdded: () => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const add = async () => {
    if (!title.trim() && !content.trim()) { toast.error("Ecrivez un titre ou du contenu."); return; }
    try {
      await window.cp.plans.addItem({
        planId,
        kind: "ANNOUNCEMENT_TEXT",
        title: title.trim() || "Texte",
        content: content.trim(),
      });
      toast.success("Texte ajoute au plan.");
      setTitle("");
      setContent("");
      onAdded();
    } catch {
      toast.error("Erreur lors de l'ajout.");
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-muted-foreground">Titre seul (ex: "Accueil", "Offrande") ou texte complet a projeter.</p>
      <div className="space-y-1">
        <Label className="text-xs">Titre</Label>
        <Input
          className="h-7 text-xs"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Accueil, Offrande, Priere..."
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Contenu (optionnel)</Label>
        <textarea
          className="w-full rounded-md border bg-background px-3 py-2 text-xs min-h-[60px] resize-y focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Texte a projeter (optionnel)..."
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

/* ─────────── Media tab ─────────── */
function MediaTab({ planId, onAdded }: { planId: string; onAdded: () => void }) {
  const pick = async () => {
    try {
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
    } catch {
      toast.error("Erreur lors de l'ajout du media.");
    }
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

/* ─────────── Timer tab ─────────── */
function TimerTab({ planId, onAdded }: { planId: string; onAdded: () => void }) {
  const [title, setTitle] = useState("Compte a rebours");
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);

  const add = async () => {
    const totalSeconds = minutes * 60 + seconds;
    if (totalSeconds <= 0) { toast.error("La duree doit etre superieure a 0."); return; }
    try {
      await window.cp.plans.addItem({
        planId,
        kind: "TIMER",
        title: title.trim() || "Compte a rebours",
        content: String(totalSeconds),
      });
      toast.success("Minuterie ajoutee au plan.");
      onAdded();
    } catch {
      toast.error("Erreur lors de l'ajout.");
    }
  };

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-muted-foreground">Ajoutez un compte a rebours a projeter (ex: pause, attente).</p>
      <div className="space-y-1">
        <Label className="text-xs">Titre</Label>
        <Input className="h-7 text-xs" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Compte a rebours" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Duree</Label>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={0}
              max={120}
              className="h-7 text-xs w-16 text-center"
              value={minutes}
              onChange={(e) => setMinutes(Math.max(0, Math.min(120, Number(e.target.value) || 0)))}
            />
            <span className="text-xs text-muted-foreground">min</span>
          </div>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={0}
              max={59}
              className="h-7 text-xs w-16 text-center"
              value={seconds}
              onChange={(e) => setSeconds(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
            />
            <span className="text-xs text-muted-foreground">sec</span>
          </div>
          <span className="text-sm font-mono text-muted-foreground ml-auto">{mm}:{ss}</span>
        </div>
      </div>
      <Button size="sm" className="w-full h-7 text-xs" onClick={add}>
        <Plus className="h-3 w-3 mr-1" /> Ajouter au plan
      </Button>
    </div>
  );
}

/* ─────────── Main dialog ─────────── */
export function AddItemDialog({ open, onOpenChange, planId, onAdded }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un element</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="text">
          <TabsList className="w-full">
            <TabsTrigger value="text" className="text-xs gap-1">
              <Type className="h-3 w-3" /> Titre
            </TabsTrigger>
            <TabsTrigger value="announce" className="text-xs gap-1">
              <FileText className="h-3 w-3" /> Annonce
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
            <TabsTrigger value="timer" className="text-xs gap-1">
              <Timer className="h-3 w-3" /> Timer
            </TabsTrigger>
          </TabsList>
          <TabsContent value="text">
            <FreeTextTab planId={planId} onAdded={onAdded} />
          </TabsContent>
          <TabsContent value="announce">
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
          <TabsContent value="timer">
            <TimerTab planId={planId} onAdded={onAdded} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
