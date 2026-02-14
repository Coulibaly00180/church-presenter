import React, { useEffect, useRef, useState } from "react";
import { lookupLSG1910 } from "../../bible/lookupLSG1910";
import { BollsBook, buildReferenceLabel, findBookIdByName, getBooks, getChapter, maxChapter, searchVerses } from "../../bible/bollsApi";
import { Plan } from "./types";
import { ActionRow, Field } from "../../ui/primitives";

type ToastKind = "info" | "success" | "error";
type BibleTranslation = "LSG1910" | "LSG" | "WEB" | "FRLSG";
type PlanLike = { items?: Array<{ kind?: string; refId?: string | null; refSubId?: string | null }> } | null;

type PlanComposerSectionProps = {
  plan: Plan;
  reloadPlan: (id: string) => Promise<void>;
  showToast: (kind: ToastKind, text: string) => void;
};

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return String(err);
}

function isBibleTranslation(value: string): value is BibleTranslation {
  return value === "LSG1910" || value === "LSG" || value === "WEB" || value === "FRLSG";
}

function isSongDuplicate(pl: PlanLike, refId?: string | null, refSubId?: string | null) {
  if (!pl?.items) return false;
  return !!pl.items.find((i) => i.kind === "SONG_BLOCK" && i.refId === refId && i.refSubId === refSubId);
}

