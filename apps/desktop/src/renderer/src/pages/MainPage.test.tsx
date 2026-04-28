import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MainPage } from "./MainPage";

const sourcePanelProps = vi.fn();
const planEditorProps = vi.fn();
const inspectorProps = vi.fn();

vi.mock("@/components/layout/AppShell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/source/SourcePanel", () => ({
  SourcePanel: (props: Record<string, unknown>) => {
    sourcePanelProps(props);
    return (
      <button type="button" onClick={() => (props.onSelectSong as (id: string) => void)?.("song-1")}>
        Ouvrir chant
      </button>
    );
  },
}));

vi.mock("@/components/plan/PlanEditor", () => ({
  PlanEditor: (props: Record<string, unknown>) => {
    planEditorProps(props);
    return <div>Plan editor permanent</div>;
  },
}));

vi.mock("@/components/inspector/WorkspaceInspector", () => ({
  WorkspaceInspector: (props: Record<string, unknown>) => {
    inspectorProps(props);
    const state = props.state as { kind?: string; songId?: string } | null;
    return <div>{state?.kind === "SONG" ? `Inspecteur ${state.songId}` : "Inspecteur vide"}</div>;
  },
}));

vi.mock("@/components/dialogs/SongEditorDialog", () => ({
  SongEditorDialog: () => null,
}));

describe("MainPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    window.cp = {
      songs: { list: vi.fn().mockResolvedValue([{ id: "song-1" }]) },
      plans: { list: vi.fn().mockResolvedValue([{ id: "plan-1" }]) },
    } as unknown as Window["cp"];
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1440 });
  });

  it("keeps the plan visible while opening a song in the inspector", async () => {
    const user = userEvent.setup();

    render(<MainPage />);

    await waitFor(() => {
      expect(screen.getByText("Plan editor permanent")).not.toBeNull();
    });

    await user.click(screen.getByRole("button", { name: "Ouvrir chant" }));

    expect(screen.getByText("Plan editor permanent")).not.toBeNull();
    expect(screen.getByText("Inspecteur song-1")).not.toBeNull();
  });
});
