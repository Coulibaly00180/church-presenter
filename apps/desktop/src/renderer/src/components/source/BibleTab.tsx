import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, ChevronLeft, Keyboard, Loader2, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useLive } from "@/hooks/useLive";
import { usePlan } from "@/hooks/usePlan";
import type { BibleInspectorPreview } from "@/lib/workspaceInspector";
import { parseReference } from "@/bible/parseRef";
import {
  getLSG1910Chapter,
  listLSG1910Books,
  type OfflineVerse,
  type LSG1910BookCatalogEntry,
} from "@/bible/lookupLSG1910";
import { searchVerses, listTranslations, getChapter, type BollsVerse } from "@/bible/bollsApi";
import { projectPlanItemToTarget } from "@/lib/projection";
import { ensureReadyForFreeProjection } from "@/lib/liveProjection";
import { projectTextToScreen } from "@/projection/target";
import type { PlanItem } from "@/lib/types";

type BibleView = "reference" | "books" | "chapters" | "verses";
type BibleMode = "browse" | "search";
type ProjectionMode = "verse" | "passage";

type TranslationGroup = { language: string; translations: Array<{ short_name: string; full_name: string }> };

const FALLBACK_TRANSLATIONS: TranslationGroup[] = [
  {
    language: "Français",
    translations: [
      { short_name: "FRLSG", full_name: "Bible Segond 1910" },
      { short_name: "FRNEG", full_name: "Nouvelle Édition de Genève" },
      { short_name: "FRBDS", full_name: "Bible du Semeur" },
      { short_name: "LSG21", full_name: "Segond 21" },
    ],
  },
];

async function loadChapter(translation: string, bookId: number, chapter: number): Promise<OfflineVerse[]> {
  if (translation === "FRLSG") return (await getLSG1910Chapter(bookId, chapter)) ?? [];
  const vs = await getChapter(translation, bookId, chapter);
  return vs.map((v) => ({ bookId: String(bookId), bookName: "", chapter, verse: v.verse, text: v.text }));
}

interface BibleTabProps {
  onInspectPreview?: (preview: BibleInspectorPreview | null) => void;
}

