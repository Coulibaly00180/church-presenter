import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MainPage } from "./MainPage";
import { createCpMock, createLiveState } from "@/test-utils/cpMocks";
import type { CpPlan } from "../../../shared/ipc";

const { setPlanIdMock, projectPlanItemToTargetMock, toastErrorMock } = vi.hoisted(() => ({
  setPlanIdMock: vi.fn(),
  projectPlanItemToTargetMock: vi.fn(async () => undefined),
  toastErrorMock: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useOutletContext: () => ({ planId: "plan-1", setPlanId: setPlanIdMock }),
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: (...args: unknown[]) => toastErrorMock(...args),
    info: vi.fn(),
  },
}));

vi.mock("@/lib/projection", () => ({
  projectPlanItemToTarget: projectPlanItemToTargetMock,
}));

vi.mock("@/components/plan/PlanToolbar", () => ({
  PlanToolbar: () => <div data-testid="plan-toolbar" />,
}));

vi.mock("@/components/plan/NextPreview", () => ({
  NextPreview: () => <div data-testid="next-preview" />,
}));

vi.mock("@/components/dialogs/AddItemDialog", () => ({
  AddItemDialog: () => null,
}));

vi.mock("@/components/dialogs/EditItemDialog", () => ({
  EditItemDialog: () => null,
}));

vi.mock("@/components/dialogs/ProjectionHistoryDialog", () => ({
  ProjectionHistoryDialog: () => null,
}));

vi.mock("@/components/plan/PlanEditor", () => ({
  PlanEditor: (props: {
    items: Array<{ order: number }>;
    onProject: (item: { order: number }) => void;
    onProjectToScreen?: (item: { order: number }, screen: "A" | "B" | "C") => void;
  }) => (
    <div>
      <button type="button" onClick={() => props.onProject(props.items[0])}>
        project-first
      </button>
      <button type="button" onClick={() => props.onProjectToScreen?.(props.items[0], "B")}>
        project-to-b
      </button>
    </div>
  ),
}));

describe("MainPage live projection chain", () => {
  beforeEach(() => {
    setPlanIdMock.mockReset();
    projectPlanItemToTargetMock.mockClear();
    toastErrorMock.mockReset();
  });

  it("auto-projects the item matching live cursor and updates on cursor change", async () => {
    const cp = createCpMock();
    const plan: CpPlan = {
      id: "plan-1",
      title: "Culte Test",
      date: "2026-02-19",
      items: [
        { id: "i1", planId: "plan-1", order: 0, kind: "ANNOUNCEMENT_TEXT", title: "Intro", content: "Bienvenue" },
        { id: "i2", planId: "plan-1", order: 1, kind: "ANNOUNCEMENT_TEXT", title: "Annonce", content: "Infos" },
      ],
    };

    vi.mocked(cp.plans.get).mockImplementation(async () => plan);
    vi.mocked(cp.live.get).mockImplementation(async () =>
      createLiveState({ cursor: 0, target: "A", enabled: true, updatedAt: 1000 })
    );

    render(<MainPage />);

    await screen.findByText("Culte Test");
    await waitFor(() => {
      expect(cp.live.onUpdate).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(projectPlanItemToTargetMock).toHaveBeenCalledWith(
        "A",
        expect.objectContaining({ id: "i1" }),
        expect.objectContaining({ cursor: 0, target: "A" })
      );
    });

    const liveUpdate = vi.mocked(cp.live.onUpdate).mock.calls[0]?.[0];
    if (!liveUpdate) throw new Error("Missing live:onUpdate handler");
    liveUpdate(createLiveState({ cursor: 1, target: "A", enabled: true, updatedAt: 1001 }));

    await waitFor(() => {
      expect(projectPlanItemToTargetMock).toHaveBeenCalledWith(
        "A",
        expect.objectContaining({ id: "i2" }),
        expect.objectContaining({ cursor: 1, target: "A" })
      );
    });
  });

  it("reprojects when live updatedAt changes with same cursor/target", async () => {
    const cp = createCpMock();
    const plan: CpPlan = {
      id: "plan-1",
      title: "Culte Reproject",
      date: "2026-02-19",
      items: [{ id: "i1", planId: "plan-1", order: 0, kind: "ANNOUNCEMENT_TEXT", title: "Intro", content: "Bienvenue" }],
    };

    vi.mocked(cp.plans.get).mockImplementation(async () => plan);
    vi.mocked(cp.live.get).mockImplementation(async () =>
      createLiveState({ cursor: 0, target: "A", enabled: true, updatedAt: 2000 })
    );

    render(<MainPage />);
    await screen.findByText("Culte Reproject");
    await waitFor(() => {
      expect(cp.live.onUpdate).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(projectPlanItemToTargetMock).toHaveBeenCalledTimes(1);
    });

    const liveUpdate = vi.mocked(cp.live.onUpdate).mock.calls[0]?.[0];
    if (!liveUpdate) throw new Error("Missing live:onUpdate handler");
    liveUpdate(createLiveState({ cursor: 0, target: "A", enabled: true, updatedAt: 2001 }));

    await waitFor(() => {
      expect(projectPlanItemToTargetMock).toHaveBeenCalledTimes(2);
    });
  });

  it("blocks auto projection when the live target is locked", async () => {
    const cp = createCpMock();
    const plan: CpPlan = {
      id: "plan-1",
      title: "Culte Locked",
      date: "2026-02-19",
      items: [{ id: "i1", planId: "plan-1", order: 0, kind: "ANNOUNCEMENT_TEXT", title: "Intro", content: "Bienvenue" }],
    };

    vi.mocked(cp.plans.get).mockImplementation(async () => plan);
    vi.mocked(cp.live.get).mockImplementation(async () =>
      createLiveState({
        cursor: 0,
        target: "B",
        enabled: true,
        lockedScreens: { A: false, B: true, C: false },
        updatedAt: 3000,
      })
    );

    render(<MainPage />);
    await screen.findByText("Culte Locked");
    await waitFor(() => {
      expect(cp.live.get).toHaveBeenCalledTimes(1);
    });
    expect(projectPlanItemToTargetMock).not.toHaveBeenCalled();
  });

  it("manual project uses live API and enforces lock on explicit screen projection", async () => {
    const cp = createCpMock();
    const plan: CpPlan = {
      id: "plan-1",
      title: "Culte Manual",
      date: "2026-02-19",
      items: [{ id: "i1", planId: "plan-1", order: 4, kind: "ANNOUNCEMENT_TEXT", title: "Intro", content: "Bienvenue" }],
    };

    vi.mocked(cp.plans.get).mockImplementation(async () => plan);
    vi.mocked(cp.live.get).mockImplementation(async () =>
      createLiveState({
        cursor: 4,
        target: "A",
        enabled: true,
        lockedScreens: { A: false, B: true, C: false },
        updatedAt: 4000,
      })
    );

    render(<MainPage />);
    await screen.findByText("Culte Manual");

    fireEvent.click(screen.getByRole("button", { name: "project-first" }));
    await waitFor(() => {
      expect(cp.live.setCursor).toHaveBeenCalledWith(4);
    });

    fireEvent.click(screen.getByRole("button", { name: "project-to-b" }));
    expect(cp.live.set).not.toHaveBeenCalledWith(expect.objectContaining({ target: "B" }));
    expect(toastErrorMock).toHaveBeenCalled();
  });
});
