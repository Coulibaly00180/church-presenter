export type BollsBook = { bookid: number; chronorder: number; name: string; chapters: number };
export type BollsVerse = { pk: number; translation: string; book: number; chapter: number; verse: number; text: string; comment?: string };
export type BollsFindResult = { total: number; exact_matches: number; results: BollsVerse[] };
type BollsLanguageResponse = Array<{ language: string; translations?: CpBibleTranslation[] }>;

const booksCache: Record<string, BollsBook[] | undefined> = {};
let translationsCache: Array<{ language: string; short_name: string; full_name: string; dir?: string }> | null = null;
const BOLLS_CACHE_VERSION = "2026-02-14-frlsg-v1";
const CACHE_PREFIX = `bolls_${BOLLS_CACHE_VERSION}`;
const FALLBACK_TRANSLATIONS = [{ language: "French Français", short_name: "FRLSG", full_name: "Bible Segond 1910", dir: "ltr" }];

function stripHtml(html: string): string {
  if (!html) return "";
  const noTags = html.replace(/<[^>]+>/g, "");
  return noTags.replace(/\s+/g, " ").trim();
}

type CachedPayload<T> = {
  version: string;
  updatedAt: string;
  data: T;
};

function cacheKey(kind: string, suffix?: string) {
  return suffix ? `${CACHE_PREFIX}_${kind}_${suffix}` : `${CACHE_PREFIX}_${kind}`;
}

function readCache<T>(key: string): T | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPayload<T>;
    if (!parsed || parsed.version !== BOLLS_CACHE_VERSION) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, value: T) {
  try {
    if (typeof localStorage === "undefined") return;
    const payload: CachedPayload<T> = {
      version: BOLLS_CACHE_VERSION,
      updatedAt: new Date().toISOString(),
      data: value,
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore storage failures
  }
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
  if (booksCache[translation]) return booksCache[translation]!;

  const key = cacheKey("books", translation);
  const fromCache = readCache<BollsBook[]>(key);
  if (fromCache) {
    booksCache[translation] = fromCache;
    void refreshBooks(translation, key);
    return fromCache;
  }

  return fetchBooks(translation);
}

async function refreshBooks(translation: string, key: string) {
  try {
    const fresh = await fetchBooks(translation);
    writeCache(key, fresh);
  } catch {
    // silent refresh failure
  }
}

async function fetchBooks(translation: string): Promise<BollsBook[]> {
  const r = await fetch(`https://bolls.life/get-books/${translation}/`);
  if (!r.ok) throw new Error(`Traduction inconnue ou indispo (${translation})`);
  const json = (await r.json()) as BollsBook[];
  booksCache[translation] = json;
  writeCache(cacheKey("books", translation), json);
  return json;
}

export async function getChapter(translation: string, bookId: number, chapter: number): Promise<BollsVerse[]> {
  const key = cacheKey("chapter", `${translation}_${bookId}_${chapter}`);
  const cached = readCache<BollsVerse[]>(key);

  try {
    const r = await fetch(`https://bolls.life/get-text/${translation}/${bookId}/${chapter}/`);
    if (!r.ok) throw new Error(`Chapitre introuvable (${translation} ${bookId}:${chapter})`);
    const json = (await r.json()) as Array<Partial<BollsVerse> & { text?: string }>;
    const verses = json.map((v, idx) => normalizeVerse(v, { translation, book: bookId, chapter, verse: idx + 1 }));
    writeCache(key, verses);
    return verses;
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
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

  const key = cacheKey("translations");
  const cached = readCache<Array<{ language: string; short_name: string; full_name: string; dir?: string }>>(key);
  if (cached && cached.length > 0) {
    translationsCache = cached;
  }

  if (typeof window !== "undefined") {
    try {
      const resp = await window.cp.bible.listTranslations();
      if (resp.ok && Array.isArray(resp.data)) {
        const flat = resp.data.flatMap((l) =>
          (l.translations || []).map((t) => ({ language: l.language, short_name: t.short_name, full_name: t.full_name, dir: t.dir }))
        );
        translationsCache = flat;
        writeCache(key, flat);
        return flat;
      }
      if (!resp.ok && resp.error && !cached) throw new Error(resp.error);
    } catch {
      if (cached && cached.length > 0) return cached;
    }
  }

  try {
    const r = await fetch("https://bolls.life/static/bolls/app/views/languages.json");
    if (!r.ok) throw new Error("Impossible de charger les traductions");
    const json = (await r.json()) as BollsLanguageResponse;
    const flat = json.flatMap((l) => (l.translations || []).map((t) => ({ language: l.language, ...t })));
    translationsCache = flat;
    writeCache(key, flat);
    return flat;
  } catch {
    if (cached && cached.length > 0) return cached;
    return FALLBACK_TRANSLATIONS;
  }
}
