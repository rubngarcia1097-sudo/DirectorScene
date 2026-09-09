/**
 * Clasificación de dispositivo y cámara para dar recomendaciones de calidad
 * de grabación.
 *
 * No hay forma fiable de leer el "modelo" de un móvil desde el navegador
 * (y cada vez menos: los user agents se están congelando por privacidad), así
 * que en vez de adivinar "gama alta" o "gama media" por marketing, la
 * clasificación se basa en lo que la cámara realmente negoció (resolución y
 * fps) — que es, al final, lo único que importa para la calidad del clip.
 *
 * Todo aquí son funciones puras sobre datos ya leídos del navegador (user
 * agent, capabilities/settings de la pista de vídeo): nada llama a
 * `navigator` ni al DOM directamente, así se puede testear sin jsdom y
 * reutilizar en React Native con sus propios datos de cámara.
 */

export type DeviceKind = "mobile" | "tablet" | "desktop";

export type CameraTier = "basica" | "media" | "alta" | "premium";

export type CameraSourceKind =
  | "movil-trasera"
  | "movil-frontal"
  | "webcam-integrada"
  | "webcam-externa"
  | "desconocida";

export interface DeviceTip {
  id: string;
  title: string;
  detail: string;
}

/** Resumen de lo que la pista de vídeo negoció realmente con la cámara. */
export interface CameraCapabilitySummary {
  maxWidth: number | null;
  maxHeight: number | null;
  maxFrameRate: number | null;
  currentWidth: number | null;
  currentHeight: number | null;
  currentFrameRate: number | null;
}

export interface DeviceProfile {
  deviceKind: DeviceKind;
  sourceKind: CameraSourceKind;
  tier: CameraTier;
  label: string;
  /** Resolución máxima detectada, en un nombre reconocible. */
  resolutionLabel: string;
  /** fps de grabación recomendados: nunca más de lo que la cámara entrega. */
  recommendedFrameRate: number;
  tips: DeviceTip[];
}

/**
 * iPadOS 13+ anuncia Safari de escritorio ("Macintosh") a propósito; la forma
 * recomendada por Apple de distinguirlo de un Mac real es comprobar el
 * soporte táctil. Los tablets Android, a diferencia de los móviles, casi
 * siempre omiten el token "Mobile" en su user agent.
 */
export function classifyDeviceKind(userAgent: string, hasTouch: boolean): DeviceKind {
  const ua = userAgent || "";
  if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && hasTouch)) return "tablet";
  if (/iPhone|iPod/i.test(ua)) return "mobile";
  if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? "mobile" : "tablet";
  if (/Mobile/i.test(ua)) return "mobile";
  return "desktop";
}

const EXTERNAL_WEBCAM_HINTS = [
  "logitech",
  "brio",
  "c920",
  "c922",
  "c930",
  "streamcam",
  "kiyo",
  "razer",
  "obsbot",
  "elgato",
  "cam link",
  "lifecam",
  "nexigo",
  "anker powerconf",
  "insta360 link",
  "opal tadpole",
  "dell webcam",
  "aver",
];

const INTEGRATED_WEBCAM_HINTS = [
  "facetime",
  "integrated",
  "built-in",
  "internal camera",
  "truevision",
  "hp hd camera",
  "hp wide vision",
  "lenovo integrated",
  "asus webcam",
];

/**
 * En móvil, la "fuente" es simplemente qué lente se está usando: nunca hace
 * falta adivinar por etiqueta. En escritorio el label del dispositivo (solo
 * disponible tras conceder permiso) suele delatar marca — pero muchos
 * portátiles reportan algo tan genérico como "Camera" o "USB2.0 Camera", así
 * que "desconocida" es un resultado legítimo, no un fallo.
 */
export function classifyCameraSource(
  deviceKind: DeviceKind,
  label: string,
  facingMode: "user" | "environment" | null,
): CameraSourceKind {
  if (deviceKind !== "desktop") {
    return facingMode === "environment" ? "movil-trasera" : "movil-frontal";
  }

  const normalized = label.toLowerCase();
  if (EXTERNAL_WEBCAM_HINTS.some((hint) => normalized.includes(hint))) {
    return "webcam-externa";
  }
  if (INTEGRATED_WEBCAM_HINTS.some((hint) => normalized.includes(hint))) {
    return "webcam-integrada";
  }
  return "desconocida";
}

const RESOLUTION_LABELS: Record<CameraTier, string> = {
  basica: "SD (menos de 720p)",
  media: "HD (720p)",
  alta: "Full HD (1080p)",
  premium: "4K o superior",
};

/**
 * Umbrales por el lado largo del sensor: 4K, Full HD y HD son anchos de
 * referencia habituales en móviles y webcams, gama alta y media incluidas.
 */
export function classifyCameraTier(capabilities: CameraCapabilitySummary): CameraTier {
  const width = capabilities.maxWidth ?? capabilities.currentWidth ?? 0;
  const height = capabilities.maxHeight ?? capabilities.currentHeight ?? 0;
  const longEdge = Math.max(width, height);

  if (longEdge >= 3840) return "premium";
  if (longEdge >= 1920) return "alta";
  if (longEdge >= 1280) return "media";
  return "basica";
}

