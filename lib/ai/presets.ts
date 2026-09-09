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
  /**
   * Duración máxima recomendada al grabar desde la propia app, en segundos.
   * `null` cuando la plataforma no impone un tope práctico (YouTube normal).
   * Cifras de 2026: Shorts limita a 3 min; Reels grabado en la app deja de
   * comportarse como Reel pasados los 3 min aunque admita subir hasta 20;
   * TikTok permite grabar hasta 10 min desde la cámara de la app.
   */
  maxDurationSec: number | null;
}

export const PLATFORMS: Record<PlatformId, Platform> = {
  tiktok: {
    id: "tiktok",
    label: "TikTok",
    aspect: 9 / 16,
    aspectLabel: "9:16",
    // La UI de TikTok tapa la franja inferior (descripción) y la derecha (botones).
    safeArea: { top: 0.08, bottom: 0.22, left: 0.04, right: 0.2 },
    maxDurationSec: 600,
  },
  reels: {
    id: "reels",
    label: "Instagram Reels",
    aspect: 9 / 16,
    aspectLabel: "9:16",
    safeArea: { top: 0.09, bottom: 0.2, left: 0.04, right: 0.16 },
    maxDurationSec: 180,
  },
  shorts: {
    id: "shorts",
    label: "YouTube Shorts",
    aspect: 9 / 16,
    aspectLabel: "9:16",
    safeArea: { top: 0.07, bottom: 0.18, left: 0.04, right: 0.14 },
    maxDurationSec: 180,
  },
  youtube: {
    id: "youtube",
    label: "YouTube",
    aspect: 16 / 9,
    aspectLabel: "16:9",
    safeArea: { top: 0.05, bottom: 0.12, left: 0.05, right: 0.05 },
    maxDurationSec: null,
  },
};

export const PLATFORM_LIST = Object.values(PLATFORMS);

/**
 * Estilo de plano: qué tan cerca de cámara y con cuánto aire debe quedar el
 * sujeto. Es independiente de la plataforma (aspecto/duración) — un mismo
 * TikTok puede ser un storytime a cámara cerca, o un unboxing con las manos
 * y el producto ocupando buena parte del cuadro. Antes estos números vivían
 * en `Platform` y eran uno solo para las tres verticales: un plano de
 * producto que necesita más aire se marcaba como "demasiado lejos" con las
 * mismas cifras pensadas para hablar a cámara, así que las indicaciones no
 * afinaban bien salvo en el caso genérico.
 */
export type ShotStyleId = "talking-head" | "product-demo";

export interface ShotStyle {
  id: ShotStyleId;
  label: string;
  description: string;
  /** Altura objetivo del sujeto respecto al frame (fracción). */
  targetFill: [number, number];
  /** Aire sobre la cabeza recomendado (fracción del alto). */
  targetHeadroom: [number, number];
  /**
   * Guía técnica fija: posición de cámara y de luz recomendadas para este
   * estilo. A diferencia de las sugerencias en vivo (`framing.ts`,
   * `lighting.ts`), esto no aparece y desaparece según lo que detecte el
   * motor frame a frame — es referencia estable que se puede consultar
   * antes o durante la grabación, no solo un aviso cuando algo falla.
   */
  guide: {
    position: string[];
    lighting: string[];
  };
}

