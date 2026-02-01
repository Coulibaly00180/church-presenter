export type VerseRange = { bookId: string; bookName: string; chapter: number; from: number; to: number };

type BookEntry = { id: string; name: string; aliases: string[] };

const BOOKS: BookEntry[] = [
  { id: "JHN", name: "Jean", aliases: ["jean", "jn", "jhn", "john"] },
  { id: "PSA", name: "Psaumes", aliases: ["psaume", "psaumes", "ps", "psa", "psalm", "psalms"] },
];

// Parse formats:
// - "Jean 3:16-18"
// - "Jn 3:16"
// - "Psaume 23" (=> verses 1-999; caller may clamp)
export function parseReference(input: string): VerseRange | null {
  const raw = (input || "").trim();
  if (!raw) return null;

  // Normalize separators
  const s = raw.replace(/\./g, ":").replace(/\s+/g, " ").trim();

  // Split book part and the rest
  const m = s.match(/^(.+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/i);
  if (!m) {
    // maybe "Psaume 23" already matches; if not, give up
    return null;
  }

  const bookPart = m[1].trim().toLowerCase();
  const chapter = Number(m[2]);
  const from = m[3] ? Number(m[3]) : 1;
  const to = m[4] ? Number(m[4]) : (m[3] ? Number(m[3]) : 999);

  const book = BOOKS.find((b) => b.aliases.includes(bookPart) || b.name.toLowerCase() === bookPart);
  if (!book || !Number.isFinite(chapter) || chapter <= 0) return null;

  return { bookId: book.id, bookName: book.name, chapter, from, to };
}
