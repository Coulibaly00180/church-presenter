import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsDialog } from "./SettingsDialog";

describe("SettingsDialog", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    window.cp = {
      projection: {
        getState: vi.fn().mockResolvedValue({
          backgroundMode: "SOLID",
          background: "#000000",
          foregroundMode: "SOLID",
          foreground: "#ffffff",
          textScale: 1,
          titleTextScale: 1,
          textFont: "system-ui",
          logoOpacity: 80,
          logoScale: 100,
          logoPosition: "bottom-right",
        }),
        setAppearance: vi.fn().mockResolvedValue(undefined),
      },
      settings: {
        getTheme: vi.fn().mockResolvedValue({ ok: true, theme: "light" }),
        setTheme: vi.fn().mockResolvedValue({ ok: true }),
      },
      screens: {
        list: vi.fn().mockResolvedValue([{ key: "A", isOpen: true, mirror: { kind: "FREE" } }]),
        open: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        setMirror: vi.fn().mockResolvedValue(undefined),
      },
      files: {
        pickMedia: vi.fn(),
        pickFont: vi.fn(),
        validateFont: vi.fn(),
      },
      data: {
        exportAll: vi.fn(),
        importAll: vi.fn(),
      },
    } as unknown as Window["cp"];
  });

  it("uses a side navigation and keeps the projection preview visible across tabs", async () => {
    const user = userEvent.setup();

    render(<SettingsDialog open onClose={vi.fn()} />);

    expect(await screen.findByRole("button", { name: "Projection Presets, fond, texte et logo." })).not.toBeNull();
    expect(screen.getByText("Apercu projection")).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Ecrans Ouverture et modes miroir." }));

    expect(screen.getByText("Apercu projection")).not.toBeNull();
    expect(screen.getByText("Ecran A")).not.toBeNull();
  });
});
