import { describe, expect, it, vi } from "vitest";

import { openDevtoolsWithGuard } from "./devtools";

describe("openDevtoolsWithGuard", () => {
  it("returns a typed refusal in packaged mode", () => {
    const open = vi.fn();
    const result = openDevtoolsWithGuard("REGIE", {
      isPackaged: true,
      openers: { REGIE: open },
    });

    expect(result).toEqual({ ok: false, reason: "DISABLED_IN_PROD" });
    expect(open).not.toHaveBeenCalled();
  });

  it("opens target in dev mode", () => {
    const open = vi.fn();
    const result = openDevtoolsWithGuard("REGIE", {
      isPackaged: false,
      openers: { REGIE: open },
    });

    expect(result).toEqual({ ok: true });
    expect(open).toHaveBeenCalledTimes(1);
  });
});
