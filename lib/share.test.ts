import { afterEach, describe, expect, it, vi } from "vitest";

import { canShareFiles, isShareAbort } from "./share";

describe("canShareFiles", () => {
  const file = new File(["x"], "clip.webm", { type: "video/webm" });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("es false sin navigator.share/canShare (la mayoría de navegadores de escritorio)", () => {
    vi.stubGlobal("navigator", {});
    expect(canShareFiles([file])).toBe(false);
  });

  it("delega en navigator.canShare cuando está disponible", () => {
    vi.stubGlobal("navigator", {
      share: vi.fn(),
      canShare: vi.fn(() => true),
    });
    expect(canShareFiles([file])).toBe(true);
  });

  it("respeta que navigator.canShare rechace ese tipo de archivo", () => {
    vi.stubGlobal("navigator", {
      share: vi.fn(),
      canShare: vi.fn(() => false),
    });
    expect(canShareFiles([file])).toBe(false);
  });
});

describe("isShareAbort", () => {
  it("reconoce el cierre de la hoja de compartir como no-error", () => {
    const abort = new DOMException("cancelled", "AbortError");
    expect(isShareAbort(abort)).toBe(true);
  });

  it("no confunde otros errores con un abort", () => {
    expect(isShareAbort(new Error("boom"))).toBe(false);
    expect(isShareAbort("boom")).toBe(false);
  });
});
