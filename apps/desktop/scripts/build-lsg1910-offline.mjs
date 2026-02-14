import { mkdir, writeFile } from "fs/promises";
import { dirname, resolve } from "path";

const API_BASE_URL = "https://bolls.life";
const SOURCE_TRANSLATION = "FRLSG";
const CACHE_VERSION = "2026-02-14-frlsg-v1";
const CHAPTER_FETCH_CONCURRENCY = 6;
const OUTPUT_PATH = resolve("src/renderer/src/bible/ls1910-full.json");

const OSIS_BY_BOOK_ID = [
  "Gen",
  "Exod",
  "Lev",
  "Num",
  "Deut",
  "Josh",
  "Judg",
  "Ruth",
  "1Sam",
  "2Sam",
  "1Kgs",
  "2Kgs",
  "1Chr",
  "2Chr",
  "Ezra",
  "Neh",
  "Esth",
  "Job",
  "Ps",
  "Prov",
  "Eccl",
  "Song",
  "Isa",
  "Jer",
  "Lam",
  "Ezek",
  "Dan",
  "Hos",
  "Joel",
  "Amos",
  "Obad",
  "Jonah",
  "Mic",
  "Nah",
  "Hab",
  "Zeph",
  "Hag",
  "Zech",
  "Mal",
  "Matt",
  "Mark",
  "Luke",
  "John",
  "Acts",
  "Rom",
  "1Cor",
  "2Cor",
  "Gal",
  "Eph",
  "Phil",
  "Col",
  "1Thess",
  "2Thess",
  "1Tim",
  "2Tim",
  "Titus",
  "Phlm",
  "Heb",
  "Jas",
  "1Pet",
  "2Pet",
  "1John",
  "2John",
  "3John",
  "Jude",
  "Rev",
];

function sleep(ms) {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

function stripHtml(text) {
  return String(text ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchJsonWithRetry(url, maxRetries = 4) {
  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) break;
      await sleep(200 * (attempt + 1));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function build() {
  const rawBooks = await fetchJsonWithRetry(`${API_BASE_URL}/get-books/${SOURCE_TRANSLATION}/`);
  if (!Array.isArray(rawBooks) || rawBooks.length !== OSIS_BY_BOOK_ID.length) {
    throw new Error(`Unexpected book count for ${SOURCE_TRANSLATION}: ${Array.isArray(rawBooks) ? rawBooks.length : "invalid payload"}`);
  }

  const books = {};
  for (const rawBook of rawBooks) {
    const bookId = Number(rawBook.bookid);
    const chaptersCount = Number(rawBook.chapters);
    const name = String(rawBook.name ?? "").trim();
    const osis = OSIS_BY_BOOK_ID[bookId - 1];
    if (!osis || !Number.isFinite(chaptersCount) || chaptersCount <= 0 || !name) {
      throw new Error(`Invalid book payload: ${JSON.stringify(rawBook)}`);
    }

    const chapters = {};
    for (let start = 1; start <= chaptersCount; start += CHAPTER_FETCH_CONCURRENCY) {
      const chunk = [];
      const chapterNumbers = [];
      for (let chapter = start; chapter < start + CHAPTER_FETCH_CONCURRENCY && chapter <= chaptersCount; chapter += 1) {
        chapterNumbers.push(chapter);
        chunk.push(fetchJsonWithRetry(`${API_BASE_URL}/get-text/${SOURCE_TRANSLATION}/${bookId}/${chapter}/`));
      }

      const chapterPayloads = await Promise.all(chunk);
      chapterPayloads.forEach((chapterPayload, index) => {
        const chapterNumber = chapterNumbers[index];
        const verses = {};
        if (Array.isArray(chapterPayload)) {
          for (const rawVerse of chapterPayload) {
            const verseNumber = Number(rawVerse.verse);
            if (!Number.isFinite(verseNumber) || verseNumber <= 0) continue;
            verses[String(verseNumber)] = stripHtml(rawVerse.text);
          }
        }
        chapters[String(chapterNumber)] = verses;
      });
    }

    books[osis] = { name, chapters };
    console.log(`Built ${osis} (${name})`);
  }

  const payload = {
    meta: {
      id: "LSG1910-full",
      name: "Bible Segond 1910 (FRLSG offline)",
      source: API_BASE_URL,
      sourceTranslation: SOURCE_TRANSLATION,
      cacheVersion: CACHE_VERSION,
      generatedAt: new Date().toISOString(),
    },
    books,
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(payload), "utf-8");
  console.log(`Written ${OUTPUT_PATH}`);
}

build().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
