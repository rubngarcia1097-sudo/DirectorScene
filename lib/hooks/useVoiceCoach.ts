"use client";

import { useEffect, useRef } from "react";

import { EMPTY_SPEECH_STATE, selectSpeech } from "@/lib/ai/voice";
import type { FrameAnalysis } from "@/lib/ai/types";

export interface UseVoiceCoachOptions {
  analysis: FrameAnalysis | null;
  enabled: boolean;
}

/** true si el navegador puede sintetizar voz. */
export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Dicta la instrucción más importante mientras se graba. La decisión de qué
 * decir (y cuándo callar) vive en `lib/ai/voice.ts`; aquí solo se habla.
 */
export function useVoiceCoach({ analysis, enabled }: UseVoiceCoachOptions): void {
  const stateRef = useRef(EMPTY_SPEECH_STATE);

  useEffect(() => {
    if (!enabled || !analysis || !isSpeechSupported()) return;

    const synth = window.speechSynthesis;
    const { say, state } = selectSpeech({
      suggestions: analysis.suggestions,
      state: stateRef.current,
      now: analysis.timestamp,
      speaking: synth.speaking || synth.pending,
    });

    stateRef.current = state;
    if (!say) return;

    const utterance = new SpeechSynthesisUtterance(say);
    utterance.lang = "es-ES";
    utterance.rate = 1.05;
    synth.speak(utterance);
  }, [analysis, enabled]);

  // Al apagar la voz o salir de la pantalla se corta lo que quede en cola.
  useEffect(() => {
    if (!isSpeechSupported()) return;
    if (!enabled) window.speechSynthesis.cancel();

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [enabled]);
}
