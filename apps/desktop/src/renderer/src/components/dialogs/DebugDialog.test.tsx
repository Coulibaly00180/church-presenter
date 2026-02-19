import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DebugDialog } from "./DebugDialog";
import { createCpMock } from "@/test-utils/cpMocks";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("DebugDialog", () => {
  beforeEach(() => {
    createCpMock();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn(async () => undefined),
      },
    });
  });

  it("loads diagnostics state when opened", async () => {
    render(<DebugDialog open onOpenChange={vi.fn()} />);

    await screen.findByText("Debug diagnostics");
    await screen.findByText("0.0.1-test");
    await screen.findByText("Folders");
  });

  it("copies diagnostics payload to clipboard", async () => {
    render(<DebugDialog open onOpenChange={vi.fn()} />);

    const copyBtn = await screen.findByRole("button", { name: /copy json/i });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    });
  });
});
