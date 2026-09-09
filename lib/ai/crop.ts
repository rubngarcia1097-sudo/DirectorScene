import type { BoundingBox } from "./types";

/**
 * Rectángulo de entrega: la parte del frame de cámara que realmente se publica.
 *
 * Una webcam 16:9 grabando para TikTok (9:16) solo entrega la franja central.
 * Todo el análisis trabaja dentro de ese recorte, así "centrado" o "zona
 * segura" significan lo mismo que en la app de destino.
 */
export function computeCropRect(
  videoAspect: number,
  targetAspect: number,
): BoundingBox {
  if (!Number.isFinite(videoAspect) || videoAspect <= 0) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  if (videoAspect > targetAspect) {
    // El frame es más ancho que el destino: recortamos por los lados.
    const width = targetAspect / videoAspect;
    return { x: (1 - width) / 2, y: 0, width, height: 1 };
  }

  // Más alto que el destino: recortamos arriba y abajo.
  const height = videoAspect / targetAspect;
  return { x: 0, y: (1 - height) / 2, width: 1, height };
}

/** Pasa un punto normalizado del frame completo al espacio del recorte. */
export function toCropSpace(
  point: { x: number; y: number },
  crop: BoundingBox,
): { x: number; y: number } {
  return {
    x: (point.x - crop.x) / crop.width,
    y: (point.y - crop.y) / crop.height,
  };
}
