import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Play, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBibleState } from "../../pages/bible/useBibleState";

type BibleTabProps = {
  planId: string | null;
};

export function BibleTab({ planId }: BibleTabProps) {
  const state = useBibleState();

  // Override planId from parent
  React.useEffect(() => {
    if (planId) state.setPlanId(planId);
  }, [planId]);

  return (
    <div className="flex flex-col gap-2">
      {/* Translation selector */}
      <Select value={state.translation} onValueChange={state.setTranslation}>
        <SelectTrigger className="h-7 text-xs w-full">
          <SelectValue placeholder="Traduction..." />
        </SelectTrigger>
        <SelectContent>
          {state.groups.map((g) =>
            g.translations.map((t) => (
              <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          className="h-7 text-xs pl-7"
          placeholder="Rechercher un verset..."
          value={state.searchText}
          onChange={(e) => state.setSearchText(e.target.value)}
        />
      </div>

      {/* Search results */}
      {state.searchResults.length > 0 && (
        <div className="max-h-[180px] overflow-y-auto rounded-md border p-1 space-y-0.5">
          {state.searchResults.map((v, i) => (
            <button
              key={i}
              onClick={() => state.jumpToResult(v)}
              className="w-full text-left px-2 py-1 text-xs rounded-sm hover:bg-accent transition-colors"
            >
              <span className="font-medium">{state.books.find(b => b.bookid === v.book)?.name ?? v.book} {v.chapter}:{v.verse}</span>
              <span className="text-muted-foreground ml-1.5 text-[10px]">{v.text.slice(0, 50)}...</span>
            </button>
          ))}
        </div>
      )}

      {/* Book selector */}
      {state.books.length > 0 && (
        <Select value={String(state.bookId ?? "")} onValueChange={(v) => state.setBookId(Number(v))}>
          <SelectTrigger className="h-7 text-xs w-full">
            <SelectValue placeholder="Livre..." />
          </SelectTrigger>
          <SelectContent>
            {state.books.map((b) => (
              <SelectItem key={b.bookid} value={String(b.bookid)}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Chapter grid */}
      {state.currentBook && (
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: state.currentBook.chapters }, (_, i) => i + 1).map((ch) => (
            <Button
              key={ch}
              variant={ch === state.chapter ? "default" : "outline"}
              size="xs"
              className="h-6 text-[10px] p-0"
              onClick={() => state.loadChapter(state.bookId!, ch)}
            >
              {ch}
            </Button>
          ))}
        </div>
      )}

      <Separator />

      {/* Verses */}
      {state.loadingChapter && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Chargement...
        </div>
      )}

      {state.verses.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium">{state.referenceLabel}</span>
            <Button variant="ghost" size="xs" className="text-[10px]" onClick={() => state.selectAllVerses(state.selectedVerses.size !== state.verses.length)}>
              {state.selectedVerses.size === state.verses.length ? "Tout decocher" : "Tout cocher"}
            </Button>
          </div>

          <div className="space-y-0.5">
            {state.verses.map((v) => (
              <button
                key={v.verse}
                onClick={() => state.toggleVerse(v.verse)}
                className={cn(
                  "w-full text-left px-2 py-1 text-xs rounded-sm transition-colors",
                  state.selectedVerses.has(v.verse) ? "bg-primary/15 text-primary" : "hover:bg-accent",
                )}
              >
                <span className="font-mono text-[10px] mr-1">{v.verse}</span>
                {v.text}
              </button>
            ))}
          </div>

          <div className="space-y-1 sticky bottom-0 bg-card pt-1">
            <div className="flex rounded-md overflow-hidden border text-[10px]">
              <button
                type="button"
                className={cn("flex-1 px-2 py-1", state.addMode === "PASSAGE" ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
                onClick={() => state.setAddMode("PASSAGE")}
              >
                Passage
              </button>
              <button
                type="button"
                className={cn("flex-1 px-2 py-1 border-l", state.addMode === "VERSES" ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
                onClick={() => state.setAddMode("VERSES")}
              >
                Versets
              </button>
            </div>
            <div className="flex gap-1.5">
              <Button size="xs" className="flex-1" onClick={() => { state.addToPlan(); }}>
                <Plus className="h-3 w-3 mr-1" /> Ajouter
              </Button>
              <Button variant="outline" size="xs" onClick={() => { state.projectNow(); }}>
                <Play className="h-3 w-3 mr-1" /> Projeter
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Status messages */}
      {state.err && <p className="text-xs text-destructive">{state.err}</p>}
      {state.info && <p className="text-xs text-muted-foreground">{state.info}</p>}
      {state.offlineFallbackHint && (
        <div className="text-xs">
          <p className="text-muted-foreground">{state.offlineFallbackHint}</p>
          <Button variant="link" size="xs" className="p-0" onClick={state.switchToOfflineFRLSG}>
            Basculer en FRLSG offline
          </Button>
        </div>
      )}
    </div>
  );
}
