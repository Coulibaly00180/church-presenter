import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const lookupMocks = vi.hoisted(() => ({
  listLSG1910Books: vi.fn(),
  getLSG1910Chapter: vi.fn(),
}));

vi.mock("./lookupLSG1910", () => ({
  listLSG1910Books: lookupMocks.listLSG1910Books,
  getLSG1910Chapter: lookupMocks.getLSG1910Chapter,
}));

describe("bollsApi offline fallback", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("falls back to local FRLSG books when network is unavailable", async () => {
    lookupMocks.listLSG1910Books.mockResolvedValueOnce([
      { bookid: 1, chronorder: 1, name: "Genese", chapters: 50, bookKey: "Gen" },
    ]);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const { getBooks } = await import("./bollsApi");
    const books = await getBooks("FRLSG");

    expect(books).toEqual([{ bookid: 1, chronorder: 1, name: "Genese", chapters: 50 }]);
    expect(lookupMocks.listLSG1910Books).toHaveBeenCalledTimes(1);
  });

  it("falls back to local FRLSG chapter when network is unavailable", async () => {
    lookupMocks.getLSG1910Chapter.mockResolvedValueOnce([
      { bookId: "John", bookName: "Jean", chapter: 3, verse: 16, text: "Car Dieu..." },
    ]);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const { getChapter } = await import("./bollsApi");
    const verses = await getChapter("FRLSG", 43, 3);

    expect(verses).toHaveLength(1);
    expect(verses[0]).toMatchObject({ translation: "FRLSG", chapter: 3, verse: 16, text: "Car Dieu..." });
    expect(lookupMocks.getLSG1910Chapter).toHaveBeenCalledWith(43, 3);
  });

  it("returns a clear guidance message for non-FRLSG translations offline", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const { getBooks } = await import("./bollsApi");
    await expect(getBooks("WEB")).rejects.toThrow("Bascule sur FRLSG (offline)");
  });
});
