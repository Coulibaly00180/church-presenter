import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SlidePreview } from "./SlidePreview";

function createProjectionState(): CpProjectionState {
  return {
    mode: "NORMAL",
    lowerThirdEnabled: false,
    transitionEnabled: false,
    textScale: 1,
    textFont: "",
    background: "#111111",
    foreground: "#ffffff",
    current: {
      kind: "TEXT",
      title: "Couplet 1",
      body: "Texte de projection",
    },
    updatedAt: Date.now(),
  };
}

describe("SlidePreview", () => {
  it("uses a real button when the preview is actionable", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <SlidePreview
        projectionState={createProjectionState()}
        variant="next"
        label="Slide suivant"
        onClick={onClick}
      />
    );

    const previewButton = screen.getByRole("button", { name: "Projeter Slide suivant" });

    await user.click(previewButton);
    previewButton.focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");

    expect(onClick).toHaveBeenCalledTimes(3);
  });
});
