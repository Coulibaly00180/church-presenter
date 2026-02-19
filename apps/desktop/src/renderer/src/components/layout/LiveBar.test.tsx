import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LiveBar } from "./LiveBar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createCpMock } from "@/test-utils/cpMocks";

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
});
