import { SEVERITY_ORDER } from "./presets";
import type { Suggestion } from "./types";

/**
 * Lógica del director por voz.
 *
 * Grabando no se puede leer la pantalla, así que la app dicta la instrucción
 * más importante. La dificultad no es hablar: es callarse. Estas reglas evitan
 * que el aviso se repita en bucle o se pise a sí mismo.
 */
export interface SpeechState {
  /** Id de la última sugerencia dictada. */
  lastId: string | null;
  /** Marca de tiempo (ms) del último dictado. */
  lastAt: number;
}

export interface SpeechDecision {
  /** Texto a dictar, o null si toca callar. */
  say: string | null;
  state: SpeechState;
}

export const EMPTY_SPEECH_STATE: SpeechState = { lastId: null, lastAt: 0 };

/** Silencio mínimo entre dos instrucciones distintas. */
export const MIN_GAP_MS = 3500;

/** Cada cuánto se repite una instrucción que el usuario no ha corregido. */
export const REPEAT_MS = 9000;

export interface SpeechInput {
  suggestions: Suggestion[];
  state: SpeechState;
  now: number;
  /** true mientras el sintetizador sigue hablando. */
  speaking: boolean;
}

/**
 * Decide qué dictar en este frame. Función pura: el hook solo ejecuta lo que
 * esta función decide.
 */
export function selectSpeech({
  suggestions,
  state,
  now,
  speaking,
}: SpeechInput): SpeechDecision {
  if (speaking) return { say: null, state };

  if (suggestions.length === 0) {
    // Encuadre correcto: se anuncia una vez, no en cada frame.
    if (state.lastId === "ok") return { say: null, state };
    if (now - state.lastAt < MIN_GAP_MS) return { say: null, state };
    return { say: "Así está bien", state: { lastId: "ok", lastAt: now } };
  }

  // La más grave manda; a igualdad, la primera de la lista.
  const top = [...suggestions].sort(
    (a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity],
  )[0];

  const isRepeat = top.id === state.lastId;
  const elapsed = now - state.lastAt;

  if (isRepeat && elapsed < REPEAT_MS) return { say: null, state };
  if (!isRepeat && elapsed < MIN_GAP_MS) return { say: null, state };

  return { say: top.message, state: { lastId: top.id, lastAt: now } };
}