export const SHOT_STYLES: Record<ShotStyleId, ShotStyle> = {
  "talking-head": {
    id: "talking-head",
    label: "Hablas a cámara",
    description: "Storytime, opinión o reseña — plano medio corto, cerca de cámara.",
    // Mismas cifras que antes tenían tiktok/reels/shorts: el comportamiento
    // por defecto no cambia para quien no toca este ajuste.
    targetFill: [0.55, 0.85],
    targetHeadroom: [0.04, 0.14],
    guide: {
      position: [
        "Cámara a la altura de los ojos: ni por encima (te ves desde arriba) ni por debajo (contrapicado).",
        "Distancia: 40–60 cm de la cámara — plano medio corto, pecho y cabeza dentro del cuadro, con un poco de aire arriba.",
        "Mira al objetivo de la cámara, no a tu propia imagen en pantalla, para simular contacto visual con quien ve el vídeo.",
      ],
      lighting: [
        "La luz principal debe venir de donde está la cámara (de frente), nunca de detrás de ti.",
        "Una fuente suave a unos 45° de tu cara (ventana con luz indirecta o un aro de luz) reduce sombras duras sin aplanar el rostro.",
        "Evita luz cenital directa (un foco justo encima): marca sombras bajo los ojos y la nariz.",
      ],
    },
  },
  "product-demo": {
    id: "product-demo",
    label: "Producto en mano",
    description:
      "Unboxing o demo de producto (TikTok Shop) — plano más abierto para que quepan tus manos y lo que enseñas.",
    targetFill: [0.35, 0.65],
    targetHeadroom: [0.06, 0.2],
    guide: {
      position: [
        "Cámara a la altura del pecho, apuntando ligeramente hacia abajo — que se vea bien el producto en tus manos, no solo tu cara.",
        "Distancia: 40–70 cm — deja espacio para que quepan tu torso, tus manos y el producto sin cortarlo al moverlo.",
        "Usa un trípode o apoya el móvil: sostenerlo con una mano mientras manipulas el producto con la otra genera temblor.",
      ],
      lighting: [
        "Luz principal de frente y difusa (un aro de luz o una ventana grande) — evita sombras duras sobre el producto.",
        "Si el producto es reflectante (vidrio, metal, pantalla), evita luz directa muy intensa: se refleja y quema los detalles.",
        "Si el producto proyecta sombra sobre sí mismo al girarlo, acerca una segunda fuente de luz suave del lado contrario.",
      ],
    },
  },
};

export const SHOT_STYLE_LIST = Object.values(SHOT_STYLES);

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
  shotStyle: ShotStyleId;
  showGrid: boolean;
  showSafeArea: boolean;
  showSkeleton: boolean;
  /** Silenciar sugerencias por debajo de esta severidad. */
  minSeverity: Severity;
  /** Dictar en voz alta la instrucción principal. */
  voice: boolean;
}

export const DEFAULT_SETTINGS: DirectorSettings = {
  platform: "tiktok",
  composition: "center",
  shotStyle: "talking-head",
  showGrid: true,
  showSafeArea: true,
  showSkeleton: false,
  minSeverity: "info",
  voice: false,
};

/**
 * Plantillas rápidas: combinan varios ajustes a la vez para un tipo de
 * contenido concreto, en vez de tocar cada control uno por uno. Son fijas
 * (no editables ni borrables) — para guardar una variación propia está el
 * guardado manual de presets en `lib/supabase/presets.ts`.
 */
export interface QuickPreset {
  id: string;
  label: string;
  description: string;
  settings: DirectorSettings;
}

export const QUICK_PRESETS: QuickPreset[] = [
  {
    id: "tiktok-ugc",
    label: "TikTok · Hablas a cámara",
    description: "Storytime, opinión o reseña — cerca de cámara, con voz activada.",
    settings: {
      platform: "tiktok",
      composition: "center",
      shotStyle: "talking-head",
      showGrid: true,
      showSafeArea: true,
      showSkeleton: false,
      minSeverity: "info",
      voice: true,
    },
  },
  {
    id: "tiktok-shop",
    label: "TikTok Shop · Producto en mano",
    description:
      "Unboxing o demo de producto — plano abierto para que quepan tus manos y lo que enseñas; solo avisos importantes para no interrumpir la demo.",
    settings: {
      platform: "tiktok",
      composition: "center",
      shotStyle: "product-demo",
      showGrid: true,
      showSafeArea: true,
      showSkeleton: false,
      minSeverity: "warn",
      voice: false,
    },
  },
  {
    id: "reels-ugc",
    label: "Instagram Reels · Hablas a cámara",
    description: "Igual que el de TikTok, pero con la zona segura y duración de Reels.",
    settings: {
      platform: "reels",
      composition: "center",
      shotStyle: "talking-head",
      showGrid: true,
      showSafeArea: true,
      showSkeleton: false,
      minSeverity: "info",
      voice: true,
    },
  },
];

export const SEVERITY_ORDER: Record<Severity, number> = {
  ok: 0,
  info: 1,
  warn: 2,
  error: 3,
};
