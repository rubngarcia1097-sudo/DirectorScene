/**
 * Filtros de imagen: mismo `filter` CSS aplicado a la vista previa (el
 * `<video>`), al canvas de análisis (para que las sugerencias de luz
 * reaccionen a lo que de verdad se ve y se graba, no al frame crudo de la
 * cámara) y a los canvas de grabación y foto — lo que se previsualiza es
 * exactamente lo que queda en el clip.
 */

export type FilterPresetId = "none" | "warm" | "cool" | "bw" | "vivid";

export interface FilterPreset {
  id: FilterPresetId;
  label: string;
  description: string;
  /** Cadena `filter` de CSS/Canvas2D; vacía para "Ninguno". */
  css: string;
}

export const FILTER_PRESETS: Record<FilterPresetId, FilterPreset> = {
  none: {
    id: "none",
    label: "Ninguno",
    description: "Color tal cual lo capta la cámara.",
    css: "",
  },
  warm: {
    id: "warm",
    label: "Cálido",
    description: "Tono dorado — comida, piel, escenas de interior con luz amarilla.",
    css: "sepia(0.25) saturate(1.15) hue-rotate(-6deg)",
  },
  cool: {
    id: "cool",
    label: "Frío",
    description: "Tono azulado — tech, moda, escenas nocturnas.",
    css: "saturate(1.1) hue-rotate(6deg) brightness(1.02)",
  },
  bw: {
    id: "bw",
    label: "Blanco y negro",
    description: "Sin color — storytime serio, look editorial.",
    css: "grayscale(1) contrast(1.1)",
  },
  vivid: {
    id: "vivid",
    label: "Vívido",
    description: "Colores e ilumación más marcados — producto, moda, exteriores.",
    css: "saturate(1.35) contrast(1.08)",
  },
};

export const FILTER_PRESET_LIST = Object.values(FILTER_PRESETS);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Ajuste manual de luz: -1..1, pensado como corrección digital rápida
 * mientras se consigue luz de verdad (una lámpara, girarse hacia la
 * ventana...), no como sustituto. 0 no toca la imagen — sin filtro ni
 * coste de legibilidad de "por qué mi grabación se ve distinta".
 */
export function buildLightAdjustmentCss(amount: number): string {
  const clamped = clamp(amount, -1, 1);
  if (clamped === 0) return "";

  // Rango deliberadamente conservador (0.7x–1.35x): compensar penumbra o un
  // reflejo puntual sin lavar la imagen ni generar ruido de compresión raro.
  const brightness = 1 + clamped * (clamped > 0 ? 0.35 : 0.3);
  const contrast = 1 + Math.abs(clamped) * 0.1;
  return `brightness(${brightness.toFixed(3)}) contrast(${contrast.toFixed(3)})`;
}

/** Combina el look elegido con el ajuste manual de luz en una sola cadena. */
export function composeFilterCss(presetId: FilterPresetId, lightAdjustment: number): string {
  return [FILTER_PRESETS[presetId].css, buildLightAdjustmentCss(lightAdjustment)]
    .filter(Boolean)
    .join(" ");
}
