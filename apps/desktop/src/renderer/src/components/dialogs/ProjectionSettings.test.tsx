import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectionSettings } from "./ProjectionSettings";
import { createCpMock } from "@/test-utils/cpMocks";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("ProjectionSettings", () => {
  beforeEach(() => {
    createCpMock();
    vi.spyOn(window, "prompt").mockReturnValue("Assemblee 2");
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("loads active profile and library folder on open", async () => {
    render(<ProjectionSettings open onOpenChange={vi.fn()} />);

    await screen.findByText("Assembly profile");
    await screen.findByText("Assemblee Test");
    await screen.findByText("C:\\media");
  });

  it("saves active profile", async () => {
    const cp = createCpMock();
    render(<ProjectionSettings open onOpenChange={vi.fn()} />);

    await screen.findByText("Assemblee Test");
    const saveBtn = screen.getByRole("button", { name: /save/i });
    await waitFor(() => {
      expect((saveBtn as HTMLButtonElement).disabled).toBe(false);
    });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(cp.settings.saveActiveProfile).toHaveBeenCalledTimes(1);
    });
  });

  it("updates screen B mirror mode", async () => {
    const cp = createCpMock();
    render(<ProjectionSettings open onOpenChange={vi.fn()} />);

    const bLabel = await screen.findByText("Screen B mapping");
    const bContainer = bLabel.closest("div");
    expect(bContainer).not.toBeNull();
    if (!bContainer) return;

    const modeSelect = within(bContainer).getByRole("combobox");
    fireEvent.change(modeSelect, { target: { value: "MIRROR" } });

    await waitFor(() => {
      expect(cp.screens.setMirror).toHaveBeenCalledWith("B", { kind: "MIRROR", from: "A" });
    });
  });
});
