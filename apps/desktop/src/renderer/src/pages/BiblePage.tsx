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

type ScreenKey = "A" | "B" | "C";

type PlanItemPayload = {
  planId: string;
  kind: "BIBLE_PASSAGE" | "BIBLE_VERSE";
  title?: string;
  content?: string;
  refId?: string | null;
  refSubId?: string | null;
};

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, "").trim();
}

function verseKey(v: BollsVerse) {
  return `${v.book}-${v.chapter}-${v.verse}`;
}

async function projectText(target: ScreenKey, title: string | undefined, body: string) {
  const screens = window.cp.screens;
  const list = screens ? await screens.list() : [];
  const meta = list.find((s: any) => s.key === target);

  if (target === "A") {
    await window.cp.projectionWindow.open();
  } else if (!meta?.isOpen && screens) {
    await screens.open(target);
  }

  const isMirrorA = target !== "A" && meta?.mirror?.kind === "MIRROR" && meta.mirror.from === "A";
  const dest = isMirrorA ? "A" : target;

  if (dest === "A" || !screens) {
    await window.cp.projection.setContentText({ title, body });
    return;
  }

  const res: any = await screens.setContentText(dest, { title, body });
  if (res?.ok === false && res?.reason === "MIRROR") {
    await window.cp.projection.setContentText({ title, body });
  }
}