/**
 * 60 fps solo si la cámara los entrega de verdad; por debajo de 24 se pisa el
 * suelo en 15 en vez de grabar a una cadencia rara que casi nadie soporta bien.
 */
export function recommendFrameRate(capabilities: CameraCapabilitySummary): number {
  const available = capabilities.currentFrameRate ?? capabilities.maxFrameRate;
  if (!available) return 30;
  if (available >= 55) return 60;
  if (available >= 24) return 30;
  return Math.max(15, Math.round(available));
}

export interface BuildTipsInput {
  deviceKind: DeviceKind;
  sourceKind: CameraSourceKind;
  tier: CameraTier;
}

export function buildDeviceTips({ deviceKind, sourceKind, tier }: BuildTipsInput): DeviceTip[] {
  const tips: DeviceTip[] = [];

  if (tier === "basica") {
    tips.push({
      id: "tier-basica",
      title: "Cámara de baja resolución",
      detail:
        "Acércate más al sujeto: con menos píxeles disponibles, cada centímetro de distancia de más cuenta el doble. La luz uniforme importa más que en cámaras de más resolución.",
    });
  } else if (tier === "premium") {
    tips.push({
      id: "tier-premium",
      title: "Cámara de muy alta resolución",
      detail:
        "El clip se graba en 1080p aunque tu cámara llegue a 4K: sube más rápido y se ve igual de nítido en TikTok, Reels o Shorts.",
    });
  }

  if (deviceKind === "mobile" || deviceKind === "tablet") {
    tips.push({
      id: "mobile-hold",
      title: "Sujeta el móvil con las dos manos o usa un trípode",
      detail:
        "El zoom digital pierde nitidez enseguida; si necesitas acercarte, muévete físicamente en vez de hacer zoom.",
    });
    if (sourceKind === "movil-frontal") {
      tips.push({
        id: "mobile-front",
        title: "La cámara frontal suele grabar en menor resolución",
        detail:
          "Si grabas solo/a y puedes apoyar el móvil, la cámara trasera casi siempre da mejor nitidez y campo de visión.",
      });
    }
  }

  if (deviceKind === "desktop" && sourceKind === "webcam-integrada") {
    tips.push(
      {
        id: "laptop-height",
        title: "Eleva la laptop a la altura de los ojos",
        detail:
          "La cámara integrada suele quedar por debajo de la barbilla: apóyala sobre libros o un soporte hasta que el objetivo mire de frente, no desde abajo.",
      },
      {
        id: "laptop-distance",
        title: "Aléjate un brazo de la pantalla",
        detail:
          "Las webcams integradas usan un gran angular: muy cerca deforma la cara. A un brazo de distancia el encuadre se ve natural.",
      },
      {
        id: "laptop-orientation",
        title: "Piensa en horizontal",
        detail:
          "La laptop no gira: para YouTube o una videollamada grabada, el 16:9 aprovecha mejor el sensor que forzar un recorte vertical.",
      },
      {
        id: "laptop-mic",
        title: "El micrófono integrado capta el teclado y el ventilador",
        detail:
          "Si el clip lleva audio, unos auriculares con micrófono o un micrófono externo se notan mucho más que cualquier ajuste de la cámara.",
      },
      {
        id: "laptop-backlight",
        title: "No te sientes de espaldas a una ventana",
        detail:
          "Es el error más común grabando desde el escritorio: la ventana debe quedar frente a ti, iluminando la cara, no detrás.",
      },
    );
  } else if (deviceKind === "desktop" && sourceKind === "webcam-externa") {
    tips.push({
      id: "external-webcam",
      title: "Webcam externa detectada",
      detail:
        "Colócala a la altura de los ojos y a un brazo de distancia; suele dar mejor nitidez y campo de visión que la cámara integrada.",
    });
  } else if (deviceKind === "desktop" && sourceKind === "desconocida") {
    tips.push({
      id: "desktop-unknown",
      title: "¿Es la cámara integrada de tu laptop?",
      detail:
        "Márcalo abajo para ver consejos de altura, distancia y audio pensados para webcams integradas.",
    });
  }

  return tips;
}

export interface BuildDeviceProfileInput {
  deviceKind: DeviceKind;
  label: string;
  facingMode: "user" | "environment" | null;
  capabilities: CameraCapabilitySummary;
  /** El usuario puede marcar "uso la cámara de mi laptop" si el label no lo delata. */
  forceLaptopCamera?: boolean;
}

export function buildDeviceProfile({
  deviceKind,
  label,
  facingMode,
  capabilities,
  forceLaptopCamera = false,
}: BuildDeviceProfileInput): DeviceProfile {
  const sourceKind: CameraSourceKind =
    forceLaptopCamera && deviceKind === "desktop"
      ? "webcam-integrada"
      : classifyCameraSource(deviceKind, label, facingMode);
  const tier = classifyCameraTier(capabilities);

  return {
    deviceKind,
    sourceKind,
    tier,
    label,
    resolutionLabel: RESOLUTION_LABELS[tier],
    recommendedFrameRate: recommendFrameRate(capabilities),
    tips: buildDeviceTips({ deviceKind, sourceKind, tier }),
  };
}
