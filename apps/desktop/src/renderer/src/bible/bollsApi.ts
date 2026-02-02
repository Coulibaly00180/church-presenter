/* bolls.life API client - fetches books, chapters, verses and search.
 * Docs: https://bolls.life/api (updated Feb 2025) citeturn0search0
 */
export type BollsBook = { bookid: number; chronorder: number; name: string; chapters: number };
export type BollsVerse = { pk: number; translation: string; book: number; chapter: number; verse: number; text: string; comment?: string };
export type BollsFindResult = { total: number; exact_matches: number; results: BollsVerse[] };

const booksCache: Record<string, BollsBook[] | undefined> = {};

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

export async function getBooks(translation: string): Promise<BollsBook[]> {
  if (booksCache[translation]) return booksCache[translation]!;
  const r = await fetch(`https://bolls.life/get-books/${translation}/`);
  if (!r.ok) throw new Error(`Traduction inconnue ou indispo (${translation})`);
  const json = await r.json();
  booksCache[translation] = json;
  return json;
}

export async function getChapter(translation: string, bookId: number, chapter: number): Promise<BollsVerse[]> {
  const r = await fetch(`https://bolls.life/get-text/${translation}/${bookId}/${chapter}/`);
  if (!r.ok) throw new Error(`Chapitre introuvable (${translation} ${bookId}:${chapter})`);
  const json = (await r.json()) as BollsVerse[];
  return json.map((v) => ({ ...v, text: stripHtml(v.text) }));
}

export async function getVerse(translation: string, bookId: number, chapter: number, verse: number): Promise<BollsVerse> {
  const r = await fetch(`https://bolls.life/get-verse/${translation}/${bookId}/${chapter}/${verse}/`);
  if (!r.ok) throw new Error(`Verset introuvable (${translation} ${bookId}:${chapter}:${verse})`);
  const v = (await r.json()) as BollsVerse;
  return { ...v, text: stripHtml(v.text) };
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
  const json = (await r.json()) as BollsVerse[][];
  return json.map((arr) => arr.map((v) => ({ ...v, text: stripHtml(v.text) })));
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
