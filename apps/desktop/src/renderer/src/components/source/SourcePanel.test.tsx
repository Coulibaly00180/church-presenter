import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SourcePanel } from "./SourcePanel";

vi.mock("./SongsTab", () => ({
  SongsTab: () => <div>Contenu chants</div>,
}));

vi.mock("./BibleTab", () => ({
  BibleTab: () => <div>Contenu bible</div>,
}));

vi.mock("./AnnouncementsTab", () => ({
  AnnouncementsTab: () => <div>Contenu annonces</div>,
}));

vi.mock("./MediaTab", () => ({
  MediaTab: () => <div>Contenu medias</div>,
}));

vi.mock("./TimerTab", () => ({
  TimerTab: () => <div>Contenu minuterie</div>,
}));

vi.mock("@/components/dialogs/SongEditorDialog", () => ({
  SongEditorDialog: () => null,
}));

describe("SourcePanel", () => {
  it("shows visible labels for the primary navigation in expanded mode", () => {
    render(<SourcePanel />);

    expect(screen.getByRole("button", { name: "Chants" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Bible" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Chants" })).not.toBeNull();
  });

  it("keeps the reduced mode understandable and expandable", async () => {
    const user = userEvent.setup();

    render(<SourcePanel />);

    await user.click(screen.getByRole("button", { name: "Reduire le panneau sources" }));

    expect(screen.getByRole("button", { name: "Afficher le panneau sources" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Bible" })).not.toBeNull();
  });
});
