import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlanEditor } from "./PlanEditor";

const usePlanMock = vi.fn();
const useLiveMock = vi.fn();

vi.mock("@/hooks/usePlan", () => ({
  usePlan: () => usePlanMock(),
}));

vi.mock("@/hooks/useLive", () => ({
  useLive: () => useLiveMock(),
}));

vi.mock("./PlanToolbar", () => ({
  PlanToolbar: () => <div>Plan toolbar</div>,
}));

vi.mock("./PlanItemCard", () => ({
  PlanItemCard: ({ item }: { item: CpPlanItem }) => <div>{item.title}</div>,
  PlanItemCardGhost: () => <div>Ghost</div>,
}));

vi.mock("@/components/dialogs/AddItemDialog", () => ({
  AddItemDialog: () => null,
}));

vi.mock("@/components/dialogs/SongEditorDialog", () => ({
  SongEditorDialog: () => null,
}));

vi.mock("@/components/dialogs/EditItemDialog", () => ({
  EditItemDialog: () => null,
}));

vi.mock("@/components/dialogs/ServicePreviewDialog", () => ({
  ServicePreviewDialog: () => null,
}));

function createPlan(): CpPlan {
  return {
    id: "plan-1",
    title: "Service du dimanche",
    date: "2026-04-06",
    backgroundConfig: null,
    items: [
      { id: "item-1", planId: "plan-1", order: 0, kind: "ANNOUNCEMENT_TEXT", title: "Accueil", content: "Bienvenue" },
      { id: "item-2", planId: "plan-1", order: 1, kind: "VERSE_MANUAL", title: "Lecture", content: "Jean 3:16" },
    ],
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  usePlanMock.mockReturnValue({
    plan: createPlan(),
    reorder: vi.fn(),
    loadingPlan: false,
    addItem: vi.fn(),
    removeItems: vi.fn(),
  });
  useLiveMock.mockReturnValue({
    live: {
      enabled: true,
      planId: "plan-1",
      cursor: 0,
      target: "A",
      black: false,
      white: false,
      lockedScreens: { A: false, B: false, C: false },
      updatedAt: Date.now(),
    },
  });
});

describe("PlanEditor", () => {
  it("uses the shared input styling for plan search", () => {
    render(<PlanEditor />);

    const searchInput = screen.getByRole("textbox", { name: "Rechercher dans le plan" });
    expect(searchInput.className).toContain("border-border");
    expect(searchInput.className).toContain("rounded-md");
  });

  it("shows a clear filtered state when no plan item matches", async () => {
    const user = userEvent.setup();

    render(<PlanEditor />);

    await user.type(screen.getByRole("textbox", { name: "Rechercher dans le plan" }), "introuvable");

    await waitFor(() => {
      expect(screen.getByText("Aucun résultat pour « introuvable »")).not.toBeNull();
    });
    expect(screen.getByRole("button", { name: "Effacer" })).not.toBeNull();
  });
});
