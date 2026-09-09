import { afterEach, describe, expect, it, vi } from "vitest";

import { MIME_CANDIDATES, pickMimeType } from "./useRecorder";

/**
 * Solo se prueba `pickMimeType`, la única parte de este hook que es lógica
 * pura (qué candidato elegir dado lo que el navegador dice soportar). El
 * resto del hook depende de cámara/canvas real y ya lo cubre `e2e/`.
 */
describe("pickMimeType", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("es undefined sin MediaRecorder (navegador no soportado)", () => {
    vi.stubGlobal("MediaRecorder", undefined);
    expect(pickMimeType()).toBeUndefined();
  });

  it("prefiere el primer candidato de vp9 con audio cuando todo está soportado", () => {
    vi.stubGlobal("MediaRecorder", { isTypeSupported: () => true });
    expect(pickMimeType()).toBe(MIME_CANDIDATES[0]);
  });

  it("cae a MP4/H.264 en un navegador que solo lo soporta a él (Safari)", () => {
    vi.stubGlobal("MediaRecorder", {
      isTypeSupported: (type: string) => type.startsWith("video/mp4"),
    });
    expect(pickMimeType()).toBe("video/mp4;codecs=h264,aac");
  });

  it("es undefined si ningún candidato está soportado", () => {
    vi.stubGlobal("MediaRecorder", { isTypeSupported: () => false });
    expect(pickMimeType()).toBeUndefined();
  });
});
