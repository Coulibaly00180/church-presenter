/* bolls.life API client - fetches books, chapters, verses and search.
 * Docs: https://bolls.life/api (updated Feb 2025) citeturn0search0
 */
export type BollsBook = { bookid: number; chronorder: number; name: string; chapters: number };
export type BollsVerse = { pk: number; translation: string; book: number; chapter: number; verse: number; text: string; comment?: string };
export type BollsFindResult = { total: number; exact_matches: number; results: BollsVerse[] };
type BollsLanguageResponse = Array<{ language: string; translations?: CpBibleTranslation[] }>;

const booksCache: Record<string, BollsBook[] | undefined> = {};
let translationsCache: Array<{ language: string; short_name: string; full_name: string; dir?: string }> | null = null;

function stripHtml(html: string): string {
  if (!html) return "";
  const noTags = html.replace(/<[^>]+>/g, "");
  return noTags.replace(/\s+/g, " ").trim();
}

function norm(x: string) {
  return x
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeVerse(
  raw: Partial<BollsVerse> & { text?: string },
  fallback: { translation: string; book: number; chapter: number; verse: number }
): BollsVerse {
  return {
    pk: typeof raw.pk === "number" ? raw.pk : 0,
    translation: typeof raw.translation === "string" ? raw.translation : fallback.translation,
    book: typeof raw.book === "number" ? raw.book : fallback.book,
    chapter: typeof raw.chapter === "number" ? raw.chapter : fallback.chapter,
    verse: typeof raw.verse === "number" ? raw.verse : fallback.verse,
    text: stripHtml(String(raw.text ?? "")),
    comment: typeof raw.comment === "string" ? raw.comment : undefined,
  };
}

export async function getBooks(translation: string): Promise<BollsBook[]> {
  // In-memory cache
  if (booksCache[translation]) return booksCache[translation]!;

  // Try localStorage cache for offline/boot
  try {
    const key = `bolls_books_${translation}`;
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as BollsBook[];
      booksCache[translation] = parsed;
      // do not return yet: attempt background refresh to keep up to date
      void refreshBooks(translation, key);
      return parsed;
    }
  } catch {
    // ignore cache errors
  }

  const books = await fetchBooks(translation);
  return books;
}

async function refreshBooks(translation: string, key: string) {
  try {
    const fresh = await fetchBooks(translation);
    if (typeof localStorage !== "undefined") localStorage.setItem(key, JSON.stringify(fresh));
  } catch {
    // silent refresh failure
  }
}

async function fetchBooks(translation: string): Promise<BollsBook[]> {
  const r = await fetch(`https://bolls.life/get-books/${translation}/`);
  if (!r.ok) throw new Error(`Traduction inconnue ou indispo (${translation})`);
  const json = (await r.json()) as BollsBook[];
  booksCache[translation] = json;
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(`bolls_books_${translation}`, JSON.stringify(json));
  } catch {
    // ignore storage issues
  }
  return json;
}

export async function getChapter(translation: string, bookId: number, chapter: number): Promise<BollsVerse[]> {
  const r = await fetch(`https://bolls.life/get-text/${translation}/${bookId}/${chapter}/`);
  if (!r.ok) throw new Error(`Chapitre introuvable (${translation} ${bookId}:${chapter})`);
  const json = (await r.json()) as Array<Partial<BollsVerse> & { text?: string }>;
  return json.map((v, idx) => normalizeVerse(v, { translation, book: bookId, chapter, verse: idx + 1 }));
}

export async function getVerse(translation: string, bookId: number, chapter: number, verse: number): Promise<BollsVerse> {
  const r = await fetch(`https://bolls.life/get-verse/${translation}/${bookId}/${chapter}/${verse}/`);
  if (!r.ok) throw new Error(`Verset introuvable (${translation} ${bookId}:${chapter}:${verse})`);
  const v = (await r.json()) as Partial<BollsVerse> & { text?: string };
  return normalizeVerse(v, { translation, book: bookId, chapter, verse });
}

export async function searchVerses(
  translation: string,
  query: string,
  opts?: { matchCase?: boolean; matchWhole?: boolean; page?: number; limit?: number; book?: "ot" | "nt" }
): Promise<BollsFindResult> {
  const params = new URLSearchParams();
  params.set("search", query);
  params.set("match_case", String(!!opts?.matchCase));
  params.set("match_whole", String(!!opts?.matchWhole));
  if (opts?.page) params.set("page", String(opts.page));
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.book) params.set("book", opts.book);

  const r = await fetch(`https://bolls.life/v2/find/${translation}?${params.toString()}`);
  if (!r.ok) throw new Error(`Recherche impossible (${r.status})`);
  const json = (await r.json()) as BollsFindResult;
  json.results = json.results.map((v) => ({ ...v, text: stripHtml(v.text) }));
  return json;
}

export async function getVersesBatch(
  payload: Array<{ translation: string; book: number; chapter: number; verses: number[] }>
): Promise<BollsVerse[][]> {
  const r = await fetch("https://bolls.life/get-verses/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`Batch verses KO (${r.status})`);
  const json = (await r.json()) as Array<Array<Partial<BollsVerse> & { text?: string }>>;
  return json.map((arr, idx) =>
    arr.map((v, verseIdx) =>
      normalizeVerse(v, {
        translation: payload[idx]?.translation ?? "",
        book: payload[idx]?.book ?? 0,
        chapter: payload[idx]?.chapter ?? 0,
        verse: payload[idx]?.verses?.[verseIdx] ?? verseIdx + 1,
      })
    )
  );
}

export function findBookIdByName(books: BollsBook[], search: string): BollsBook | undefined {
  const n = norm(search);
  return books.find((b) => norm(b.name) === n || norm(b.name).startsWith(n));
}

export function maxChapter(books: BollsBook[], bookId: number): number | null {
  const b = books.find((x) => x.bookid === bookId);
  return b ? b.chapters : null;
}

export function buildReferenceLabel(book: BollsBook | undefined, chapter: number, verses?: number[]) {
  if (!book) return "";
  if (!verses || verses.length === 0) return `${book.name} ${chapter}`;
  if (verses.length === 1) return `${book.name} ${chapter}:${verses[0]}`;
  return `${book.name} ${chapter}:${Math.min(...verses)}-${Math.max(...verses)}`;
}

export function versesToText(verses: BollsVerse[]): string {
  return verses.map((v) => `${v.chapter}:${v.verse}  ${v.text.trim()}`).join("\n\n");
}

export async function listTranslations(): Promise<Array<{ language: string; short_name: string; full_name: string; dir?: string }>> {
  if (translationsCache) return translationsCache;
  // Try IPC (main process avoids CORS)
  if (typeof window !== "undefined") {
    const resp = await window.cp.bible.listTranslations();
    if (resp.ok && Array.isArray(resp.data)) {
      const flat = resp.data.flatMap((l) =>
        (l.translations || []).map((t) => ({ language: l.language, short_name: t.short_name, full_name: t.full_name, dir: t.dir }))
      );
      translationsCache = flat;
      return flat;
    }
    if (!resp.ok && resp.error) throw new Error(resp.error);
  }

  // Fallback direct fetch (may fail if CORS)
  const r = await fetch("https://bolls.life/static/bolls/app/views/languages.json");
  if (!r.ok) throw new Error("Impossible de charger les traductions");
  const json = (await r.json()) as BollsLanguageResponse;
  const flat = json.flatMap((l) => (l.translations || []).map((t) => ({ language: l.language, ...t })));
  translationsCache = flat;
  return flat;
}
