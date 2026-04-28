import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "./Dashboard";

const usePlanMock = vi.fn();

vi.mock("@/hooks/usePlan", () => ({
  usePlan: () => usePlanMock(),
}));

vi.mock("@/components/dialogs/CreatePlanDialog", () => ({
  CreatePlanDialog: () => null,
}));

beforeEach(() => {
  vi.resetAllMocks();
  usePlanMock.mockReturnValue({
    planList: [],
    selectPlan: vi.fn(),
    createPlan: vi.fn(),
  });
  window.cp = {
    songs: {
      list: vi.fn().mockResolvedValue([]),
    },
  } as unknown as Window["cp"];
});

describe("Dashboard", () => {
  it("renders the integrated quick start instead of a blocking overlay", async () => {
    render(
      <Dashboard
        showQuickStart
        importingData={false}
        onDismissQuickStart={vi.fn()}
        onCreateSong={vi.fn()}
        onImportData={vi.fn()}
      />
    );

    expect(screen.getByText("Premiers pas")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Créer votre premier chant" })).not.toBeNull();

    await waitFor(() => {
      expect(screen.getAllByText("0").length).toBeGreaterThan(0);
    });
  });
});
