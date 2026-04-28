import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BibleTab } from "./BibleTab";

vi.mock("@/hooks/useLive", () => ({
  useLive: () => ({ live: null }),
}));

vi.mock("@/hooks/usePlan", () => ({
  usePlan: () => ({ addItem: vi.fn() }),
}));

vi.mock("@/bible/lookupLSG1910", () => ({
  listLSG1910Books: vi.fn().mockResolvedValue([]),
  getLSG1910Chapter: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/bible/bollsApi", () => ({
  listTranslations: vi.fn().mockResolvedValue([]),
  searchVerses: vi.fn().mockResolvedValue([]),
  getChapter: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/bible/parseRef", () => ({
  parseReference: vi.fn().mockReturnValue(null),
}));

describe("BibleTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.cp = {
      live: {
        onFreeNavigate: vi.fn(() => () => undefined),
      },
    } as unknown as Window["cp"];
  });

  it("exposes distinct quick and advanced modes", async () => {
    render(<BibleTab />);

    expect(screen.getByRole("button", { name: "Rapide" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Avance" })).not.toBeNull();
    expect(await screen.findByText("Reference rapide, parcours du texte et ajout direct au plan.")).not.toBeNull();
  });
});
