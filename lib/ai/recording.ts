export interface OutputSize {
  width: number;
  height: number;
}

/** Tamaño máximo del lado largo del vídeo grabado; de sobra para redes sociales. */
export const MAX_OUTPUT_DIMENSION = 1080;

/**
 * Resolución de salida para grabar el recorte de entrega: no amplía la
 * imagen, solo la reduce si el recorte supera `maxDimension` en su lado
 * largo. Los codecs de vídeo quieren dimensiones pares.
 */
export function computeOutputSize(
  cropWidthPx: number,
  cropHeightPx: number,
  maxDimension: number = MAX_OUTPUT_DIMENSION,
): OutputSize {
  const scale = Math.min(1, maxDimension / Math.max(cropWidthPx, cropHeightPx));
  return {
    width: Math.max(2, Math.round((cropWidthPx * scale) / 2) * 2),
    height: Math.max(2, Math.round((cropHeightPx * scale) / 2) * 2),
  };
}
