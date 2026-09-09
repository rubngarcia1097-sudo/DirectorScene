import type { Severity } from "./types";

/** Plataformas soportadas. Cada una tiene relación de aspecto y zonas seguras propias. */
export type PlatformId = "tiktok" | "reels" | "shorts" | "youtube";

export interface SafeArea {
  /** Márgenes en fracción del alto/ancho ocupados por la UI de la app. */
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface Platform {
  id: PlatformId;
  label: string;
  aspect: number; // ancho / alto
  aspectLabel: string;
  safeArea: SafeArea;
  /** Altura objetivo del sujeto respecto al frame (fracción). */
  targetFill: [number, number];
  /** Aire sobre la cabeza recomendado (fracción del alto). */
  targetHeadroom: [number, number];
}

export const PLATFORMS: Record<PlatformId, Platform> = {
  tiktok: {
    id: "tiktok",
    label: "TikTok",
    aspect: 9 / 16,
    aspectLabel: "9:16",
    // La UI de TikTok tapa la franja inferior (descripción) y la derecha (botones).
    safeArea: { top: 0.08, bottom: 0.22, left: 0.04, right: 0.2 },
    targetFill: [0.55, 0.85],
    targetHeadroom: [0.04, 0.14],
  },
  reels: {
    id: "reels",
    label: "Instagram Reels",
    aspect: 9 / 16,
    aspectLabel: "9:16",
    safeArea: { top: 0.09, bottom: 0.2, left: 0.04, right: 0.16 },
    targetFill: [0.55, 0.85],
    targetHeadroom: [0.04, 0.14],
  },
  shorts: {
    id: "shorts",
    label: "YouTube Shorts",
    aspect: 9 / 16,
    aspectLabel: "9:16",
    safeArea: { top: 0.07, bottom: 0.18, left: 0.04, right: 0.14 },
    targetFill: [0.5, 0.82],
    targetHeadroom: [0.04, 0.14],
  },
  youtube: {
    id: "youtube",
    label: "YouTube",
    aspect: 16 / 9,
    aspectLabel: "16:9",
    safeArea: { top: 0.05, bottom: 0.12, left: 0.05, right: 0.05 },
    targetFill: [0.5, 0.9],
    targetHeadroom: [0.05, 0.18],
  },
};

export const PLATFORM_LIST = Object.values(PLATFORMS);

/** Estilo de composición: dónde debe caer el sujeto horizontalmente. */
export type CompositionId = "center" | "thirds-left" | "thirds-right";

export interface Composition {
  id: CompositionId;
  label: string;
  /** Posición horizontal objetivo (0..1). */
  targetX: number;
  /** Tolerancia antes de sugerir corrección. */
  tolerance: number;
}

export const COMPOSITIONS: Record<CompositionId, Composition> = {
  center: { id: "center", label: "Centrado", targetX: 0.5, tolerance: 0.07 },
  "thirds-left": {
    id: "thirds-left",
    label: "Tercio izquierdo",
    targetX: 1 / 3,
    tolerance: 0.07,
  },
  "thirds-right": {
    id: "thirds-right",
    label: "Tercio derecho",
    targetX: 2 / 3,
    tolerance: 0.07,
  },
};

export const COMPOSITION_LIST = Object.values(COMPOSITIONS);

/** Ajustes que el usuario puede guardar como preset. */
export interface DirectorSettings {
  platform: PlatformId;
  composition: CompositionId;
  showGrid: boolean;
  showSafeArea: boolean;
  showSkeleton: boolean;
  /** Silenciar sugerencias por debajo de esta severidad. */
  minSeverity: Severity;
}

export const DEFAULT_SETTINGS: DirectorSettings = {
  platform: "tiktok",
  composition: "center",
  showGrid: true,
  showSafeArea: true,
  showSkeleton: false,
  minSeverity: "info",
};

export const SEVERITY_ORDER: Record<Severity, number> = {
  ok: 0,
  info: 1,
  warn: 2,
  error: 3,
};
