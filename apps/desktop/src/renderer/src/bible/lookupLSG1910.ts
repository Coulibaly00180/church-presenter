import { parseReference } from "./parseRef";

type OfflineBook = {
  name: string;
  chapters: Record<string, Record<string, string>>;
};

type OfflineData = {
  meta: {
    id: string;
    name: string;
    cacheVersion: string;
  };
  books: Record<string, OfflineBook>;
};

export type LSG1910BookCatalogEntry = {
  bookid: number;
  chronorder: number;
  name: string;
  chapters: number;
  bookKey: string;
};

export type OfflineVerse = { bookId: string; bookName: string; chapter: number; verse: number; text: string };

let lsgDataPromise: Promise<OfflineData> | null = null;
let lsgCatalogPromise: Promise<LSG1910BookCatalogEntry[]> | null = null;

async function loadLSG1910Data(): Promise<OfflineData> {
  if (!lsgDataPromise) {
    lsgDataPromise = import("./ls1910-full.json")
      .then((mod) => ((mod as { default?: unknown }).default ?? mod) as OfflineData)
      .catch((error: unknown) => {
        lsgDataPromise = null;
        throw error;
      });
  }
  return lsgDataPromise;
}

function getBook(data: OfflineData, bookId: string) {
  return data.books[bookId];
}

function toSortedVerses(bookId: string, bookName: string, chapter: number, chapterObj: Record<string, string>) {
  return Object.entries(chapterObj)
    .map(([verseStr, text]) => ({
      bookId,
      bookName,
      chapter,
      verse: Number(verseStr),
      text: String(text),
    }))
    .filter((v) => Number.isFinite(v.verse) && v.verse > 0)
    .sort((a, b) => a.verse - b.verse);
}

async function buildLSG1910Catalog(): Promise<LSG1910BookCatalogEntry[]> {
  const data = await loadLSG1910Data();
  const entries = Object.entries(data.books || {});
  return entries.map(([bookKey, book], idx) => ({
    bookid: idx + 1,
    chronorder: idx + 1,
    name: book.name || bookKey,
    chapters: Object.keys(book.chapters || {}).length,
    bookKey,
  }));
}

export async function listLSG1910Books(): Promise<LSG1910BookCatalogEntry[]> {
  if (!lsgCatalogPromise) {
    lsgCatalogPromise = buildLSG1910Catalog().catch((error: unknown) => {
      lsgCatalogPromise = null;
      throw error;
    });
  }
  return lsgCatalogPromise;
}

export async function getLSG1910Chapter(bookId: number, chapter: number): Promise<OfflineVerse[] | null> {
  const data = await loadLSG1910Data();
  const catalog = await listLSG1910Books();
  const match = catalog.find((entry) => entry.bookid === bookId);
  if (!match) return null;

  const book = data.books[match.bookKey];
  if (!book) return null;

  const chapterObj = (book.chapters || {})[String(chapter)];
  if (!chapterObj) return null;

  const verses = toSortedVerses(match.bookKey, book.name || match.bookKey, chapter, chapterObj);
  return verses.length > 0 ? verses : null;
}

export async function lookupLSG1910(reference: string): Promise<{ reference: string; verses: OfflineVerse[] } | null> {
  const r = parseReference(reference);
  if (!r) return null;

  const data = await loadLSG1910Data();
  const book = getBook(data, r.bookId);
  if (!book) return null;

  const chapterObj = (book.chapters || {})[String(r.chapter)];
  if (!chapterObj) return null;

  const verses: OfflineVerse[] = [];
  const max = r.to;
  for (let v = r.from; v <= max; v += 1) {
    const t = chapterObj[String(v)];
    if (!t) break;
    verses.push({ bookId: r.bookId, bookName: r.bookName, chapter: r.chapter, verse: v, text: String(t) });
  }

  if (!verses.length) return null;
  const refLabel = `${r.bookName} ${r.chapter}:${r.from}${verses.length > 1 ? "-" + verses[verses.length - 1].verse : ""}`;
  return { reference: refLabel, verses };
}
