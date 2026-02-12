import data from "./ls1910-mini.json";
import { parseReference } from "./parseRef";

type MiniBook = {
  name: string;
  chapters: Record<string, Record<string, string>>;
};

type MiniData = {
  books: Record<string, MiniBook>;
};

const lsgData = data as unknown as MiniData;

export type OfflineVerse = { bookId: string; bookName: string; chapter: number; verse: number; text: string };

function getBook(d: MiniData, bookId: string) {
  return d.books[bookId];
}

export function lookupLSG1910(reference: string): { reference: string; verses: OfflineVerse[] } | null {
  const r = parseReference(reference);
  if (!r) return null;

  const book = getBook(lsgData, r.bookId);
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
