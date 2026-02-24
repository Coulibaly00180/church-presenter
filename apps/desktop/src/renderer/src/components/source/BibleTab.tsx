import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, ChevronLeft, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useLive } from "@/hooks/useLive";
import { usePlan } from "@/hooks/usePlan";
import { parseReference } from "@/bible/parseRef";
import { getLSG1910Chapter, listLSG1910Books, type OfflineVerse, type LSG1910BookCatalogEntry } from "@/bible/lookupLSG1910";
import { projectPlanItemToTarget } from "@/lib/projection";
import type { PlanItem } from "@/lib/types";

type BibleView = "reference" | "books" | "chapters" | "verses";

export function BibleTab() {
  const { live } = useLive();
  const { addItem } = usePlan();

  const [view, setView] = useState<BibleView>("reference");
  const [refInput, setRefInput] = useState("");
  const [books, setBooks] = useState<LSG1910BookCatalogEntry[]>([]);
  const [selectedBook, setSelectedBook] = useState<LSG1910BookCatalogEntry | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [verses, setVerses] = useState<OfflineVerse[]>([]);
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void listLSG1910Books().then(setBooks).catch(() => toast.error("Impossible de charger le catalogue biblique"));
  }, []);

  // Parse reference input with debounce
  const handleRefInput = useCallback((value: string) => {
    setRefInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!value.trim()) return;
      setLoading(true);
      try {
        const range = parseReference(value);
        if (!range) return;
        const chapter = await getLSG1910Chapter(
          books.find((b) => b.bookKey === range.bookId)?.bookid ?? 0,
          range.chapter
        );
        if (!chapter) return;
        setSelectedBook(books.find((b) => b.bookKey === range.bookId) ?? null);
        setSelectedChapter(range.chapter);
        setVerses(chapter);
        // Pre-select the verse range
        const sel = new Set<number>();
        for (let v = range.from; v <= range.to; v++) sel.add(v);
        setSelectedVerses(sel);
        setView("verses");
      } catch {
        toast.error("Référence introuvable");
      } finally {
        setLoading(false);
      }
    }, 400);
  }, [books]);

  const handleSelectBook = useCallback(async (book: LSG1910BookCatalogEntry) => {
    setSelectedBook(book);
    setSelectedChapter(null);
    setView("chapters");
  }, []);

  const handleSelectChapter = useCallback(async (chapter: number) => {
    if (!selectedBook) return;
    setLoading(true);
    try {
      const loaded = await getLSG1910Chapter(selectedBook.bookid, chapter);
      setVerses(loaded ?? []);
      setSelectedChapter(chapter);
      setSelectedVerses(new Set());
      setView("verses");
    } catch {
      toast.error("Impossible de charger ce chapitre");
    } finally {
      setLoading(false);
    }
  }, [selectedBook]);

  const toggleVerse = useCallback((verseNum: number) => {
    setSelectedVerses((prev) => {
      const next = new Set(prev);
      if (next.has(verseNum)) next.delete(verseNum);
      else next.add(verseNum);
      return next;
    });
  }, []);

  const buildVerseContent = useCallback(() => {
    const sorted = [...selectedVerses].sort((a, b) => a - b);
    return sorted
      .map((v) => {
        const verse = verses.find((vv) => vv.verse === v);
        return verse ? `${v}. ${verse.text}` : "";
      })
      .filter(Boolean)
      .join("\n");
  }, [selectedVerses, verses]);

  const buildVerseTitle = useCallback(() => {
    if (!selectedBook || !selectedChapter) return "Bible";
    const sorted = [...selectedVerses].sort((a, b) => a - b);
    if (sorted.length === 0) return `${selectedBook.name} ${selectedChapter}`;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const suffix = min === max ? `${min}` : `${min}-${max}`;
    return `${selectedBook.name} ${selectedChapter}:${suffix}`;
  }, [selectedBook, selectedChapter, selectedVerses]);

  const handleAdd = useCallback(async () => {
    const content = buildVerseContent();
    if (!content) { toast.error("Aucun verset sélectionné"); return; }
    const item = await addItem({
      kind: "BIBLE_VERSE",
      title: buildVerseTitle(),
      content,
      refId: `${selectedBook?.name} ${selectedChapter}`,
      refSubId: "LSG",
    });
    if (item) toast.success("Ajouté au plan");
  }, [addItem, buildVerseContent, buildVerseTitle, selectedBook, selectedChapter]);

  const handleProject = useCallback(async () => {
    if (!live) { toast.error("Mode Direct inactif"); return; }
    const content = buildVerseContent();
    if (!content) { toast.error("Aucun verset sélectionné"); return; }
    const fakeItem: PlanItem = {
      id: "bible-temp",
      order: 0,
      kind: "BIBLE_VERSE",
      title: buildVerseTitle(),
      content,
    };
    await projectPlanItemToTarget(live.target, fakeItem, live);
  }, [live, buildVerseContent, buildVerseTitle]);

  return (
    <div className="flex flex-col h-full">
      {/* Reference input */}
      <div className="px-3 py-2 border-b border-border space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
          <Input
            placeholder="Ex : Jean 3:16, Ps 23:1-3…"
            value={refInput}
            onChange={(e) => handleRefInput(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-1.5 text-text-secondary"
          onClick={() => setView("books")}
        >
          <BookOpen className="h-4 w-4" />
          Parcourir les livres
        </Button>
      </div>

      {/* Content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
          </div>
        ) : view === "books" ? (
          <BooksView books={books} onSelect={handleSelectBook} />
        ) : view === "chapters" && selectedBook ? (
          <ChaptersView
            book={selectedBook}
            onSelect={handleSelectChapter}
            onBack={() => setView("books")}
          />
        ) : view === "verses" && verses.length > 0 ? (
          <VersesView
            book={selectedBook}
            chapter={selectedChapter}
            verses={verses}
            selectedVerses={selectedVerses}
            onToggle={toggleVerse}
            onBack={() => setView(selectedBook ? "chapters" : "reference")}
            onAdd={() => void handleAdd()}
            onProject={() => void handleProject()}
          />
        ) : null}
      </div>
    </div>
  );
}

function BooksView({
  books,
  onSelect,
}: {
  books: LSG1910BookCatalogEntry[];
  onSelect: (b: LSG1910BookCatalogEntry) => void;
}) {
  return (
    <ScrollArea className="flex-1">
      <div className="py-1">
        {books.map((book) => (
          <button
            key={book.bookid}
            className="flex w-full items-center gap-2 px-3 py-2 hover:bg-bg-elevated transition-colors text-left"
            onClick={() => onSelect(book)}
          >
            <span className="text-sm text-text-primary">{book.name}</span>
            <span className="ml-auto text-xs text-text-muted">{book.chapters} ch.</span>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}

function ChaptersView({
  book,
  onSelect,
  onBack,
}: {
  book: LSG1910BookCatalogEntry;
  onSelect: (ch: number) => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Button variant="ghost" size="icon-xs" onClick={onBack} aria-label="Retour">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">{book.name}</span>
      </div>
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-6 gap-1 p-3" style={{ maxHeight: "80px" }}>
          {Array.from({ length: book.chapters }, (_, i) => i + 1).map((ch) => (
            <button
              key={ch}
              className="flex items-center justify-center h-7 rounded text-xs hover:bg-primary hover:text-primary-fg transition-colors border border-border"
              onClick={() => onSelect(ch)}
            >
              {ch}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function VersesView({
  book,
  chapter,
  verses,
  selectedVerses,
  onToggle,
  onBack,
  onAdd,
  onProject,
}: {
  book: LSG1910BookCatalogEntry | null;
  chapter: number | null;
  verses: OfflineVerse[];
  selectedVerses: Set<number>;
  onToggle: (v: number) => void;
  onBack: () => void;
  onAdd: () => void;
  onProject: () => void;
}) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Button variant="ghost" size="icon-xs" onClick={onBack} aria-label="Retour">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium flex-1">
          {book?.name} {chapter}
        </span>
        <span className="text-xs text-text-muted">
          {selectedVerses.size > 0 ? `${selectedVerses.size} sélectionné(s)` : ""}
        </span>
      </div>

      {/* Verse list */}
      <ScrollArea className="flex-1">
        <div className="py-1">
          {verses.map((verse) => (
            <button
              key={verse.verse}
              className={cn(
                "flex w-full items-start gap-2 px-3 py-1.5 text-left hover:bg-bg-elevated transition-colors",
                selectedVerses.has(verse.verse) && "bg-primary/10"
              )}
              onClick={() => onToggle(verse.verse)}
              aria-pressed={selectedVerses.has(verse.verse)}
            >
              <span className="text-xs font-mono text-text-muted w-5 shrink-0 mt-0.5">
                {verse.verse}
              </span>
              <span className="text-sm text-text-primary leading-relaxed">
                {verse.text}
              </span>
            </button>
          ))}
        </div>
      </ScrollArea>

      {/* Actions */}
      {selectedVerses.size > 0 && (
        <div className="flex gap-2 px-3 py-2 border-t border-border">
          <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={onAdd}>
            <Plus className="h-3.5 w-3.5" />
            Ajouter au plan
          </Button>
          <Button variant="default" size="sm" className="flex-1" onClick={onProject}>
            ▶ Projeter
          </Button>
        </div>
      )}
    </div>
  );
}
