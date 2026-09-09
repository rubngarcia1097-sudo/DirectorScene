/**
 * Tipos compartidos por el motor de dirección.
 *
 * Todo lo que vive aquí describe el resultado del análisis on-device:
 * nunca contiene píxeles ni frames, solo métricas derivadas.
 */

export type Severity = "ok" | "info" | "warn" | "error";

export type SuggestionCategory = "encuadre" | "iluminacion" | "sujeto";

export interface Suggestion {
  /** Identificador estable: permite deduplicar y animar la lista sin parpadeos. */
  id: string;
  category: SuggestionCategory;
  severity: Severity;
  /** Instrucción corta y accionable, en imperativo ("Acércate un poco"). */
  message: string;
  /** Detalle opcional que se muestra al expandir la sugerencia. */
  hint?: string;
}

/** Punto normalizado (0..1) respecto al ancho/alto del frame. */
export interface Point2 {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Métricas del sujeto extraídas de los landmarks de pose/rostro. */
export interface SubjectMetrics {
  present: boolean;
  /** Caja del sujeto en coordenadas normalizadas. */
  box: BoundingBox | null;
  /** Centro horizontal/vertical de la caja. */
  center: Point2 | null;
  /** Punto medio entre los ojos, si hay rostro o pose fiable. */
  eyeLine: Point2 | null;
  /** Coronilla estimada (por encima de los ojos). */
  headTop: number | null;
  /** Fracción de altura del frame ocupada por el sujeto (0..1). */
  fill: number;
  /** Inclinación de la línea de hombros en grados (+ = hombro derecho abajo). */
  shoulderTiltDeg: number | null;
  /** Giro del cuerpo: 0 = frontal, 1 = perfil. */
  turn: number | null;
  /** Confianza media de los landmarks usados (0..1). */
  confidence: number;
}

export interface LightingMetrics {
  /** Brillo medio del frame (0..1). */
  brightness: number;
  /** Contraste (desviación estándar del brillo, 0..1). */
  contrast: number;
  /** Fracción de píxeles quemados (>= 250). */
  clippedHighlights: number;
  /** Fracción de píxeles empastados (<= 8). */
  crushedShadows: number;
  /** Diferencia de brillo izquierda-derecha (-1..1, + = más luz a la izquierda). */
  sideBalance: number;
  /** Brillo medio del área del sujeto (0..1), null si no hay sujeto. */
  subjectBrightness: number | null;
  /** Brillo medio del fondo (0..1). */
  backgroundBrightness: number;
  /** Temperatura relativa: + = cálido (rojo), - = frío (azul). */
  warmth: number;
}

export interface FrameAnalysis {
  subject: SubjectMetrics;
  lighting: LightingMetrics;
  suggestions: Suggestion[];
  /** Puntuación global 0..100 de la toma actual. */
  score: number;
  /** Milisegundos que tardó el último análisis. */
  latencyMs: number;
  timestamp: number;
}
