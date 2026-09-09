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

/** Umbral de contraluz de partida: por debajo de esto, no hace falta adaptar nada. */
const BACKLIT_FIXED_THRESHOLD = 0.18;
/** Margen sobre el mejor contraluz logrado: exige mantenerlo, no solo igualarlo por los pelos. */
const BACKLIT_MARGIN = 0.04;
/** Ventana de memoria: un espacio genuinamente distinto más adelante en la sesión reajusta el listón. */
const BACKLIT_BASELINE_WINDOW_MS = 30_000;

/**
 * No todo el mundo graba con un set de iluminación profesional. Si el hueco
 * entre fondo y sujeto nunca baja de cierto punto durante toda la sesión —
 * una ventana detrás que no se puede mover, por ejemplo—, exigir el umbral
 * fijo de estudio convierte "estás a contraluz" en un aviso permanente e
 * irresoluble en vez de una instrucción útil.
 *
 * Esta clase recuerda el mejor contraluz logrado recientemente (ventana
 * móvil de 30 s, no toda la sesión: así un espacio distinto más adelante
 * puede volver a exigir el estándar alto) y el umbral efectivo nunca pide
 * menos que eso — solo mantenerlo, nunca alcanzar un ideal que el espacio
 * del usuario no puede dar. Nunca es más laxo que el umbral fijo cuando la
 * mejor luz posible ya lo cumple de sobra.
 */
export class LightingBaseline {
  private samples: { at: number; gap: number }[] = [];

  constructor(private readonly windowMs: number = BACKLIT_BASELINE_WINDOW_MS) {}

  /** Registra el contraluz de un frame con exposición razonable. */
  observe(light: LightingMetrics, now: number = Date.now()): void {
    if (light.subjectBrightness === null) return;
    // Un frame casi negro o quemado no dice nada fiable del contraluz real:
    // contaminaría el "mejor logrado" con un dato degenerado.
    if (light.brightness < 0.1 || light.brightness > 0.9) return;

    this.samples.push({ at: now, gap: light.backgroundBrightness - light.subjectBrightness });
    const cutoff = now - this.windowMs;
    while (this.samples.length > 0 && this.samples[0].at < cutoff) {
      this.samples.shift();
    }
  }

  /** Umbral efectivo de contraluz: se adapta hacia arriba, nunca hacia abajo del fijo. */
  backlitThreshold(): number {
    if (this.samples.length === 0) return BACKLIT_FIXED_THRESHOLD;
    const best = Math.min(...this.samples.map((sample) => sample.gap));
    return Math.max(BACKLIT_FIXED_THRESHOLD, best + BACKLIT_MARGIN);
  }

  reset(): void {
    this.samples = [];
  }
}

/**
 * Traduce las métricas de luz en instrucciones de dirección.
 *
 * `baseline`, si se pasa, adapta el umbral de contraluz a lo mejor que el
 * espacio del usuario haya dado de sí recientemente (ver `LightingBaseline`)
 * en vez de exigir siempre el estándar fijo de estudio.
 */
export function evaluateLighting(light: LightingMetrics, baseline?: LightingBaseline): Suggestion[] {
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

  // Contraluz: el fondo brilla bastante más que el sujeto. El umbral se
  // calcula ANTES de registrar este frame en el baseline — si no, un frame
  // siempre "aprueba" su propia comparación (a sí mismo + margen), y ni el
  // peor contraluz llegaría a avisar ni una sola vez.
  if (light.subjectBrightness !== null) {
    const gap = light.backgroundBrightness - light.subjectBrightness;
    const threshold = baseline?.backlitThreshold() ?? BACKLIT_FIXED_THRESHOLD;
    baseline?.observe(light);

    if (gap > threshold) {
      suggestions.push({
        id: "light-backlit",
        category: "iluminacion",
        severity: "warn",
        message: "Estás a contraluz: gírate para tener la ventana delante",
        hint: "La luz principal debe venir de donde está la cámara, no de detrás de ti.",
      });
    }
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
