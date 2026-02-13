import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BollsBook,
  BollsVerse,
  buildReferenceLabel,
  findBookIdByName,
  getBooks,
  getChapter,
  getVerse,
  maxChapter,
  searchVerses,
  versesToText,
  listTranslations,
} from "../bible/bollsApi";
import { ActionRow, Alert, Field, InlineField, PageHeader, Panel, ToolbarPanel } from "../ui/primitives";
import { PlanSelectField, ProjectionTargetField } from "../ui/headerControls";
import { projectTextToScreen } from "../projection/target";

type ScreenKey = "A" | "B" | "C";
type PlanListItem = { id: string; title?: string | null; date?: string | Date };

type PlanItemPayload = {
  planId: string;
  kind: "BIBLE_PASSAGE" | "BIBLE_VERSE";
  title?: string;
  content?: string;
  refId?: string;
  refSubId?: string;
};

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, "").trim();
}

function verseKey(v: BollsVerse) {
  return `${v.book}-${v.chapter}-${v.verse}`;
}

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return String(err);
}

function formatPlanLabel(plan: PlanListItem) {
  if (plan.title && plan.title.trim()) return plan.title;
  if (typeof plan.date === "string") return plan.date;
  if (plan.date instanceof Date && !Number.isNaN(plan.date.getTime())) return plan.date.toISOString().slice(0, 10);
  return plan.id;
}

