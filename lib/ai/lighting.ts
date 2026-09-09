import { clamp01 } from "./subject";
import type { BoundingBox, LightingMetrics, Suggestion } from "./types";

export const EMPTY_LIGHTING: LightingMetrics = {
  brightness: 0,
  contrast: 0,
  clippedHighlights: 0,
  crushedShadows: 0,
  sideBalance: 0,
  subjectBrightness: null,
  backgroundBrightness: 0,
  warmth: 0,
};

/**
 * Lee el histograma de luminancia de un frame ya reducido (típicamente 160px de
 * ancho) y devuelve métricas de iluminación. El ImageData se descarta al salir:
 * ningún píxel se guarda ni se envía a ninguna parte.
 */
export function analyzeLighting(
  image: ImageData,
  subjectBox: BoundingBox | null,
): LightingMetrics {
  const { data, width, height } = image;
  const totalPixels = width * height;
  if (totalPixels === 0) return EMPTY_LIGHTING;

  let sum = 0;
  let sumSquares = 0;
  let clipped = 0;
  let crushed = 0;
  let leftSum = 0;
  let leftCount = 0;
  let rightSum = 0;
  let rightCount = 0;
  let redSum = 0;
  let blueSum = 0;
  let subjectSum = 0;
  let subjectCount = 0;
  let backgroundSum = 0;
  let backgroundCount = 0;

  const box = subjectBox
    ? {
        x0: Math.floor(subjectBox.x * width),
        x1: Math.ceil((subjectBox.x + subjectBox.width) * width),
        y0: Math.floor(subjectBox.y * height),
        y1: Math.ceil((subjectBox.y + subjectBox.height) * height),
      }
    : null;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      // Luminancia perceptual (Rec. 601): más fiel al ojo que la media RGB.
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;

      sum += luma;
      sumSquares += luma * luma;
      redSum += r;
      blueSum += b;
      if (luma >= 250) clipped += 1;
      if (luma <= 8) crushed += 1;

      if (x < width / 2) {
        leftSum += luma;
        leftCount += 1;
      } else {
        rightSum += luma;
        rightCount += 1;
      }

      const inSubject =
        box !== null && x >= box.x0 && x < box.x1 && y >= box.y0 && y < box.y1;
      if (inSubject) {
        subjectSum += luma;
        subjectCount += 1;
      } else {
        backgroundSum += luma;
        backgroundCount += 1;
      }
    }
  }

  const mean = sum / totalPixels;
  const variance = Math.max(0, sumSquares / totalPixels - mean * mean);
  const leftMean = leftCount ? leftSum / leftCount : 0;
  const rightMean = rightCount ? rightSum / rightCount : 0;

  return {
    brightness: mean / 255,
    contrast: Math.sqrt(variance) / 128,
    clippedHighlights: clipped / totalPixels,
    crushedShadows: crushed / totalPixels,
    sideBalance: (leftMean - rightMean) / 255,
    subjectBrightness: subjectCount ? subjectSum / subjectCount / 255 : null,
    backgroundBrightness: backgroundCount
      ? backgroundSum / backgroundCount / 255
      : mean / 255,
    warmth: (redSum - blueSum) / totalPixels / 255,
  };
}

/** Traduce las métricas de luz en instrucciones de dirección. */
export function evaluateLighting(light: LightingMetrics): Suggestion[] {
  const suggestions: Suggestion[] = [];

  if (light.brightness < 0.22) {
    suggestions.push({
      id: "light-dark",
      category: "iluminacion",
      severity: light.brightness < 0.14 ? "warn" : "info",
      message: "Falta luz: ponte de cara a una ventana o enciende una lámpara",
      hint: "Con poca luz el sensor sube el ISO y la imagen sale con ruido.",
    });
  } else if (light.brightness > 0.78 || light.clippedHighlights > 0.12) {
    suggestions.push({
      id: "light-blown",
      category: "iluminacion",
      severity: "warn",
      message: "Hay zonas quemadas: baja la exposición o aléjate de la luz directa",
      hint: "Si grabas cerca de una ventana con sol directo, gírate 90° o corre una cortina fina: la luz sigue entrando pero sin quemar.",
    });
  }

  // Contraluz: el fondo brilla bastante más que el sujeto.
  if (
    light.subjectBrightness !== null &&
    light.backgroundBrightness - light.subjectBrightness > 0.18
  ) {
    suggestions.push({
      id: "light-backlit",
      category: "iluminacion",
      severity: "warn",
      message: "Estás a contraluz: gírate para tener la ventana delante",
      hint: "La luz principal debe venir de donde está la cámara, no de detrás de ti.",
    });
  }

  if (Math.abs(light.sideBalance) > 0.16) {
    suggestions.push({
      id: "light-side",
      category: "iluminacion",
      severity: "info",
      message:
        light.sideBalance > 0
          ? "La luz entra solo por la izquierda: rellena el lado derecho"
          : "La luz entra solo por la derecha: rellena el lado izquierdo",
      hint: "Una superficie clara (pared, cartulina) al lado oscuro suaviza la sombra.",
    });
  }

  if (light.crushedShadows > 0.3) {
    suggestions.push({
      id: "light-crushed",
      category: "iluminacion",
      severity: "info",
      message: "Las sombras están muy cerradas: sube la luz de relleno",
      hint: "Añade una segunda fuente de luz más tenue en el lado con sombra, o refleja la luz principal con una superficie clara.",
    });
  }

  if (light.contrast < 0.12 && light.brightness > 0.3) {
    suggestions.push({
      id: "light-flat",
      category: "iluminacion",
      severity: "info",
      message: "Imagen plana: separa el fondo o añade una luz lateral",
      hint: "Aleja al sujeto al menos un metro de la pared del fondo, o añade una luz de contorno detrás para separarlo visualmente.",
    });
  }

  return suggestions;
}

/**
 * Puntuación 0..100 de la toma. Sirve para dar feedback continuo aunque no haya
 * ninguna sugerencia activa. Sin sujeto en cuadro no hay toma que puntuar.
 */
export function scoreShot(
  suggestions: Suggestion[],
  light: LightingMetrics,
  subjectPresent: boolean,
): number {
  if (!subjectPresent) return 0;

  let penalty = 0;
  for (const suggestion of suggestions) {
    if (suggestion.severity === "error") penalty += 30;
    else if (suggestion.severity === "warn") penalty += 18;
    else if (suggestion.severity === "info") penalty += 8;
  }

  // Un frame razonablemente expuesto arranca con bonus; uno oscuro, no.
  const exposureBonus = clamp01(1 - Math.abs(light.brightness - 0.5) * 2) * 6;

  return Math.round(Math.max(0, Math.min(100, 100 - penalty + exposureBonus)));
}