export function BiblePage() {
  const [translation, setTranslation] = useState<string>(""); // set after API load
  const activeTranslation = translation;
  const [availableTranslations, setAvailableTranslations] = useState<
    Array<{ code: string; label: string; language: string; dir?: string }>
  >([]);
  const [translationFilter, setTranslationFilter] = useState("");

  const [books, setBooks] = useState<BollsBook[]>([]);
  const [bookId, setBookId] = useState<number | null>(null);
  const [chapter, setChapter] = useState<number>(1);
  const [verses, setVerses] = useState<BollsVerse[]>([]);
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set());

  const [plans, setPlans] = useState<any[]>([]);
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

  const panelStyle: React.CSSProperties = {
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: 14,
    boxShadow: "var(--shadow)",
  };

  const currentBook = useMemo(() => books.find((b) => b.bookid === bookId), [books, bookId]);

  // Load translations once
  useEffect(() => {
    listTranslations()
      .then((ts) => {
        const mapped = ts.map((t) => ({
          code: t.short_name,
          label: `${t.full_name} (${t.short_name})`,
          language: t.language,
          dir: t.dir,
        }));
        setAvailableTranslations(mapped);
        if (mapped[0]) setTranslation(mapped[0].code);
      })
      .catch((e) => {
        setErr(e?.message || String(e));
      });
  }, []);

  // Load plans on mount
  useEffect(() => {
    window.cp.plans
      ?.list?.()
      .then((ps: any[]) => {
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
        setInfo(`Traduction ${activeTranslation} chargee (${list.length} livres)`);
      } catch (e: any) {
        setErr(e?.message || String(e));
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
    } catch (e: any) {
      setErr(e?.message || String(e));
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
    setInfo(`${items.length} element(s) ajoute(s) au plan`);
  }

  async function projectNow() {
    if (!verses.length) {
      setErr("Charge un chapitre d'abord.");
      return;
    }
    await projectText(target, `${referenceLabel} (${activeTranslation})`, passageText);
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
      } catch (e: any) {
        setErr(e?.message || String(e));
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
    } catch (e: any) {
      setErr(e?.message || String(e));
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
    <div style={{ fontFamily: "system-ui", padding: 16, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0 }}>Bible</h1>
          <div style={{ opacity: 0.7 }}>Rechercher, projeter et envoyer vers le plan (bolls.life).</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            Traduction
            <select value={translation} onChange={(e) => setTranslation(e.target.value)} style={{ minWidth: 260 }}>
              {availableTranslations.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label} — {t.language}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            Plan
            <select value={planId} onChange={(e) => setPlanId(e.target.value)}>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title || p.date || p.id}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            Projeter vers
            <select value={target} onChange={(e) => setTarget(e.target.value as ScreenKey)}>
              <option value="A">Ecran A</option>
              <option value="B">Ecran B</option>
              <option value="C">Ecran C</option>
            </select>
          </label>
        </div>
      </div>

      {err ? (
        <div style={{ ...panelStyle, background: "#fef2f2", borderColor: "#fecdd3" }}>Erreur : {err}</div>
      ) : null}
      {info ? <div style={{ ...panelStyle, background: "#ecfdf3", borderColor: "#bbf7d0" }}>{info}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 12, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={panelStyle}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Naviguer</div>
            <div style={{ display: "grid", gap: 8 }}>
              <label>
                Livre
                <select
                  value={bookId ?? ""}
                  onChange={(e) => setBookId(Number(e.target.value))}
                  disabled={loadingBooks || !books.length}
                  style={{ width: "100%" }}
                >
                  {books.map((b) => (
                    <option key={b.bookid} value={b.bookid}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Chapitre
                <input
                  type="number"
                  min={1}
                  max={currentBook?.chapters || 150}
                  value={chapter}
                  onChange={(e) => setChapter(Math.max(1, Number(e.target.value)))}
                  style={{ width: "100%" }}
                />
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => bookId && loadChapter(bookId, Math.max(1, chapter))} disabled={!bookId || loadingChapter}>
                  {loadingChapter ? "Chargement..." : "Charger chapitre"}
                </button>
                <button onClick={() => selectAllVerses(true)} disabled={!verses.length}>
                  Tout selectionner
                </button>
                <button onClick={() => selectAllVerses(false)} disabled={!verses.length}>
                  Vider
                </button>
              </div>
              <label>
                Ref manuelle (ex: Jean 3:16-18)
                <input onBlur={(e) => handleManualRef(e.target.value)} placeholder="Tape puis quitte le champ pour charger" />
              </label>
            </div>
          </div>

          <div style={panelStyle}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Recherche texte (API bolls)</div>
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="mot ou expression"
              style={{ width: "100%" }}
            />
            {searchLoading ? <div style={{ opacity: 0.7 }}>Recherche…</div> : null}
            <div style={{ maxHeight: 240, overflow: "auto", marginTop: 8, display: "grid", gap: 6 }}>
              {searchResults.map((r) => (
                <button
                  key={verseKey(r)}
                  onClick={() => jumpToResult(r)}
                  style={{ textAlign: "left", padding: 10, borderRadius: 10, border: "1px solid var(--border)" }}
                >
                  <b>
                    Livre {r.book} {r.chapter}:{r.verse}
                  </b>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>{r.text}</div>
                </button>
              ))}
              {searchText && !searchResults.length && !searchLoading ? (
                <div style={{ opacity: 0.6, fontSize: 12 }}>Aucun resultat.</div>
              ) : null}
            </div>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 900 }}>{currentBook?.name ?? "—"}</div>
              <div style={{ opacity: 0.7 }}>
                {referenceLabel} ({activeTranslation})
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                Mode ajout
                <select value={addMode} onChange={(e) => setAddMode(e.target.value as any)}>
                  <option value="PASSAGE">Passage</option>
                  <option value="VERSES">Verset par verset</option>
                </select>
              </label>
              <button onClick={projectNow} disabled={!verses.length}>
                Projeter
              </button>
              <button onClick={addToPlan} disabled={!verses.length || !planId}>
                Ajouter au plan
              </button>
            </div>
          </div>

          <div style={{ marginTop: 12, maxHeight: "60vh", overflow: "auto", display: "grid", gap: 8 }}>
            {verses.map((v) => (
              <label
                key={verseKey(v)}
                style={{
                  border: "1px solid " + (selectedVerses.has(v.verse) ? "var(--primary)" : "var(--border)"),
                  padding: 10,
                  borderRadius: 10,
                  background: selectedVerses.has(v.verse) ? "#eef2ff" : "#fff",
                  display: "grid",
                  gap: 4,
                }}
              >
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="checkbox" checked={selectedVerses.has(v.verse)} onChange={() => toggleVerse(v.verse)} />
                  <b>
                    {v.chapter}:{v.verse}
                  </b>
                </div>
                <div style={{ opacity: 0.85, lineHeight: 1.4 }}>{stripHtml(v.text)}</div>
              </label>
            ))}
            {!verses.length ? <div style={{ opacity: 0.7 }}>Charge un chapitre pour voir les versets.</div> : null}
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
            Passage = un seul item avec tout le texte. Verset par verset = un item par verset pour faciliter la navigation live.
          </div>
        </div>
      </div>
    </div>
  );
}