function cls(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type TranslationGroup = {
  language: string;
  translations: Array<{ code: string; label: string; dir?: string }>;
};

export function BiblePage() {
  const [translationLanguage, setTranslationLanguage] = useState<string>("French Français"); // default language
  const [translation, setTranslation] = useState<string>("FRLSG"); // default translation code
  const activeTranslation = translation;
  const [groups, setGroups] = useState<TranslationGroup[]>([]);
  const [translationFilter, setTranslationFilter] = useState("");

  const [books, setBooks] = useState<BollsBook[]>([]);
  const [bookId, setBookId] = useState<number | null>(null);
  const [chapter, setChapter] = useState<number>(1);
  const [verses, setVerses] = useState<BollsVerse[]>([]);
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set());

  const [plans, setPlans] = useState<PlanListItem[]>([]);
  const [planId, setPlanId] = useState<string>("");
  const [addMode, setAddMode] = useState<"PASSAGE" | "VERSES">("VERSES");
  const [target, setTarget] = useState<ScreenKey>("A");

  const [loadingBooks, setLoadingBooks] = useState(false);
  const [loadingChapter, setLoadingChapter] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<BollsVerse[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef<NodeJS.Timeout | null>(null);

  const currentBook = useMemo(() => books.find((b) => b.bookid === bookId), [books, bookId]);

  // Load translations once
  useEffect(() => {
    listTranslations()
      .then((ts) => {
        const grouped: TranslationGroup[] = [];
        ts.forEach((t) => {
          let g = grouped.find((gg) => gg.language === t.language);
          if (!g) {
            g = { language: t.language, translations: [] };
            grouped.push(g);
          }
          g.translations.push({ code: t.short_name, label: `${t.full_name} (${t.short_name})`, dir: t.dir });
        });
        setGroups(grouped);
        const defaultLang = "French Français";
        const defaultCode = "FRLSG";
        const langExists = grouped.find((g) => g.language === defaultLang);
        if (langExists) {
          setTranslationLanguage(defaultLang);
          const found = langExists.translations.find((t) => t.code === defaultCode) || langExists.translations[0];
          if (found) setTranslation(found.code);
        } else if (grouped[0]?.translations[0]) {
          setTranslationLanguage(grouped[0].language);
          setTranslation(grouped[0].translations[0].code);
        }
      })
      .catch((e) => {
        setErr(e?.message || String(e));
      });
  }, []);

  // Load plans on mount
  useEffect(() => {
    window.cp.plans
      ?.list?.()
      .then((ps: PlanListItem[]) => {
        setPlans(ps || []);
        if (ps?.length) setPlanId(ps[0].id);
      })
      .catch(() => null);
  }, []);

  // Load books when translation changes
  useEffect(() => {
    if (!activeTranslation) return;
    (async () => {
      setErr(null);
      setInfo(null);
      setLoadingBooks(true);
      try {
        const list = await getBooks(activeTranslation);
        setBooks(list);
        setBookId(list[0]?.bookid ?? null);
        setChapter(1);
        setVerses([]);
        setSelectedVerses(new Set());
        setInfo(`Traduction ${activeTranslation} chargee (${list.length} livres).`);
      } catch (e: unknown) {
        setErr(getErrorMessage(e));
        setBooks([]);
        setBookId(null);
      } finally {
        setLoadingBooks(false);
      }
    })();
  }, [activeTranslation]);

  // Auto-load chapter when book changes
  useEffect(() => {
    if (!bookId) return;
    void loadChapter(bookId, 1);
  }, [bookId]);

  async function loadChapter(bid: number, chap: number) {
    setErr(null);
    setLoadingChapter(true);
    try {
      const vs = await getChapter(activeTranslation, bid, chap);
      setVerses(vs);
      setChapter(chap);
      setSelectedVerses(new Set());
    } catch (e: unknown) {
      setErr(getErrorMessage(e));
    } finally {
      setLoadingChapter(false);
    }
  }

  function toggleVerse(n: number) {
    const next = new Set(selectedVerses);
    if (next.has(n)) next.delete(n);
    else next.add(n);
    setSelectedVerses(next);
  }

  function selectAllVerses(flag: boolean) {
    if (!flag) {
      setSelectedVerses(new Set());
      return;
    }
    setSelectedVerses(new Set(verses.map((v) => v.verse)));
  }

  const selectedList = useMemo(() => verses.filter((v) => selectedVerses.has(v.verse)), [verses, selectedVerses]);
  const passageText = useMemo(() => versesToText(selectedList.length ? selectedList : verses), [verses, selectedList]);
  const referenceLabel = useMemo(
    () => buildReferenceLabel(currentBook, chapter, selectedList.length ? selectedList.map((v) => v.verse) : undefined),
    [currentBook, chapter, selectedList]
  );

  async function addToPlan() {
    if (!planId) {
      setErr("Choisis un plan avant d'ajouter.");
      return;
    }
    if (!verses.length) {
      setErr("Charge un chapitre d'abord.");
      return;
    }

    const items: PlanItemPayload[] = [];
    if (addMode === "PASSAGE" || selectedList.length === 0) {
      items.push({
        planId,
        kind: "BIBLE_PASSAGE",
        title: referenceLabel,
        content: passageText,
        refId: referenceLabel,
        refSubId: activeTranslation,
      });
    } else {
      for (const v of selectedList) {
        items.push({
          planId,
          kind: "BIBLE_VERSE",
          title: `${currentBook?.name || ""} ${v.chapter}:${v.verse} (${activeTranslation})`,
          content: `${v.chapter}:${v.verse}  ${v.text}`,
          refId: referenceLabel,
          refSubId: `${v.chapter}:${v.verse}`,
        });
      }
    }

    for (const it of items) {
      // eslint-disable-next-line no-await-in-loop
      await window.cp.plans.addItem(it);
    }
    setInfo(`${items.length} element(s) ajoute(s) au plan.`);
  }

  async function projectNow() {
    if (!verses.length) {
      setErr("Charge un chapitre d'abord.");
      return;
    }
    await projectTextToScreen({ target, title: `${referenceLabel} (${activeTranslation})`, body: passageText });
  }

  // Text search (debounced)
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!searchText.trim()) {
      setSearchResults([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      setErr(null);
      try {
        const res = await searchVerses(activeTranslation, searchText.trim(), { limit: 30 });
        setSearchResults(res.results);
      } catch (e: unknown) {
        setErr(getErrorMessage(e));
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 350);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchText, activeTranslation]);

  async function jumpToResult(v: BollsVerse) {
    setErr(null);
    try {
      if (!books.length) {
        await getBooks(activeTranslation); // ensure cache
      }
      setBookId(v.book);
      await loadChapter(v.book, v.chapter);
      setSelectedVerses(new Set([v.verse]));
    } catch (e: unknown) {
      setErr(getErrorMessage(e));
    }
  }

  async function handleManualRef(input: string) {
    // Accepts patterns like "Jean 3:16-18" or "John 3:16"
    if (!books.length) return;
    const m = input.match(/^(.+?)\\s+(\\d+)(?::(\\d+)(?:-(\\d+))?)?$/i);
    if (!m) {
      setErr("Reference non comprise (ex: Jean 3:16-18).");
      return;
    }
    const [, bookName, chapStr, vStartStr, vEndStr] = m;
    const book = findBookIdByName(books, bookName);
    if (!book) {
      setErr("Livre non trouve pour cette traduction.");
      return;
    }
    const chap = parseInt(chapStr, 10);
    const max = maxChapter(books, book.bookid);
    if (max && chap > max) {
      setErr(`Ce livre n'a que ${max} chapitres.`);
      return;
    }
    await loadChapter(book.bookid, chap);
    if (vStartStr) {
      const start = parseInt(vStartStr, 10);
      const end = vEndStr ? parseInt(vEndStr, 10) : start;
      const range = [];
      for (let i = start; i <= end; i += 1) range.push(i);
      setSelectedVerses(new Set(range));
    }
  }

  return (
    <div className="cp-page">
      <PageHeader title="Bible" subtitle="Rechercher, projeter et envoyer vers le plan (bolls.life)." />

      {err ? <Alert tone="error">Erreur : {err}</Alert> : null}
      {info ? <Alert tone="success">{info}</Alert> : null}

      <ToolbarPanel>
          <InlineField label="Langue">
            <select
              value={translationLanguage}
              onChange={(e) => {
                const lang = e.target.value;
                setTranslationLanguage(lang);
                const g = groups.find((x) => x.language === lang);
                if (g?.translations[0]) setTranslation(g.translations[0].code);
              }}
              className="cp-input-min-200"
            >
              {groups.map((g) => (
                <option key={g.language} value={g.language}>
                  {g.language}
                </option>
              ))}
            </select>
          </InlineField>
          <InlineField label="Traduction">
            <select
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              className="cp-input-min-260"
            >
              {(groups.find((g) => g.language === translationLanguage)?.translations || []).map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label}
                </option>
              ))}
            </select>
          </InlineField>
          <PlanSelectField
            value={planId}
            plans={plans}
            getPlanId={(p) => p.id}
            getPlanLabel={formatPlanLabel}
            onChange={setPlanId}
          />
          <ProjectionTargetField value={target} onChange={setTarget} />
      </ToolbarPanel>

      <div className="cp-grid-main">
        <div className="cp-stack">
          <Panel>
            <div className="cp-section-label">Naviguer</div>
            <div className="cp-stack-8">
            <Field label="Livre">
              <select
                value={bookId ?? ""}
                onChange={(e) => setBookId(Number(e.target.value))}
                disabled={loadingBooks || !books.length}
                className="cp-input-full"
              >
                {books.map((b) => (
                  <option key={b.bookid} value={b.bookid}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Chapitre">
              <input
                type="number"
                min={1}
                max={currentBook?.chapters || 150}
                value={chapter}
                onChange={(e) => setChapter(Math.max(1, Number(e.target.value)))}
                className="cp-input-full"
              />
            </Field>
            {currentBook?.chapters ? (
              <div className="cp-stack-6">
                <div className="cp-help-text-flat">Chapitres de {currentBook.name}</div>
                <div className="cp-chapter-grid">
                  {Array.from({ length: currentBook.chapters }, (_, i) => i + 1).map((c) => (
                    <button
                      key={c}
                      onClick={() => loadChapter(currentBook.bookid, c)}
                      className={cls("cp-chapter-btn", c === chapter && "is-active")}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <ActionRow>
              <button onClick={() => bookId && loadChapter(bookId, Math.max(1, chapter))} disabled={!bookId || loadingChapter}>
                {loadingChapter ? "Chargement..." : "Charger chapitre"}
              </button>
              <button onClick={() => selectAllVerses(true)} disabled={!verses.length}>
                  Tout selectionner
                </button>
                <button onClick={() => selectAllVerses(false)} disabled={!verses.length}>
                  Vider
                </button>
              </ActionRow>
            </div>
          </Panel>

          <Panel>
            <div className="cp-section-label cp-mb-6">Recherche texte (API bolls)</div>
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="mot ou expression"
              className="cp-input-full"
            />
            {searchLoading ? <div className="cp-muted">Recherche...</div> : null}
            <div className="cp-bible-search-list">
              {searchResults.map((r) => (
                <button
                  key={verseKey(r)}
                  onClick={() => jumpToResult(r)}
                  className="cp-search-result-btn"
                >
                  <b>
                    Livre {r.book} {r.chapter}:{r.verse}
                  </b>
                  <div className="cp-search-result-text">{r.text}</div>
                </button>
              ))}
              {searchText && !searchResults.length && !searchLoading ? (
                <div className="cp-help-text-muted">Aucun resultat.</div>
              ) : null}
            </div>
          </Panel>
        </div>

        <Panel>
          <div className="cp-panel-header-split">
            <div>
              <div className="cp-title-strong">{currentBook?.name ?? "—"}</div>
              <div className="cp-muted">
                {referenceLabel} ({activeTranslation})
              </div>
            </div>
            <div className="cp-actions">
              <InlineField label="Mode ajout">
                <select value={addMode} onChange={(e) => setAddMode(e.target.value === "PASSAGE" ? "PASSAGE" : "VERSES")}>
                  <option value="PASSAGE">Passage</option>
                  <option value="VERSES">Verset par verset</option>
                </select>
              </InlineField>
              <button onClick={projectNow} disabled={!verses.length}>
                Projeter
              </button>
              <button onClick={addToPlan} disabled={!verses.length || !planId}>
                Ajouter au plan
              </button>
            </div>
          </div>

          <div className="cp-verse-list">
            {verses.map((v) => (
              <label
                key={verseKey(v)}
                className={cls("cp-verse-card", selectedVerses.has(v.verse) && "is-selected")}
              >
                <div className="cp-verse-head">
                  <input type="checkbox" checked={selectedVerses.has(v.verse)} onChange={() => toggleVerse(v.verse)} />
                  <b>
                    {v.chapter}:{v.verse}
                  </b>
                </div>
                <div className="cp-verse-text">{stripHtml(v.text)}</div>
              </label>
            ))}
            {!verses.length ? <div className="cp-muted">Charge un chapitre pour voir les versets.</div> : null}
          </div>

          <div className="cp-help-text">
            Passage = un seul item avec tout le texte. Verset par verset = un item par verset pour faciliter la navigation live.
          </div>
        </Panel>
      </div>
    </div>
  );
}
