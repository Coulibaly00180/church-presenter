import { useEffect, useMemo, useRef, useState } from "react";
import {
  BollsBook,
  BollsVerse,
  buildReferenceLabel,
  getBooks,
  getChapter,
  searchVerses,
  versesToText,
  listTranslations,
} from "../../bible/bollsApi";
import { projectTextToScreen } from "../../projection/target";

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return String(err);
}

export type TranslationGroup = {
  language: string;
  translations: Array<{ code: string; label: string; dir?: string }>;
};

type PlanItemPayload = Omit<CpPlanAddItemPayload, "kind"> & { kind: "BIBLE_PASSAGE" | "BIBLE_VERSE" };

export function useBibleState() {
  const [translationLanguage, setTranslationLanguage] = useState<string>("French Français");
  const [translation, setTranslation] = useState<string>("FRLSG");
  const activeTranslation = translation;
  const [groups, setGroups] = useState<TranslationGroup[]>([]);

  const [books, setBooks] = useState<BollsBook[]>([]);
  const [bookId, setBookId] = useState<number | null>(null);
  const [chapter, setChapter] = useState<number>(1);
  const [verses, setVerses] = useState<BollsVerse[]>([]);
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set());

  const [plans, setPlans] = useState<CpPlanListItem[]>([]);
  const [planId, setPlanId] = useState<string>("");
  const [addMode, setAddMode] = useState<"PASSAGE" | "VERSES">("VERSES");
  const [target, setTarget] = useState<ScreenKey>("A");

  const [loadingBooks, setLoadingBooks] = useState(false);
  const [loadingChapter, setLoadingChapter] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [offlineFallbackHint, setOfflineFallbackHint] = useState<string | null>(null);

  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<BollsVerse[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef<NodeJS.Timeout | null>(null);
  const skipNextBookAutoLoad = useRef(false);

  const currentBook = useMemo(() => books.find((b) => b.bookid === bookId), [books, bookId]);

  function switchToOfflineFRLSG() {
    const frGroup = groups.find((g) => g.translations.some((t) => t.code === "FRLSG"));
    if (frGroup) setTranslationLanguage(frGroup.language);
    setTranslation("FRLSG");
    setOfflineFallbackHint(null);
    setInfo("Mode offline FRLSG active.");
  }

  // Load translations once
  useEffect(() => {
    let cancelled = false;
    listTranslations()
      .then((ts) => {
        if (cancelled) return;
        const grouped: TranslationGroup[] = [];
        ts.forEach((t) => {
          let g = grouped.find((gg) => gg.language === t.language);
          if (!g) { g = { language: t.language, translations: [] }; grouped.push(g); }
          g.translations.push({ code: t.short_name, label: `${t.full_name} (${t.short_name})`, dir: t.dir });
        });
        setGroups(grouped);
        const defaultCode = "FRLSG";
        const defaultGroup = grouped.find((g) => g.translations.some((t) => t.code === defaultCode));
        if (defaultGroup) {
          setTranslationLanguage(defaultGroup.language);
          const found = defaultGroup.translations.find((t) => t.code === defaultCode) || defaultGroup.translations[0];
          if (found) setTranslation(found.code);
        } else if (grouped[0]?.translations[0]) {
          setTranslationLanguage(grouped[0].language);
          setTranslation(grouped[0].translations[0].code);
        }
      })
      .catch((e) => { if (!cancelled) setErr(e?.message || String(e)); });
    return () => { cancelled = true; };
  }, []);

  // Load plans on mount
  useEffect(() => {
    let cancelled = false;
    window.cp.plans?.list?.()
      .then((ps: CpPlanListItem[]) => {
        if (cancelled) return;
        setPlans(ps || []);
        if (ps?.length) setPlanId(ps[0].id);
      })
      .catch(() => null);
    return () => { cancelled = true; };
  }, []);

  // Load books when translation changes
  useEffect(() => {
    if (!activeTranslation) return;
    let cancelled = false;
    (async () => {
      setErr(null); setInfo(null); setOfflineFallbackHint(null); setLoadingBooks(true);
      try {
        const list = await getBooks(activeTranslation);
        if (cancelled) return;
        setBooks(list); setBookId(list[0]?.bookid ?? null); setChapter(1); setVerses([]); setSelectedVerses(new Set());
        setInfo(`Traduction ${activeTranslation} chargee (${list.length} livres).`);
      } catch (e: unknown) {
        if (cancelled) return;
        setErr(getErrorMessage(e)); setBooks([]); setBookId(null);
        if (activeTranslation !== "FRLSG") {
          setOfflineFallbackHint(`La traduction ${activeTranslation} requiert le reseau. Tu peux basculer en FRLSG offline.`);
        }
      } finally { if (!cancelled) setLoadingBooks(false); }
    })();
    return () => { cancelled = true; };
  }, [activeTranslation]);

  // Auto-load chapter when book changes
  useEffect(() => {
    if (!bookId) return;
    if (skipNextBookAutoLoad.current) { skipNextBookAutoLoad.current = false; return; }
    void loadChapter(bookId, 1);
  }, [bookId]);

  async function loadChapter(bid: number, chap: number) {
    setErr(null); setLoadingChapter(true);
    try {
      const vs = await getChapter(activeTranslation, bid, chap);
      setVerses(vs); setChapter(chap); setSelectedVerses(new Set());
    } catch (e: unknown) { setErr(getErrorMessage(e)); }
    finally { setLoadingChapter(false); }
  }

  function toggleVerse(n: number) {
    const next = new Set(selectedVerses);
    if (next.has(n)) next.delete(n); else next.add(n);
    setSelectedVerses(next);
  }

  function selectAllVerses(flag: boolean) {
    if (!flag) { setSelectedVerses(new Set()); return; }
    setSelectedVerses(new Set(verses.map((v) => v.verse)));
  }

  const selectedList = useMemo(() => verses.filter((v) => selectedVerses.has(v.verse)), [verses, selectedVerses]);
  const passageText = useMemo(() => versesToText(selectedList.length ? selectedList : verses), [verses, selectedList]);
  const referenceLabel = useMemo(
    () => buildReferenceLabel(currentBook, chapter, selectedList.length ? selectedList.map((v) => v.verse) : undefined),
    [currentBook, chapter, selectedList]
  );

  async function addToPlan() {
    if (!planId) { setErr("Choisis un plan avant d'ajouter."); return; }
    if (!verses.length) { setErr("Charge un chapitre d'abord."); return; }

    const items: PlanItemPayload[] = [];
    if (addMode === "PASSAGE" || selectedList.length === 0) {
      items.push({ planId, kind: "BIBLE_PASSAGE", title: referenceLabel, content: passageText, refId: referenceLabel, refSubId: activeTranslation });
    } else {
      for (const v of selectedList) {
        items.push({
          planId, kind: "BIBLE_VERSE",
          title: `${currentBook?.name || ""} ${v.chapter}:${v.verse} (${activeTranslation})`,
          content: `${v.chapter}:${v.verse}  ${v.text}`, refId: referenceLabel, refSubId: `${v.chapter}:${v.verse}`,
        });
      }
    }
    for (const it of items) await window.cp.plans.addItem(it);
    setInfo(`${items.length} element(s) ajoute(s) au plan.`);
  }

  async function projectNow() {
    if (!verses.length) { setErr("Charge un chapitre d'abord."); return; }
    await projectTextToScreen({ target, title: `${referenceLabel} (${activeTranslation})`, body: passageText });
  }

  // Text search (debounced)
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!searchText.trim()) { setSearchResults([]); return; }
    let cancelled = false;
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true); setErr(null);
      try {
        const res = await searchVerses(activeTranslation, searchText.trim(), { limit: 30 });
        if (!cancelled) setSearchResults(res.results);
      } catch (e: unknown) {
        if (!cancelled) { setErr(getErrorMessage(e)); setSearchResults([]); }
      } finally { if (!cancelled) setSearchLoading(false); }
    }, 350);
    return () => { cancelled = true; if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchText, activeTranslation]);

  async function jumpToResult(v: BollsVerse) {
    setErr(null);
    try {
      if (!books.length) await getBooks(activeTranslation);
      skipNextBookAutoLoad.current = true;
      setBookId(v.book);
      await loadChapter(v.book, v.chapter);
      setSelectedVerses(new Set([v.verse]));
    } catch (e: unknown) { setErr(getErrorMessage(e)); }
  }

  return {
    // translation
    translationLanguage, setTranslationLanguage, translation, setTranslation, activeTranslation, groups,
    // navigation
    books, bookId, setBookId, chapter, setChapter, currentBook, loadingBooks, loadingChapter, loadChapter,
    // verses
    verses, selectedVerses, toggleVerse, selectAllVerses, selectedList, passageText, referenceLabel,
    // plan
    plans, planId, setPlanId, addMode, setAddMode, target, setTarget, addToPlan, projectNow,
    // search
    searchText, setSearchText, searchResults, searchLoading, jumpToResult,
    // status
    err, info, offlineFallbackHint, switchToOfflineFRLSG,
  };
}