export function PlanComposerSection(props: PlanComposerSectionProps) {
  const { plan, reloadPlan, showToast } = props;

  const [addKind, setAddKind] = useState<string>("ANNOUNCEMENT_TEXT");
  const [addTitle, setAddTitle] = useState<string>("Annonce");
  const [addContent, setAddContent] = useState<string>("");
  const [addPdfPage, setAddPdfPage] = useState<string>("1");

  const [songSearch, setSongSearch] = useState("");
  const [songResults, setSongResults] = useState<Array<{ id: string; title: string }>>([]);

  const [bibleRef, setBibleRef] = useState("Jean 3:16-18");
  const [bibleTranslation, setBibleTranslation] = useState<BibleTranslation>("FRLSG");
  const [bibleLoading, setBibleLoading] = useState(false);
  const [bibleError, setBibleError] = useState<string | null>(null);
  const [bibleVerses, setBibleVerses] = useState<Array<{ chapter: number; verse: number; text: string }>>([]);
  const [bibleReference, setBibleReference] = useState<string>("");
  const bibleBooks = useRef<Record<string, BollsBook[]>>({});
  const [bibleSearchText, setBibleSearchText] = useState("");
  const [bibleSearchResults, setBibleSearchResults] = useState<Array<{ book: number; chapter: number; verse: number; text: string }>>([]);
  const [bibleSearchLoading, setBibleSearchLoading] = useState(false);
  const bibleSearchTimer = useRef<NodeJS.Timeout | null>(null);
  const songTimer = useRef<NodeJS.Timeout | null>(null);

  function getBookNameFromCache(bookId: number): string {
    const books = bibleBooks.current[bibleTranslation];
    const found = books?.find((b) => b.bookid === bookId);
    return found?.name || `Livre ${bookId}`;
  }

  async function searchSongs() {
    const list = await window.cp.songs.list(songSearch.trim());
    setSongResults(list);
  }

  async function addSongAllBlocksToPlan(songId: string) {
    const song = await window.cp.songs.get(songId);
    if (!song) {
      showToast("error", "Chant introuvable.");
      return;
    }
    const currentPlan = await window.cp.plans.get(plan.id);
    let added = 0;
    for (const b of song.blocks || []) {
      if (isSongDuplicate(currentPlan, song.id, b.id)) continue;
      await window.cp.plans.addItem({
        planId: plan.id,
        kind: "SONG_BLOCK",
        title: `${song.title} - ${b.title || b.type}`,
        content: b.content || "",
        refId: song.id,
        refSubId: b.id,
      });
      added += 1;
    }
    await reloadPlan(plan.id);
    showToast(added > 0 ? "success" : "info", added > 0 ? "Chant ajoute au plan." : "Tous les blocs etaient deja presents.");
  }

  useEffect(() => {
    if (songTimer.current) clearTimeout(songTimer.current);
    songTimer.current = setTimeout(() => {
      if (songSearch.trim().length === 0) {
        setSongResults([]);
        return;
      }
      void searchSongs();
    }, 250);
    return () => {
      if (songTimer.current) clearTimeout(songTimer.current);
    };
  }, [songSearch]);

  useEffect(() => {
    if (bibleSearchTimer.current) clearTimeout(bibleSearchTimer.current);
    if (!bibleSearchText.trim()) {
      setBibleSearchResults([]);
      return;
    }
    bibleSearchTimer.current = setTimeout(async () => {
      setBibleSearchLoading(true);
      try {
        const trans = bibleTranslation === "LSG1910" ? "FRLSG" : bibleTranslation;
        if (!bibleBooks.current[trans]) {
          bibleBooks.current[trans] = await getBooks(trans);
        }
        const res = await searchVerses(trans, bibleSearchText.trim(), { limit: 20 });
        setBibleSearchResults(res.results.map((r) => ({ book: r.book, chapter: r.chapter, verse: r.verse, text: r.text })));
      } catch (e: unknown) {
        setBibleError(getErrorMessage(e));
        setBibleSearchResults([]);
      } finally {
        setBibleSearchLoading(false);
      }
    }, 350);
    return () => {
      if (bibleSearchTimer.current) clearTimeout(bibleSearchTimer.current);
    };
  }, [bibleSearchText, bibleTranslation]);

  async function fetchBible() {
    setBibleLoading(true);
    setBibleError(null);
    setBibleVerses([]);
    try {
      if (bibleTranslation === "LSG1910") {
        const r = await lookupLSG1910(bibleRef.trim());
        if (!r) throw new Error("Reference non trouvee (offline)");
        setBibleReference(r.reference);
        setBibleVerses(r.verses.map((v) => ({ chapter: v.chapter, verse: v.verse, text: v.text })));
      } else {
        const refText = bibleRef.trim();
        const m = refText.match(/^(.+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/i);
        if (!m) throw new Error("Reference non comprise (ex: Jean 3:16-18)");
        const [, rawBook, chapStr, vStartStr, vEndStr] = m;
        const books = bibleBooks.current[bibleTranslation] || (await getBooks(bibleTranslation));
        bibleBooks.current[bibleTranslation] = books;
        const book = findBookIdByName(books, rawBook);
        if (!book) throw new Error("Livre non trouve pour cette traduction");
        const chap = parseInt(chapStr, 10);
        const max = maxChapter(books, book.bookid);
        if (max && chap > max) throw new Error(`Ce livre n'a que ${max} chapitres`);
        const allVerses = await getChapter(bibleTranslation, book.bookid, chap);
        let filtered = allVerses;
        if (vStartStr) {
          const start = parseInt(vStartStr, 10);
          const end = vEndStr ? parseInt(vEndStr, 10) : start;
          filtered = allVerses.filter((v) => v.verse >= start && v.verse <= end);
        }
        const label = buildReferenceLabel(book, chap, filtered.map((v) => v.verse));
        setBibleReference(label);
        setBibleVerses(filtered.map((v) => ({ chapter: v.chapter, verse: v.verse, text: v.text })));
      }
    } catch (e: unknown) {
      setBibleError(getErrorMessage(e));
    } finally {
      setBibleLoading(false);
    }
  }

  async function addBibleToPlan(mode: "PASSAGE" | "VERSES") {
    if (bibleVerses.length === 0) return;
    const ref = bibleReference || bibleRef.trim();
    const label = bibleTranslation;
    if (mode === "PASSAGE") {
      const body = bibleVerses.map((v) => `${v.chapter}:${v.verse}  ${v.text.trim()}`).join("\n\n");
      await window.cp.plans.addItem({
        planId: plan.id,
        kind: "BIBLE_PASSAGE",
        title: `${ref} (${label})`,
        content: body,
        refId: ref,
        refSubId: label,
      });
    } else {
      for (const v of bibleVerses) {
        const verseRef = `${ref.split(":")[0]}:${v.verse}`;
        const body = `${v.chapter}:${v.verse}  ${v.text.trim()}`;
        await window.cp.plans.addItem({
          planId: plan.id,
          kind: "BIBLE_VERSE",
          title: `${verseRef} (${label})`,
          content: body,
          refId: ref,
          refSubId: `${v.chapter}:${v.verse}`,
        });
      }
    }
    await reloadPlan(plan.id);
  }

  return (
    <div className="cp-stack">
      <div className="cp-section-label cp-mb-0">Ajouter un element</div>

      <div className="cp-grid-220-1">
        <Field label="Type">
          <select value={addKind} onChange={(e) => setAddKind(e.target.value)} className="cp-input-full">
            <option value="ANNOUNCEMENT_TEXT">ANNOUNCEMENT_TEXT</option>
            <option value="VERSE_MANUAL">VERSE_MANUAL</option>
            <option value="BIBLE_VERSE">BIBLE_VERSE</option>
            <option value="BIBLE_PASSAGE">BIBLE_PASSAGE</option>
            <option value="ANNOUNCEMENT_IMAGE">ANNOUNCEMENT_IMAGE</option>
            <option value="ANNOUNCEMENT_PDF">ANNOUNCEMENT_PDF</option>
          </select>
        </Field>
        <Field label="Titre">
          <input value={addTitle} onChange={(e) => setAddTitle(e.target.value)} className="cp-input-full" />
        </Field>
      </div>

      <Field label="Contenu">
        <textarea value={addContent} onChange={(e) => setAddContent(e.target.value)} rows={4} className="cp-input-full" />
      </Field>

      {(addKind === "ANNOUNCEMENT_IMAGE" || addKind === "ANNOUNCEMENT_PDF") && (
        <button
          onClick={async () => {
            const res = await window.cp.files.pickMedia();
            if (res?.ok && res.path) {
              setAddContent(res.path);
            }
          }}
          className="cp-w-220"
        >
          Choisir fichier
        </button>
      )}
      {addKind === "ANNOUNCEMENT_PDF" ? (
        <Field label="Page PDF">
          <input
            type="number"
            min={1}
            value={addPdfPage}
            onChange={(e) => setAddPdfPage(e.target.value)}
            className="cp-input-full"
          />
        </Field>
      ) : null}

      <button
        onClick={async () => {
          const mediaPath =
            addKind === "ANNOUNCEMENT_PDF" && addContent
              ? `${addContent}#page=${parseInt(addPdfPage || "1", 10) || 1}`
              : addKind === "ANNOUNCEMENT_IMAGE"
              ? addContent || undefined
              : undefined;
          await window.cp.plans.addItem({
            planId: plan.id,
            kind: addKind,
            title: addTitle.trim() || undefined,
            content: addContent || undefined,
            mediaPath,
          });
          setAddContent("");
          await reloadPlan(plan.id);
          showToast("success", "Element ajoute au plan.");
        }}
        className="btn-primary cp-w-220"
      >
        + Ajouter
      </button>

      <div className="cp-divider-top">
        <div className="cp-section-label cp-mb-6">Ajouter un chant (recherche)</div>
        <div className="cp-relative">
          <input
            value={songSearch}
            onChange={(e) => setSongSearch(e.target.value)}
            placeholder="Titre, artiste..."
            className="cp-input-full"
          />
          {songResults.length > 0 ? (
            <div className="cp-dropdown-surface">
              {songResults.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => addSongAllBlocksToPlan(s.id)}
                  className="cp-dropdown-option cp-dropdown-option-btn"
                >
                  <div className="cp-field-label">{s.title}</div>
                  <div className="cp-help-text-muted">Ajouter tous les blocs</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="cp-help-text-search">Tape pour chercher un chant.</div>
          )}
        </div>
      </div>

      <div className="cp-divider-top">
        <div className="cp-section-label cp-mb-6">Ajouter un verset/passage</div>
        <ActionRow className="cp-mb-6">
          <input
            value={bibleRef}
            onChange={(e) => setBibleRef(e.target.value)}
            placeholder="Ex: Jean 3:16-18"
            className="cp-flex-1"
          />
          <select
            value={bibleTranslation}
            onChange={(e) => {
              const value = e.target.value;
              if (isBibleTranslation(value)) setBibleTranslation(value);
            }}
            className="cp-input-min-180"
          >
            <option value="LSG">Traduction preferee : LSG (bolls)</option>
            <option value="FRLSG">FRLSG (bolls)</option>
            <option value="WEB">WEB (bolls)</option>
            <option value="LSG1910">LSG1910 offline</option>
          </select>
          <button onClick={fetchBible} disabled={bibleLoading}>
            {bibleLoading ? "..." : "Chercher"}
          </button>
        </ActionRow>
        <div className="cp-mb-8">
          <div className="cp-soft-heading-tight">Recherche texte (bolls)</div>
          <input
            value={bibleSearchText}
            onChange={(e) => setBibleSearchText(e.target.value)}
            placeholder="Mot ou expression"
            className="cp-input-full"
          />
          {bibleSearchLoading ? <div className="cp-help-text-flat">Recherche...</div> : null}
          <div className="cp-search-result-list">
            {bibleSearchResults.map((r, idx) => {
              const bookName = getBookNameFromCache(r.book);
              const refLbl = `${bookName} ${r.chapter}:${r.verse} (${bibleTranslation})`;
              return (
                <div key={`${r.book}-${r.chapter}-${r.verse}-${idx}`} className="cp-search-result-card">
                  <div className="cp-field-label">{refLbl}</div>
                  <div className="cp-search-result-text">{r.text}</div>
                  <ActionRow>
                    <button
                      onClick={async () => {
                        await window.cp.plans.addItem({
                          planId: plan.id,
                          kind: "BIBLE_VERSE",
                          title: refLbl,
                          content: `${r.chapter}:${r.verse}  ${r.text}`,
                          refId: refLbl,
                          refSubId: `${r.chapter}:${r.verse}`,
                        });
                        await reloadPlan(plan.id);
                        showToast("success", "Verset ajoute au plan.");
                      }}
                    >
                      + Verset
                    </button>
                    <button
                      onClick={async () => {
                        await window.cp.plans.addItem({
                          planId: plan.id,
                          kind: "BIBLE_PASSAGE",
                          title: refLbl,
                          content: `${r.chapter}:${r.verse}  ${r.text}`,
                          refId: refLbl,
                          refSubId: `${r.chapter}:${r.verse}`,
                        });
                        await reloadPlan(plan.id);
                        showToast("success", "Passage ajoute au plan.");
                      }}
                    >
                      Passage
                    </button>
                  </ActionRow>
                </div>
              );
            })}
            {bibleSearchText && !bibleSearchResults.length && !bibleSearchLoading ? (
              <div className="cp-help-text-muted">Aucun resultat.</div>
            ) : null}
          </div>
        </div>
        {bibleError ? <div className="cp-error-text">{bibleError}</div> : null}
        {bibleVerses.length > 0 ? (
          <div className="cp-help-text-count">
            {bibleReference || bibleRef}: {bibleVerses.length} versets
          </div>
        ) : null}
        <ActionRow>
          <button className="btn-primary" onClick={() => addBibleToPlan("PASSAGE")} disabled={bibleVerses.length === 0}>
            Ajouter passage
          </button>
          <button onClick={() => addBibleToPlan("VERSES")} disabled={bibleVerses.length === 0}>
            Verset par verset
          </button>
        </ActionRow>
      </div>
    </div>
  );
}
