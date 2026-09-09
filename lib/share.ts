/**
 * Detección de soporte para compartir archivos vía Web Share API (Level 2):
 * disponible en Chrome/Safari para Android e iOS, no en la mayoría de
 * navegadores de escritorio. Sin esto, la única forma de pasar un clip a
 * TikTok/Instagram es descargarlo y subirlo a mano desde la app de destino.
 */
export function canShareFiles(files: File[]): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files })
  );
}

/** `AbortError` es el usuario cerrando la hoja de compartir: no es un fallo real. */
export function isShareAbort(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
