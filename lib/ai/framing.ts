import { COMPOSITIONS, PLATFORMS, SHOT_STYLES } from "./presets";
import type { CompositionId, PlatformId, ShotStyleId } from "./presets";
import type { SubjectMetrics, Suggestion } from "./types";

export interface FramingContext {
  platform: PlatformId;
  composition: CompositionId;
  shotStyle: ShotStyleId;
  /**
   * true cuando la vista está espejada (cámara frontal). En ese caso las
   * instrucciones se dirigen a quien está delante de la cámara; si no, se
   * dirigen a quien la sostiene.
   */
  mirrored: boolean;
}

/**
 * Motor de reglas de encuadre: convierte métricas del sujeto en instrucciones
 * de dirección. Es una función pura, así que se puede reutilizar tal cual en
 * React Native sin tocar nada.
 */
export function evaluateFraming(
  subject: SubjectMetrics,
  { platform, composition, shotStyle, mirrored }: FramingContext,
): Suggestion[] {
  if (!subject.present || !subject.box || !subject.center) {
    return [
      {
        id: "subject-missing",
        category: "sujeto",
        severity: "warn",
        message: "No te veo en cuadro",
        hint: "Colócate frente a la cámara para que empiece el análisis.",
      },
    ];
  }

  const preset = PLATFORMS[platform];
  const target = COMPOSITIONS[composition];
  const style = SHOT_STYLES[shotStyle];
  const suggestions: Suggestion[] = [];

  // --- Posición horizontal (centrado o regla de tercios) ---
  const offsetX = subject.center.x - target.targetX;
  if (Math.abs(offsetX) > target.tolerance) {
    const strong = Math.abs(offsetX) > target.tolerance * 2.5;
    suggestions.push({
      id: "framing-horizontal",
      category: "encuadre",
      severity: strong ? "warn" : "info",
      message: horizontalMessage(offsetX, mirrored),
      hint: `Objetivo: ${target.label.toLowerCase()} (${Math.round(
        target.targetX * 100,
      )}% del ancho).`,
    });
  }

  // --- Distancia a cámara ---
  const [minFill, maxFill] = style.targetFill;
  if (subject.fill < minFill) {
    suggestions.push({
      id: "framing-too-far",
      category: "encuadre",
      severity: subject.fill < minFill * 0.7 ? "warn" : "info",
      message: "Acércate a la cámara",
      hint: "En vertical el plano medio corto funciona mejor: pecho y cabeza llenando el cuadro.",
    });
  } else if (subject.fill > maxFill) {
    suggestions.push({
      id: "framing-too-close",
      category: "encuadre",
      severity: "info",
      message: "Sepárate un poco",
      hint: "Estás cortando el plano; deja aire alrededor del rostro.",
    });
  }

  // --- Aire sobre la cabeza ---
  if (subject.headTop !== null) {
    const [minHead, maxHead] = style.targetHeadroom;
    if (subject.headTop < minHead * 0.5) {
      suggestions.push({
        id: "framing-headroom-low",
        category: "encuadre",
        severity: "warn",
        message: "Baja la cámara o agáchate: estás cortando la cabeza",
      });
    } else if (subject.headTop > maxHead) {
      suggestions.push({
        id: "framing-headroom-high",
        category: "encuadre",
        severity: "info",
        message: "Demasiado aire sobre la cabeza",
        hint: "Sube el encuadre o inclina la cámara hacia abajo.",
      });
    }
  }

  // --- Altura de cámara (línea de ojos) ---
  if (subject.eyeLine) {
    if (subject.eyeLine.y > 0.55) {
      suggestions.push({
        id: "framing-camera-high",
        category: "encuadre",
        severity: "info",
        message: "La cámara está muy alta: bájala a la altura de tus ojos",
      });
    } else if (subject.eyeLine.y < 0.18) {
      suggestions.push({
        id: "framing-camera-low",
        category: "encuadre",
        severity: "info",
        message: "La cámara está muy baja: súbela a la altura de tus ojos",
      });
    }
  }

  // --- Horizonte / inclinación ---
  if (subject.shoulderTiltDeg !== null && Math.abs(subject.shoulderTiltDeg) > 7) {
    suggestions.push({
      id: "framing-tilt",
      category: "encuadre",
      severity: "info",
      message: "Nivela la cámara: la línea de hombros está torcida",
      hint: `Inclinación detectada: ${Math.abs(
        Math.round(subject.shoulderTiltDeg),
      )}°.`,
    });
  }

  // --- Ángulo del cuerpo ---
  if (subject.turn !== null && subject.turn > 0.55) {
    suggestions.push({
      id: "subject-turn",
      category: "sujeto",
      severity: "info",
      message: "Gira el cuerpo hacia la cámara",
      hint: "Estás demasiado de perfil; los hombros abiertos leen mejor en vertical.",
    });
  }

  // --- Zona segura de la plataforma ---
  const safe = preset.safeArea;
  const box = subject.box;
  if (box.y + box.height > 1 - safe.bottom + 0.05) {
    suggestions.push({
      id: "framing-safe-bottom",
      category: "encuadre",
      severity: "info",
      message: `Sube el encuadre: la UI de ${preset.label} tapa la parte baja`,
    });
  }
  if (subject.center.x > 1 - safe.right) {
    suggestions.push({
      id: "framing-safe-right",
      category: "encuadre",
      severity: "warn",
      message: `Los botones de ${preset.label} te tapan por la derecha`,
    });
  }

  return suggestions;
}

/**
 * Con la vista espejada, moverse a la izquierda desplaza la imagen hacia la
 * izquierda de la pantalla; sin espejar hablamos con quien mueve la cámara.
 */
function horizontalMessage(offsetX: number, mirrored: boolean): string {
  if (mirrored) {
    return offsetX > 0
      ? "Muévete un poco a tu izquierda"
      : "Muévete un poco a tu derecha";
  }

  return offsetX > 0
    ? "Desplaza la cámara a la derecha"
    : "Desplaza la cámara a la izquierda";
}
