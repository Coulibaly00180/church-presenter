import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Header } from "./Header";

const useLiveMock = vi.fn();
const usePlanMock = vi.fn();

vi.mock("@/hooks/useLive", () => ({
  useLive: () => useLiveMock(),
}));

vi.mock("@/hooks/usePlan", () => ({
  usePlan: () => usePlanMock(),
}));

function createLiveState(overrides: Partial<CpLiveState> = {}): CpLiveState {
  return {
    enabled: false,
    planId: null,
    cursor: 0,
    target: "A",
    black: false,
    white: false,
    lockedScreens: { A: false, B: false, C: false },
    updatedAt: Date.now(),
    ...overrides,
  };
}

function createPlanState() {
  return {
    planList: [{ id: "plan-1", title: "Culte du matin", date: "2026-04-06" }],
    selectedPlanId: "plan-1",
    plan: {
      id: "plan-1",
      title: "Culte du matin",
      date: "2026-04-06",
      items: [],
      backgroundConfig: null,
    },
    selectPlan: vi.fn(),
    refreshList: vi.fn(),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  window.cp = {
    live: {
      set: vi.fn(),
    },
    plans: {
      duplicate: vi.fn(),
    },
  } as unknown as Window["cp"];
});

describe("Header", () => {
  it("disables direct mode when no plan is selected", () => {
    useLiveMock.mockReturnValue({
      live: createLiveState(),
      toggle: vi.fn(),
      startFreeMode: vi.fn(),
    });
    usePlanMock.mockReturnValue({
      ...createPlanState(),
      selectedPlanId: null,
      plan: null,
    });

    render(<Header />);

    const directButton = screen.getByRole("button", { name: "Entrer en mode Direct" }) as HTMLButtonElement;
    const freeButton = screen.getByRole("button", { name: "Passer en mode Libre" }) as HTMLButtonElement;

    expect(directButton.disabled).toBe(true);
    expect(freeButton.disabled).toBe(false);
  });

  it("shows the direct exit action when projection is already running on a plan", () => {
    useLiveMock.mockReturnValue({
      live: createLiveState({ enabled: true, planId: "plan-1" }),
      toggle: vi.fn(),
      startFreeMode: vi.fn(),
    });
    usePlanMock.mockReturnValue(createPlanState());

    render(<Header />);

    expect(screen.getByRole("button", { name: "Quitter le mode Direct" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Entrer en mode Direct" })).toBeNull();
  });
});
