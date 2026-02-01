import data from "./ls1910-mini.json";
import { parseReference, VerseRange } from "./parseRef";

type MiniData = typeof data;

export type OfflineVerse = { bookId: string; bookName: string; chapter: number; verse: number; text: string };

function getBook(d: MiniData, bookId: string) {
  return (d.books as any)[bookId] as any;
}

export function lookupLSG1910(reference: string): { reference: string; verses: OfflineVerse[] } | null {
  const r = parseReference(reference);
  if (!r) return null;

  const book = getBook(data as any, r.bookId);
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
