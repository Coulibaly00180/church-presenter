import React, { useEffect, useRef, useState } from "react";
import { lookupLSG1910 } from "../../bible/lookupLSG1910";
import { findBookIdByName, getBooks, getChapter, maxChapter, buildReferenceLabel, searchVerses } from "../../bible/bollsApi";
import { Plan } from "./types";

type ToastKind = "info" | "success" | "error";

type PlanComposerSectionProps = {
  plan: Plan;
  reloadPlan: (id: string) => Promise<void>;
  showToast: (kind: ToastKind, text: string) => void;
};

function isSongDuplicate(pl: Plan | null, refId?: string | null, refSubId?: string | null) {
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
  const [bibleTranslation, setBibleTranslation] = useState<"LSG1910" | "LSG" | "WEB" | "FRLSG">("FRLSG");
  const [bibleLoading, setBibleLoading] = useState(false);
  const [bibleError, setBibleError] = useState<string | null>(null);
  const [bibleVerses, setBibleVerses] = useState<Array<{ chapter: number; verse: number; text: string }>>([]);
  const [bibleReference, setBibleReference] = useState<string>("");
  const bibleBooks = useRef<Record<string, any[]>>({});
  const [bibleSearchText, setBibleSearchText] = useState("");
  const [bibleSearchResults, setBibleSearchResults] = useState<Array<{ book: number; chapter: number; verse: number; text: string }>>([]);
  const [bibleSearchLoading, setBibleSearchLoading] = useState(false);
  const bibleSearchTimer = useRef<NodeJS.Timeout | null>(null);
  const songTimer = useRef<NodeJS.Timeout | null>(null);

  function getBookNameFromCache(bookId: number): string {
    const books = bibleBooks.current[bibleTranslation];
    const found = books?.find((b: any) => b.bookid === bookId);
    return found?.name || `Livre ${bookId}`;
  }

  async function searchSongs() {
    const list = await window.cp.songs.list(songSearch.trim());
    setSongResults(list);
  }

  async function addSongAllBlocksToPlan(songId: string) {
    const song = await window.cp.songs.get(songId);
    const currentPlan = await window.cp.plans.get(plan.id);
    let added = 0;
    for (const b of song.blocks || []) {
      if (isSongDuplicate(currentPlan as Plan, song.id, b.id)) continue;
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
    showToast(added > 0 ? "success" : "info", added > 0 ? "Chant ajoute au plan" : "Tous les blocs etaient deja presents");
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
      } catch (e: any) {
        setBibleError(e?.message || String(e));
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
        const r = lookupLSG1910(bibleRef.trim());
        if (!r) throw new Error("Reference non trouvee (offline mini)");
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
    } catch (e: any) {
      setBibleError(e?.message || String(e));
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
        // eslint-disable-next-line no-await-in-loop
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
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ fontWeight: 800 }}>Ajouter un element</div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 8 }}>
        <label>
          <div style={{ fontWeight: 600 }}>Type</div>
          <select value={addKind} onChange={(e) => setAddKind(e.target.value)} style={{ width: "100%", padding: 10 }}>
            <option value="ANNOUNCEMENT_TEXT">ANNOUNCEMENT_TEXT</option>
            <option value="VERSE_MANUAL">VERSE_MANUAL</option>
            <option value="BIBLE_VERSE">BIBLE_VERSE</option>
            <option value="BIBLE_PASSAGE">BIBLE_PASSAGE</option>
            <option value="ANNOUNCEMENT_IMAGE">ANNOUNCEMENT_IMAGE</option>
            <option value="ANNOUNCEMENT_PDF">ANNOUNCEMENT_PDF</option>
          </select>
        </label>
        <label>
          <div style={{ fontWeight: 600 }}>Titre</div>
          <input value={addTitle} onChange={(e) => setAddTitle(e.target.value)} style={{ width: "100%", padding: 10 }} />
        </label>
      </div>

      <label>
        <div style={{ fontWeight: 600 }}>Contenu</div>
        <textarea value={addContent} onChange={(e) => setAddContent(e.target.value)} rows={4} style={{ width: "100%", padding: 10 }} />
      </label>

      {(addKind === "ANNOUNCEMENT_IMAGE" || addKind === "ANNOUNCEMENT_PDF") && (
        <button
          onClick={async () => {
            const res = await window.cp.files.pickMedia();
            if (res?.ok && res.path) {
              setAddContent(res.path);
            }
          }}
          style={{ padding: "8px 10px", width: 220 }}
        >
          Choisir fichier
        </button>
      )}
      {addKind === "ANNOUNCEMENT_PDF" ? (
        <label>
          <div style={{ fontWeight: 600 }}>Page PDF</div>
          <input
            type="number"
            min={1}
            value={addPdfPage}
            onChange={(e) => setAddPdfPage(e.target.value)}
            style={{ width: "100%", padding: 10 }}
          />
        </label>
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
          showToast("success", "Element ajoute au plan");
        }}
        style={{ padding: "10px 14px", width: 220 }}
      >
        + Ajouter
      </button>

      <div style={{ borderTop: "1px solid #eee", paddingTop: 8 }}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>Ajouter un chant (recherche)</div>
        <div style={{ position: "relative" }}>
          <input
            value={songSearch}
            onChange={(e) => setSongSearch(e.target.value)}
            placeholder="Titre, artiste..."
            style={{ width: "100%", padding: 10 }}
          />
          {songResults.length > 0 ? (
            <div
              style={{
                position: "absolute",
                top: "110%",
                left: 0,
                right: 0,
                background: "white",
                border: "1px solid var(--border)",
                borderRadius: 12,
                boxShadow: "var(--shadow)",
                zIndex: 5,
                maxHeight: 200,
                overflow: "auto",
              }}
            >
              {songResults.map((s) => (
                <div
                  key={s.id}
                  onClick={() => addSongAllBlocksToPlan(s.id)}
                  style={{
                    padding: 10,
                    cursor: "pointer",
                    borderBottom: "1px solid #f1f5f9",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{s.title}</div>
                  <div style={{ fontSize: 12, opacity: 0.65 }}>Ajouter tous les blocs</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ opacity: 0.6, fontSize: 12, marginTop: 6 }}>Tape pour chercher un chant.</div>
          )}
        </div>
      </div>

      <div style={{ borderTop: "1px solid #eee", paddingTop: 8 }}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>Ajouter un verset/passage</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
          <input
            value={bibleRef}
            onChange={(e) => setBibleRef(e.target.value)}
            placeholder="Ex: Jean 3:16-18"
            style={{ flex: 1, padding: 10 }}
          />
          <select value={bibleTranslation} onChange={(e) => setBibleTranslation(e.target.value as any)} style={{ padding: 10, minWidth: 180 }}>
            <option value="LSG">Traduction preferee : LSG (bolls)</option>
            <option value="WEB">WEB (bolls)</option>
            <option value="LSG1910">LSG1910 offline</option>
          </select>
          <button onClick={fetchBible} disabled={bibleLoading} style={{ padding: "10px 12px" }}>
            {bibleLoading ? "..." : "Chercher"}
          </button>
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Recherche texte (bolls)</div>
          <input
            value={bibleSearchText}
            onChange={(e) => setBibleSearchText(e.target.value)}
            placeholder="Mot ou expression"
            style={{ width: "100%" }}
          />
          {bibleSearchLoading ? <div style={{ opacity: 0.7, fontSize: 12 }}>Recherche...</div> : null}
          <div style={{ maxHeight: 160, overflow: "auto", display: "grid", gap: 6, marginTop: 6 }}>
            {bibleSearchResults.map((r, idx) => {
              const bookName = getBookNameFromCache(r.book);
              const refLbl = `${bookName} ${r.chapter}:${r.verse} (${bibleTranslation})`;
              return (
                <div
                  key={`${r.book}-${r.chapter}-${r.verse}-${idx}`}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: 10,
                    display: "grid",
                    gap: 6,
                    background: "#fff",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{refLbl}</div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>{r.text}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
                        showToast("success", "Verset ajoute au plan");
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
                        showToast("success", "Passage ajoute au plan");
                      }}
                    >
                      Passage
                    </button>
                  </div>
                </div>
              );
            })}
            {bibleSearchText && !bibleSearchResults.length && !bibleSearchLoading ? (
              <div style={{ opacity: 0.6, fontSize: 12 }}>Aucun resultat</div>
            ) : null}
          </div>
        </div>
        {bibleError ? <div style={{ color: "crimson", fontSize: 13 }}>{bibleError}</div> : null}
        {bibleVerses.length > 0 ? (
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
            {bibleReference || bibleRef}: {bibleVerses.length} versets
          </div>
        ) : null}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => addBibleToPlan("PASSAGE")} disabled={bibleVerses.length === 0}>
            Ajouter passage
          </button>
          <button onClick={() => addBibleToPlan("VERSES")} disabled={bibleVerses.length === 0}>
            Verset par verset
          </button>
        </div>
      </div>
    </div>
  );
}
