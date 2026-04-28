import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MediaTab } from "./MediaTab";

const addItemMock = vi.fn();
const inspectMock = vi.fn();

vi.mock("@/hooks/usePlan", () => ({
  usePlan: () => ({
    addItem: addItemMock,
  }),
}));

vi.mock("@/hooks/useLive", () => ({
  useLive: () => ({
    live: null,
  }),
}));

describe("MediaTab", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    addItemMock.mockResolvedValue({ id: "item-1" });
    window.cp = {
      files: {
        listMedia: vi.fn().mockResolvedValue({
          ok: true,
          files: [{ path: "C:\\media\\slide.jpg", name: "slide.jpg", kind: "IMAGE" }],
        }),
        pickMedia: vi.fn(),
      },
      projection: {
        setContentMedia: vi.fn(),
      },
    } as unknown as Window["cp"];
  });

  it("shows explicit preview actions without requiring a double click", async () => {
    const user = userEvent.setup();

    render(<MediaTab onInspectFile={inspectMock} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Ouvrir le detail de slide.jpg" })).not.toBeNull();
    });

    await user.click(screen.getByRole("button", { name: "Ouvrir le detail de slide.jpg" }));

    expect(inspectMock).toHaveBeenCalledWith({
      path: "C:\\media\\slide.jpg",
      name: "slide.jpg",
      kind: "IMAGE",
    });
  });
});
