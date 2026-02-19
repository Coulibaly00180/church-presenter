import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LiveBar } from "./LiveBar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createCpMock, createLiveState } from "@/test-utils/cpMocks";

describe("LiveBar", () => {
  beforeEach(() => {
    createCpMock();
  });

  it("renders realtime mini previews for screens A/B/C", async () => {
    render(
      <TooltipProvider>
        <LiveBar />
      </TooltipProvider>
    );

    await screen.findByRole("button", { name: /ecran a/i });
    await screen.findByRole("button", { name: /ecran b/i });
    await screen.findByRole("button", { name: /ecran c/i });
  });

  it("routes interactions to live and screens APIs", async () => {
    const cp = createCpMock();

    render(
      <TooltipProvider>
        <LiveBar />
      </TooltipProvider>
    );

    const noirBtn = await screen.findByRole("button", { name: /noir/i });
    fireEvent.click(noirBtn);
    expect(cp.live.toggleBlack).toHaveBeenCalledTimes(1);

    const screenBMini = await screen.findByRole("button", { name: /ecran b/i });
    fireEvent.click(screenBMini);
    expect(cp.live.setTarget).toHaveBeenCalledWith("B");

    fireEvent.doubleClick(screenBMini);
    await waitFor(() => {
      expect(cp.screens.open).toHaveBeenCalledWith("B");
    });
  });

  it("enforces lock for target and mode controls", async () => {
    const cp = createCpMock();
    cp.live.get = vi.fn(async () =>
      createLiveState({
        target: "B",
        lockedScreens: { A: false, B: true, C: false },
      })
    );

    render(
      <TooltipProvider>
        <LiveBar />
      </TooltipProvider>
    );

    const screenBBtn = await screen.findByRole("button", { name: /ecran b/i });
    expect((screenBBtn as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screenBBtn);
    expect(cp.live.setTarget).not.toHaveBeenCalledWith("B");

    const noirBtn = screen.getByRole("button", { name: /noir/i });
    expect((noirBtn as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(noirBtn);
    expect(cp.live.toggleBlack).not.toHaveBeenCalled();
  });

  it("toggles lower-third on non-A target through screens state", async () => {
    const cp = createCpMock();
    cp.live.get = vi.fn(async () =>
      createLiveState({
        target: "B",
        lockedScreens: { A: false, B: false, C: false },
      })
    );

    render(
      <TooltipProvider>
        <LiveBar />
      </TooltipProvider>
    );

    const lowerThirdBtn = await screen.findByRole("button", { name: /lower-third/i });
    fireEvent.click(lowerThirdBtn);

    await waitFor(() => {
      expect(cp.screens.setState).toHaveBeenCalledWith("B", { lowerThirdEnabled: true });
    });
  });
});