export function BibleTab({ onInspectPreview }: BibleTabProps) {
  const { live } = useLive();
  const { addItem } = usePlan();

  // ── Browse state ─────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<BibleMode>("browse");
  const [view, setView] = useState<BibleView>("reference");
  const [refInput, setRefInput] = useState("");
  const [books, setBooks] = useState<LSG1910BookCatalogEntry[]>([]);
  const [selectedBook, setSelectedBook] = useState<LSG1910BookCatalogEntry | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [verses, setVerses] = useState<OfflineVerse[]>([]);
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Projection mode ───────────────────────────────────────────────────────────
  // "verse" = one verse per projection slide; "passage" = all selected on one slide
  const [projMode, setProjMode] = useState<ProjectionMode>("verse");
  // Currently navigated verse (keyboard cursor)
  const [cursorVerseNum, setCursorVerseNum] = useState<number | null>(null);
  // Ref kept synchronously in sync with cursorVerseNum state.
  // handleVerseCursorMove reads this ref so rapid keypresses (before React re-renders)
  // always see the latest cursor value and never get stuck repeating the same verse.
  const cursorVerseNumRef = useRef<number | null>(null);

  // Synchronous refs — updated during render so callbacks reading them are always fresh
  // without needing a useEffect-based ref update (which is async and can cause stale closures).
  const liveRef = useRef(live);
  liveRef.current = live;
  const selectedBookRef = useRef(selectedBook);
  selectedBookRef.current = selectedBook;
  const selectedChapterRef = useRef(selectedChapter);
  selectedChapterRef.current = selectedChapter;

  // ── Search state ──────────────────────────────────────────────────────────────
  const [translation, setTranslation] = useState("FRLSG");
  const [translations, setTranslations] = useState<TranslationGroup[]>(FALLBACK_TRANSLATIONS);
  const [comparisonTranslations, setComparisonTranslations] = useState<string[]>([]);
  // Synchronous refs for stable callbacks
  const translationRef = useRef(translation);
  translationRef.current = translation;
  const comparisonTranslationsRef = useRef(comparisonTranslations);
  comparisonTranslationsRef.current = comparisonTranslations;
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BollsVerse[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searching, setSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedSearchResultPk, setSelectedSearchResultPk] = useState<number | null>(null);

  // Load book catalog + available translations
  useEffect(() => {
    void listLSG1910Books()
      .then(setBooks)
      .catch(() => toast.error("Impossible de charger le catalogue biblique"));

    void listTranslations().then((flat) => {
      if (flat.length === 0) return;
      const groupMap = new Map<string, Array<{ short_name: string; full_name: string }>>();
      for (const t of flat) {
        if (!groupMap.has(t.language)) groupMap.set(t.language, []);
        groupMap.get(t.language)!.push({ short_name: t.short_name, full_name: t.full_name });
      }
      setTranslations([...groupMap.entries()].map(([language, translations]) => ({ language, translations })));
    }).catch(() => {/* keep fallback list */});
  }, []);

  // Reset cursor when chapter changes
  useEffect(() => {
    cursorVerseNumRef.current = null;
    setCursorVerseNum(null);
  }, [selectedBook, selectedChapter]);

  // ── Browse handlers ───────────────────────────────────────────────────────────

  const handleRefInput = useCallback((value: string) => {
    setRefInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!value.trim()) return;
      setLoading(true);
      try {
        const range = parseReference(value);
        if (!range) return;
        const chapter = await loadChapter(
          translationRef.current,
          books.find((b) => b.bookKey === range.bookId)?.bookid ?? 0,
          range.chapter
        );
        if (!chapter.length) return;
        setSelectedBook(books.find((b) => b.bookKey === range.bookId) ?? null);
        setSelectedChapter(range.chapter);
        setVerses(chapter);
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

  const handleSelectBook = useCallback((book: LSG1910BookCatalogEntry) => {
    setSelectedBook(book);
    setSelectedChapter(null);
    setView("chapters");
  }, []);

  const handleSelectChapter = useCallback(async (chapter: number) => {
    if (!selectedBook) return;
    setLoading(true);
    try {
      const loaded = await loadChapter(translationRef.current, selectedBook.bookid, chapter);
      setVerses(loaded);
      setSelectedChapter(chapter);
      setSelectedVerses(new Set());
      cursorVerseNumRef.current = null;
      setCursorVerseNum(null);
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

  const getBookName = useCallback((bookId: number) => {
    return books.find((book) => book.bookid === bookId)?.name ?? `Livre ${bookId}`;
  }, [books]);

  const getTranslationLabel = useCallback((shortName: string) => {
    for (const group of translations) {
      const match = group.translations.find((entry) => entry.short_name === shortName);
      if (match) return match.full_name;
    }
    return shortName;
  }, [translations]);

  const buildSelectionPreview = useCallback((): BibleInspectorPreview | null => {
    if (!selectedBook || !selectedChapter || selectedVerses.size === 0) return null;

    const sorted = [...selectedVerses].sort((a, b) => a - b);
    return {
      id: `browse:${translation}:${selectedBook.bookid}:${selectedChapter}:${sorted.join(",")}`,
      title: buildVerseTitle(),
      subtitle: `${getTranslationLabel(translation)} · ${projMode === "verse" && sorted.length === 1 ? "Verset" : "Passage"}`,
      content: buildVerseContent(),
      itemKind: projMode === "verse" && sorted.length === 1 ? "BIBLE_VERSE" : "BIBLE_PASSAGE",
      translation: getTranslationLabel(translation),
    };
  }, [
    buildVerseContent,
    buildVerseTitle,
    getTranslationLabel,
    projMode,
    selectedBook,
    selectedChapter,
    selectedVerses,
    translation,
  ]);

  useEffect(() => {
    if (!onInspectPreview) return;

    if (mode === "browse") {
      onInspectPreview(buildSelectionPreview());
      return;
    }

    if (mode === "search" && selectedSearchResultPk !== null) {
      const match = searchResults.find((result) => result.pk === selectedSearchResultPk);
      if (match) {
        onInspectPreview({
          id: `search:${translation}:${match.pk}`,
          title: `${getBookName(match.book)} ${match.chapter}:${match.verse}`,
          subtitle: `${getTranslationLabel(translation)} · Resultat`,
          content: `${match.verse}. ${match.text}`,
          itemKind: "BIBLE_VERSE",
          translation: getTranslationLabel(translation),
        });
        return;
      }
    }

    onInspectPreview(null);
  }, [
    buildSelectionPreview,
    getBookName,
    getTranslationLabel,
    mode,
    onInspectPreview,
    searchResults,
    selectedSearchResultPk,
    translation,
  ]);

  // ── Projection helpers ────────────────────────────────────────────────────────

  /** Project a single verse immediately.
   * Stable callback (empty deps) — reads live/book/chapter from refs to avoid stale
   * closures when rapid keypresses fire before React re-renders after a live state update.
   */
  const handleProjectSingle = useCallback(async (verse: OfflineVerse) => {
    const currentLive = await ensureReadyForFreeProjection(liveRef.current);
    const currentBook = selectedBookRef.current;
    const currentChapter = selectedChapterRef.current;
    const currentTranslation = translationRef.current;
    const currentComparisons = comparisonTranslationsRef.current;
    if (!currentLive?.enabled) { toast.error("Activez Mode Direct ou Mode Libre pour projeter"); return; }
    if (!currentBook || currentChapter === null) return;
    const baseTitle = `${currentBook.name} ${currentChapter}:${verse.verse}`;
    const label = currentComparisons.length > 0 ? `${baseTitle} (${currentTranslation})` : baseTitle;
    const body = `${verse.verse}. ${verse.text}`;
    let secondaryTexts: Array<{ label: string; body: string }> | undefined;
    if (currentComparisons.length > 0) {
      const results = await Promise.allSettled(
        currentComparisons.map((t) => loadChapter(t, currentBook.bookid, currentChapter))
      );
      secondaryTexts = results
        .map((r, i) => {
          if (r.status !== "fulfilled") return null;
          const v = r.value.find((vv) => vv.verse === verse.verse);
          return v ? { label: currentComparisons[i]!, body: `${v.verse}. ${v.text}` } : null;
        })
        .filter((x): x is { label: string; body: string } => x !== null);
    }
    await projectTextToScreen({
      target: currentLive.target,
      title: label,
      body,
      secondaryTexts,
      lockedScreens: currentLive.lockedScreens,
    });
  }, []); // stable — reads live/book/chapter/translation/comparisons from refs

  /** Called when user clicks a verse in verse-mode + live: project + select + set cursor */
  const handleVerseClickInVerseMode = useCallback(async (verse: OfflineVerse) => {
    cursorVerseNumRef.current = verse.verse;
    setCursorVerseNum(verse.verse);
    setSelectedVerses((prev) => {
      const next = new Set(prev);
      next.add(verse.verse);
      return next;
    });
    await handleProjectSingle(verse);
  }, [handleProjectSingle]);

  /** Move the keyboard cursor by `dir` (+1 next, -1 prev) and project the verse.
   * - When > 1 verse is selected, navigation is restricted to those selected verses.
   * - Projects regardless of whether live mode is active (works in browse mode too).
   * - Reads cursorVerseNumRef (not state) so rapid keypresses before re-render see the
   *   correct latest value and don't get stuck navigating to the same verse twice.
   */
  const handleVerseCursorMove = useCallback(async (dir: 1 | -1) => {
    if (verses.length === 0) return;
    // Navigate through selected verses only when multiple are selected;
    // otherwise navigate through all verses in the chapter.
    const navigateThrough = selectedVerses.size > 1
      ? [...selectedVerses].sort((a, b) => a - b)
      : verses.map((v) => v.verse).sort((a, b) => a - b);
    // Read from ref — always reflects the latest cursor, even mid-render.
    const curIdx = cursorVerseNumRef.current !== null
      ? navigateThrough.indexOf(cursorVerseNumRef.current)
      : -1;
    const nextIdx = Math.max(0, Math.min(navigateThrough.length - 1, curIdx + dir));
    const nextVerseNum = navigateThrough[nextIdx];
    if (nextVerseNum === undefined) return;
    const verseObj = verses.find((v) => v.verse === nextVerseNum);
    if (!verseObj) return;
    // Update ref immediately (synchronous) so the next keypress reads the right value
    // even if React hasn't committed the state update yet.
    cursorVerseNumRef.current = nextVerseNum;
    setCursorVerseNum(nextVerseNum);
    await handleProjectSingle(verseObj);
  }, [verses, selectedVerses, handleProjectSingle]); // cursorVerseNum removed — read via ref

  // Keep a stable ref to the latest cursor-move callback so the keydown listener
  // never needs to be re-registered just because cursorVerseNum changed.
  const handleVerseCursorMoveRef = useRef(handleVerseCursorMove);
  useEffect(() => {
    handleVerseCursorMoveRef.current = handleVerseCursorMove;
  }, [handleVerseCursorMove]);

  // Free mode: receive arrow navigation forwarded from projection window
  // (fires when the projection window has focus and user presses arrows there)
  useEffect(() => {
    if (view !== "verses" || projMode !== "verse" || !live?.enabled) return;
    const unsub = window.cp.live.onFreeNavigate((dir) => {
      void handleVerseCursorMoveRef.current(dir);
    });
    return unsub;
  }, [view, projMode, live?.enabled]); // handleVerseCursorMoveRef is a stable ref — no dep needed

  // Arrow key capture for verse-by-verse keyboard navigation (capture phase, priority over LiveBar shortcuts).
  // Active whenever verse list is visible in verse mode. Projects in both browse and live mode.
  // Uses a ref so re-registering the listener on every cursor change is avoided (prevents stale closure).
  useEffect(() => {
    if (view !== "verses" || projMode !== "verse") return;

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
        void handleVerseCursorMoveRef.current(1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        void handleVerseCursorMoveRef.current(-1);
      }
    };

    window.addEventListener("keydown", onKeyDown, true); // capture phase
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [view, projMode]); // intentionally omits handleVerseCursorMove — use ref above

  const handleAdd = useCallback(async () => {
    if (selectedVerses.size === 0) { toast.error("Aucun verset sélectionné"); return; }

    if (projMode === "verse") {
      // Add each selected verse as a separate plan item
      const sorted = [...selectedVerses].sort((a, b) => a - b);
      let added = 0;
      for (const vNum of sorted) {
        const verse = verses.find((v) => v.verse === vNum);
        if (!verse) continue;
        const title = `${selectedBook?.name ?? "Bible"} ${selectedChapter}:${vNum} (${translation})`;
        let secondaryContent: string | undefined;
        if (comparisonTranslations.length > 0 && selectedBook && selectedChapter !== null) {
          const results = await Promise.allSettled(
            comparisonTranslations.map((t) => loadChapter(t, selectedBook.bookid, selectedChapter))
          );
          const secondary = results.map((r, i) => {
            if (r.status !== "fulfilled") return null;
            const v = r.value.find((vv) => vv.verse === vNum);
            return v ? { label: comparisonTranslations[i]!, body: `${v.verse}. ${v.text}` } : null;
          }).filter((x): x is { label: string; body: string } => x !== null);
          if (secondary.length > 0) secondaryContent = JSON.stringify(secondary);
        }
        const item = await addItem({
          kind: "BIBLE_VERSE",
          title,
          content: `${vNum}. ${verse.text}`,
          refId: `${selectedBook?.name} ${selectedChapter}`,
          refSubId: translation,
          secondaryContent,
        });
        if (item) added++;
      }
      if (added > 0)
        toast.success(`${added} verset${added > 1 ? "s" : ""} ajouté${added > 1 ? "s" : ""} au plan`);
    } else {
      // Add all selected as one passage
      const content = buildVerseContent();
      if (!content) { toast.error("Aucun verset sélectionné"); return; }
      let secondaryContent: string | undefined;
      if (comparisonTranslations.length > 0 && selectedBook && selectedChapter !== null) {
        const sortedNums = [...selectedVerses].sort((a, b) => a - b);
        const results = await Promise.allSettled(
          comparisonTranslations.map((t) => loadChapter(t, selectedBook.bookid, selectedChapter))
        );
        const secondary = results.map((r, i) => {
          if (r.status !== "fulfilled") return null;
          const text = sortedNums.map((vNum) => {
            const v = r.value.find((vv) => vv.verse === vNum);
            return v ? `${vNum}. ${v.text}` : "";
          }).filter(Boolean).join("\n");
          return text ? { label: comparisonTranslations[i]!, body: text } : null;
        }).filter((x): x is { label: string; body: string } => x !== null);
        if (secondary.length > 0) secondaryContent = JSON.stringify(secondary);
      }
      const item = await addItem({
        kind: "BIBLE_VERSE",
        title: buildVerseTitle(),
        content,
        refId: `${selectedBook?.name} ${selectedChapter}`,
        refSubId: translation,
        secondaryContent,
      });
      if (item) toast.success("Ajouté au plan");
    }
  }, [
    selectedVerses, projMode, verses, selectedBook, selectedChapter,
    translation, comparisonTranslations, addItem, buildVerseContent, buildVerseTitle,
  ]);

  /** Add every verse in the current chapter as individual plan items (one per verse). */
  const handleAddAllVerses = useCallback(async () => {
    if (verses.length === 0) return;
    let added = 0;
    for (const verse of verses) {
      const title = `${selectedBook?.name ?? "Bible"} ${selectedChapter}:${verse.verse} (${translation})`;
      const item = await addItem({
        kind: "BIBLE_VERSE",
        title,
        content: `${verse.verse}. ${verse.text}`,
        refId: `${selectedBook?.name} ${selectedChapter}`,
        refSubId: translation,
      });
      if (item) added++;
    }
    if (added > 0)
      toast.success(`${added} verset${added > 1 ? "s" : ""} ajouté${added > 1 ? "s" : ""} au plan`);
  }, [verses, selectedBook, selectedChapter, translation, addItem]);

  const handleProject = useCallback(async () => {
    if (!live?.enabled) { toast.error("Activez Mode Direct ou Mode Libre pour projeter"); return; }
    const currentLive = await ensureReadyForFreeProjection(liveRef.current);
    if (!currentLive?.enabled) return;

    if (projMode === "verse") {
      // Project the first selected verse and activate keyboard cursor
      const sorted = [...selectedVerses].sort((a, b) => a - b);
      const firstVerseNum = sorted[0];
      if (firstVerseNum === undefined) { toast.error("Aucun verset sélectionné"); return; }
      const verse = verses.find((v) => v.verse === firstVerseNum);
      if (!verse) return;
      cursorVerseNumRef.current = firstVerseNum;
      setCursorVerseNum(firstVerseNum);
      await handleProjectSingle(verse);
    } else {
      // Project all selected as one passage
      const content = buildVerseContent();
      if (!content) { toast.error("Aucun verset sélectionné"); return; }
      let secondaryTexts: Array<{ label: string; body: string }> | undefined;
      if (comparisonTranslations.length > 0 && selectedBook && selectedChapter !== null) {
        const sortedNums = [...selectedVerses].sort((a, b) => a - b);
        const results = await Promise.allSettled(
          comparisonTranslations.map((t) => loadChapter(t, selectedBook.bookid, selectedChapter))
        );
        secondaryTexts = results.map((r, i) => {
          if (r.status !== "fulfilled") return null;
          const text = sortedNums.map((vNum) => {
            const v = r.value.find((vv) => vv.verse === vNum);
            return v ? `${vNum}. ${v.text}` : "";
          }).filter(Boolean).join("\n");
          return text ? { label: comparisonTranslations[i]!, body: text } : null;
        }).filter((x): x is { label: string; body: string } => x !== null);
      }
      await projectTextToScreen({
        target: currentLive.target,
        title: buildVerseTitle(),
        body: content,
        secondaryTexts,
        lockedScreens: currentLive.lockedScreens,
      });
    }
  }, [live, projMode, selectedVerses, verses, selectedBook, selectedChapter, comparisonTranslations, buildVerseContent, buildVerseTitle, handleProjectSingle]);

  // ── Search handlers ───────────────────────────────────────────────────────────

  const handleSearchInput = useCallback((query: string) => {
    setSearchQuery(query);
    setSelectedSearchResultPk(null);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!query.trim()) {
      setSearchResults([]);
      setSearchTotal(0);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const result = await searchVerses(translation, query, { limit: 25 });
        setSearchResults(result.results);
        setSearchTotal(result.total);
      } catch {
        toast.error("Recherche impossible (connexion requise)");
        setSearchResults([]);
        setSearchTotal(0);
      } finally {
        setSearching(false);
      }
    }, 600);
  }, [translation]);

  const handleTranslationChange = useCallback((t: string) => {
    setTranslation(t);
    setSearchResults([]);
    setSearchTotal(0);
    setSelectedSearchResultPk(null);
    if (searchQuery.trim()) {
      setSearching(true);
      void searchVerses(t, searchQuery, { limit: 25 })
        .then((result) => {
          setSearchResults(result.results);
          setSearchTotal(result.total);
        })
        .catch(() => toast.error("Recherche impossible (connexion requise)"))
        .finally(() => setSearching(false));
    }
  }, [searchQuery]);

  const handleAddVerse = useCallback(async (verse: BollsVerse) => {
    const bookName = getBookName(verse.book);
    const title = `${bookName} ${verse.chapter}:${verse.verse}`;
    const content = `${verse.verse}. ${verse.text}`;
    const item = await addItem({
      kind: "BIBLE_VERSE",
      title,
      content,
      refId: `${bookName} ${verse.chapter}`,
      refSubId: translation,
    });
    if (item) toast.success("Ajouté au plan");
  }, [addItem, getBookName, translation]);

  const handleProjectVerse = useCallback(async (verse: BollsVerse) => {
    const currentLive = await ensureReadyForFreeProjection(liveRef.current);
    if (!currentLive?.enabled) { toast.error("Activez Mode Direct ou Mode Libre pour projeter"); return; }
    const bookName = getBookName(verse.book);
    const fakeItem: PlanItem = {
      id: "bible-search-temp",
      order: 0,
      kind: "BIBLE_VERSE",
      title: `${bookName} ${verse.chapter}:${verse.verse}`,
      content: `${verse.verse}. ${verse.text}`,
    };
    await projectPlanItemToTarget(currentLive.target, fakeItem, currentLive);
  }, [getBookName]); // live removed — read via ref

  // ─────────────────────────────────────────────────────────────────────────────

  const isLive = live?.enabled ?? false;

  return (
    <div className="flex flex-col h-full">
      {/* Header: mode toggle + translation */}
      <div className="px-3 py-2 border-b border-border space-y-2">
        <div className="flex gap-1">
          <Button
            variant={mode === "browse" ? "default" : "ghost"}
            size="sm"
            className="flex-1 gap-1.5"
            onClick={() => {
              setMode("browse");
              setSelectedSearchResultPk(null);
            }}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Rapide
          </Button>
          <Button
            variant={mode === "search" ? "default" : "ghost"}
            size="sm"
            className="flex-1 gap-1.5"
            onClick={() => setMode("search")}
          >
            <Search className="h-3.5 w-3.5" />
            Avance
          </Button>
        </div>

        {/* Translation selector — always visible, grouped by language */}
        <p className="text-xs leading-relaxed text-text-muted">
          {mode === "browse"
            ? "Reference rapide, parcours du texte et ajout direct au plan."
            : "Recherche globale, traductions comparees et options bibliques avancees."}
        </p>

        <Select value={translation} onValueChange={handleTranslationChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Traduction…" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {translations.map((group) => (
              <SelectGroup key={group.language}>
                <SelectLabel className="text-xs text-text-muted uppercase tracking-wide py-1">
                  {group.language}
                </SelectLabel>
                {group.translations.map((t) => (
                  <SelectItem key={t.short_name} value={t.short_name} className="text-xs">
                    {t.full_name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>

        {/* Comparison translations panel */}
        {mode === "search" && (
          <div className="space-y-1.5 rounded-xl border border-border bg-bg-elevated/30 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Comparaisons
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {comparisonTranslations.map((entry) => (
                <span
                  key={entry}
                  className="flex items-center gap-1 rounded-full bg-accent/20 px-2 py-1 text-xs text-accent"
                >
                  {entry}
                  <button
                    type="button"
                    className="transition-colors hover:text-accent/60"
                    onClick={() => setComparisonTranslations((prev) => prev.filter((value) => value !== entry))}
                    aria-label={`Retirer ${entry}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {comparisonTranslations.length < 3 && (
                <Select
                  value=""
                  onValueChange={(value) => {
                    if (value && !comparisonTranslations.includes(value) && value !== translation) {
                      setComparisonTranslations((prev) => [...prev, value]);
                    }
                  }}
                >
                  <SelectTrigger className="h-8 w-auto gap-1 border-dashed px-2 text-xs">
                    <Plus className="h-3 w-3" />
                    Comparer
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {translations.map((group) => (
                      <SelectGroup key={group.language}>
                        <SelectLabel className="text-xs text-text-muted uppercase tracking-wide py-1">
                          {group.language}
                        </SelectLabel>
                        {group.translations
                          .filter((entry) => entry.short_name !== translation && !comparisonTranslations.includes(entry.short_name))
                          .map((entry) => (
                            <SelectItem key={entry.short_name} value={entry.short_name} className="text-xs">
                              {entry.full_name}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content area */}
      {mode === "browse" ? (
        <div className="flex flex-col flex-1 overflow-hidden">
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
              projMode={projMode}
              onProjModeChange={setProjMode}
              cursorVerseNum={cursorVerseNum}
              isLive={isLive}
              onToggle={toggleVerse}
              onClickInVerseMode={(v) => void handleVerseClickInVerseMode(v)}
              onBack={() => setView(selectedBook ? "chapters" : "reference")}
              onAdd={() => void handleAdd()}
              onAddAll={() => void handleAddAllVerses()}
              onProject={() => void handleProject()}
            />
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="px-3 py-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
              <Input
                placeholder="Rechercher dans la Bible…"
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                className="pl-8"
                autoFocus
              />
            </div>
            {searchTotal > 0 && (
              <p className="mt-1 text-xs text-text-muted">
                {searchTotal} résultat{searchTotal > 1 ? "s" : ""}
                {searchTotal > 25 ? " (25 affichés)" : ""}
              </p>
            )}
          </div>

          {searching ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
            </div>
          ) : searchResults.length > 0 ? (
             <SearchResultsView
               results={searchResults}
               getBookName={getBookName}
               onAdd={(v) => void handleAddVerse(v)}
               onProject={(v) => void handleProjectVerse(v)}
               onInspect={(v) => setSelectedSearchResultPk(v.pk)}
               selectedResultPk={selectedSearchResultPk}
               live={isLive}
             />
          ) : searchQuery.trim() && !searching ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-text-muted">Aucun résultat</p>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center px-4">
              <p className="text-xs text-text-muted text-center leading-relaxed">
                Entrez un mot ou une expression pour chercher dans toute la Bible.
                <br />
                <span className="opacity-60">Nécessite une connexion internet.</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-composants Browse ────────────────────────────────────────────────────

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
            type="button"
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
  onSelect: (ch: number) => Promise<void>;
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
        <div className="grid grid-cols-6 gap-1 p-3 max-h-[80px]">
          {Array.from({ length: book.chapters }, (_, i) => i + 1).map((ch) => (
            <button
              key={ch}
              type="button"
              className="flex items-center justify-center h-7 rounded text-xs hover:bg-primary hover:text-primary-fg transition-colors border border-border"
              onClick={() => void onSelect(ch)}
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
  projMode,
  onProjModeChange,
  cursorVerseNum,
  isLive,
  onToggle,
  onClickInVerseMode,
  onBack,
  onAdd,
  onAddAll,
  onProject,
}: {
  book: LSG1910BookCatalogEntry | null;
  chapter: number | null;
  verses: OfflineVerse[];
  selectedVerses: Set<number>;
  projMode: ProjectionMode;
  onProjModeChange: (mode: ProjectionMode) => void;
  cursorVerseNum: number | null;
  isLive: boolean;
  onToggle: (v: number) => void;
  onClickInVerseMode: (verse: OfflineVerse) => void;
  onBack: () => void;
  onAdd: () => void;
  onAddAll: () => void;
  onProject: () => void;
}) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
        <Button variant="ghost" size="icon-xs" onClick={onBack} aria-label="Retour">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium flex-1 truncate">
          {book?.name} {chapter}
        </span>
        {/* Projection mode toggle */}
        <div className="flex gap-0.5 shrink-0">
          <button
            type="button"
            className={cn(
              "px-2 py-0.5 rounded text-xs font-semibold transition-colors",
              projMode === "verse"
                ? "bg-primary/10 text-primary"
                : "text-text-muted hover:bg-bg-elevated"
            )}
            onClick={() => onProjModeChange("verse")}
            title="Un verset par diapositive"
          >
            Verset
          </button>
          <button
            type="button"
            className={cn(
              "px-2 py-0.5 rounded text-xs font-semibold transition-colors",
              projMode === "passage"
                ? "bg-primary/10 text-primary"
                : "text-text-muted hover:bg-bg-elevated"
            )}
            onClick={() => onProjModeChange("passage")}
            title="Plusieurs versets sur une seule diapositive"
          >
            Passage
          </button>
        </div>
      </div>

      {/* Verse list */}
      <ScrollArea className="flex-1">
        <div className="py-1">
          {verses.map((verse) => {
            const isSelected = selectedVerses.has(verse.verse);
            const isCursor = cursorVerseNum === verse.verse;
            return (
              <button
                key={verse.verse}
                type="button"
                className={cn(
                  "flex w-full items-start gap-2 px-3 py-1.5 text-left hover:bg-bg-elevated transition-colors",
                  isSelected && "bg-primary/8",
                  isCursor && "ring-1 ring-inset ring-primary/50 bg-primary/12",
                )}
                onClick={() => {
                  if (projMode === "verse" && isLive) {
                    onClickInVerseMode(verse);
                  } else {
                    onToggle(verse.verse);
                  }
                }}
                aria-pressed={isSelected}
              >
                <span className="text-xs font-mono text-text-muted w-5 shrink-0 mt-0.5">
                  {verse.verse}
                </span>
                <span className="text-sm text-text-primary leading-relaxed">
                  {verse.text}
                </span>
                {isCursor && (
                  <span className="ml-auto mt-0.5 shrink-0 text-xs font-bold text-primary">
                    ▶
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="flex flex-col gap-1.5 px-3 py-2 border-t border-border shrink-0">
        {/* Keyboard nav hint — verse mode */}
        {projMode === "verse" && (
          <p className="flex items-center justify-center gap-1 text-xs text-text-muted">
            <Keyboard className="h-3 w-3 opacity-50" />
            {isLive ? "← → pour naviguer · clic pour projeter" : "← → pour naviguer · Projeter pour commencer"}
          </p>
        )}

        {selectedVerses.size > 0 ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={onAdd}>
              <Plus className="h-3.5 w-3.5" />
              {projMode === "verse"
                ? `Ajouter (${selectedVerses.size})`
                : "Ajouter au plan"}
            </Button>
            <Button variant="default" size="sm" className="flex-1" onClick={onProject}>
              ▶ Projeter
            </Button>
          </div>
        ) : projMode === "verse" ? (
          <Button variant="outline" size="sm" className="w-full gap-1" onClick={onAddAll}>
            <Plus className="h-3.5 w-3.5" />
            Ajouter tout le chapitre au plan
          </Button>
        ) : (
          <p className="text-center text-xs text-text-muted">Sélectionnez des versets</p>
        )}
      </div>
    </div>
  );
}

// ─── Sub-composant Search ─────────────────────────────────────────────────────

function SearchResultsView({
  results,
  getBookName,
  onAdd,
  onProject,
  onInspect,
  selectedResultPk,
  live,
}: {
  results: BollsVerse[];
  getBookName: (id: number) => string;
  onAdd: (v: BollsVerse) => void;
  onProject: (v: BollsVerse) => void;
  onInspect: (v: BollsVerse) => void;
  selectedResultPk: number | null;
  live: boolean;
}) {
  return (
    <ScrollArea className="flex-1">
      <div className="py-1 divide-y divide-border">
        {results.map((verse) => {
          const ref = `${getBookName(verse.book)} ${verse.chapter}:${verse.verse}`;
          return (
            <div
              key={verse.pk}
              className={cn(
                "px-3 py-2 transition-colors",
                selectedResultPk === verse.pk && "bg-primary/8"
              )}
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => onInspect(verse)}
              >
                <p className="mb-0.5 text-xs font-medium text-text-secondary">{ref}</p>
                <p className="text-sm leading-relaxed text-text-primary">{verse.text}</p>
              </button>
              <div className="mt-1.5 flex gap-1.5">
                <Button
                  variant="outline"
                  size="xs"
                  className="gap-1 text-xs"
                  onClick={() => onAdd(verse)}
                >
                  <Plus className="h-3 w-3" />
                  Plan
                </Button>
                {live && (
                  <Button
                    variant="default"
                    size="xs"
                    className="text-xs"
                    onClick={() => onProject(verse)}
                  >
                    ▶ Projeter
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
