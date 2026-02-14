import { bcv_parser } from "bible-passage-reference-parser/esm/bcv_parser.js";
import * as fr from "bible-passage-reference-parser/esm/lang/fr.js";

export type VerseRange = { bookId: string; bookName: string; chapter: number; from: number; to: number };

const parser = new bcv_parser(fr);

const BOOK_NAMES: Record<string, string> = {
  Gen: "Genèse",
  Exod: "Exode",
  Lev: "Lévitique",
  Num: "Nombres",
  Deut: "Deutéronome",
  Josh: "Josué",
  Judg: "Juges",
  Ruth: "Ruth",
  "1Sam": "1 Samuel",
  "2Sam": "2 Samuel",
  "1Kgs": "1 Rois",
  "2Kgs": "2 Rois",
  "1Chr": "1 Chroniques",
  "2Chr": "2 Chroniques",
  Ezra: "Esdras",
  Neh: "Néhémie",
  Esth: "Esther",
  Job: "Job",
  Ps: "Psaumes",
  Prov: "Proverbes",
  Eccl: "Ecclésiaste",
  Song: "Cantique",
  Isa: "Ésaïe",
  Jer: "Jérémie",
  Lam: "Lamentations",
  Ezek: "Ézékiel",
  Dan: "Daniel",
  Hos: "Osée",
  Joel: "Joël",
  Amos: "Amos",
  Obad: "Abdias",
  Jonah: "Jonas",
  Mic: "Michée",
  Nah: "Nahum",
  Hab: "Habacuc",
  Zeph: "Sophonie",
  Hag: "Aggée",
  Zech: "Zacharie",
  Mal: "Malachie",
  Matt: "Matthieu",
  Mark: "Marc",
  Luke: "Luc",
  John: "Jean",
  Acts: "Actes",
  Rom: "Romains",
  "1Cor": "1 Corinthiens",
  "2Cor": "2 Corinthiens",
  Gal: "Galates",
  Eph: "Éphésiens",
  Phil: "Philippiens",
  Col: "Colossiens",
  "1Thess": "1 Thessaloniciens",
  "2Thess": "2 Thessaloniciens",
  "1Tim": "1 Timothée",
  "2Tim": "2 Timothée",
  Titus: "Tite",
  Phlm: "Philémon",
  Heb: "Hébreux",
  Jas: "Jacques",
  "1Pet": "1 Pierre",
  "2Pet": "2 Pierre",
  "1John": "1 Jean",
  "2John": "2 Jean",
  "3John": "3 Jean",
  Jude: "Jude",
  Rev: "Apocalypse",
};

export function parseReference(input: string): VerseRange | null {
  const raw = (input || "").trim();
  if (!raw) return null;

  const envelopes = parser.parse(raw).parsed_entities();
  const firstEnvelope = envelopes[0];
  const firstEntity = firstEnvelope?.entities?.[0];
  const start = firstEntity?.start;
  const end = firstEntity?.end ?? start;

  const bookId = start?.b;
  const chapter = Number(start?.c);
  const from = Number(start?.v ?? 1);
  const to = Number(end?.v ?? from);
  const endBookId = end?.b ?? bookId;
  const endChapter = Number(end?.c ?? chapter);

  if (!bookId || !BOOK_NAMES[bookId]) return null;
  if (!Number.isFinite(chapter) || chapter <= 0) return null;
  if (!Number.isFinite(from) || from <= 0) return null;
  if (!Number.isFinite(to) || to < from) return null;
  if (endBookId !== bookId || endChapter !== chapter) return null;

  return { bookId, bookName: BOOK_NAMES[bookId], chapter, from, to };
}
