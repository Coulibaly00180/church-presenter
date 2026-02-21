import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectionPage } from "./ProjectionPage";
import { createCpMock, createProjectionState } from "@/test-utils/cpMocks";

describe("ProjectionPage keyboard behavior", () => {
  beforeEach(() => {
    window.location.hash = "#/projection?screen=A";
  });

  it("advances live when text has a single block", async () => {
    const cp = createCpMock();
    const state = createProjectionState({
      current: { kind: "TEXT", title: "Titre", body: "Ligne unique" },
    });
    vi.mocked(cp.screens.getState).mockResolvedValue(state);

    render(<ProjectionPage />);
    await screen.findByText("Ligne unique");

    fireEvent.keyDown(window, { key: "ArrowRight" });

    await waitFor(() => {
      expect(cp.live.next).toHaveBeenCalledTimes(1);
    });
  });

  it("navigates text blocks first, then advances live at boundary", async () => {
    const cp = createCpMock();
    const state = createProjectionState({
      current: { kind: "TEXT", title: "Titre", body: "Bloc 1\n\nBloc 2" },
    });
    vi.mocked(cp.screens.getState).mockResolvedValue(state);

    render(<ProjectionPage />);
    await screen.findByText("Bloc 1");

    fireEvent.keyDown(window, { key: "ArrowRight" });
    await screen.findByText("Bloc 2");
    expect(cp.live.next).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: "ArrowRight" });
    await waitFor(() => {
      expect(cp.live.next).toHaveBeenCalledTimes(1);
    });
  });
});

