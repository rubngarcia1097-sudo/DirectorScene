"use client";

import { SEVERITY_ORDER } from "@/lib/ai/presets";
import type { FrameAnalysis, Severity } from "@/lib/ai/types";

const TONE: Record<Severity, string> = {
  ok: "bg-emerald-500/85 text-emerald-950",
  info: "bg-sky-400/85 text-sky-950",
  warn: "bg-amber-400/90 text-amber-950",
  error: "bg-rose-500/90 text-white",
};

/**
 * Instrucción principal sobre el vídeo.
 *
 * Grabando se mira el encuadre, no un panel lateral: por eso la indicación más
 * grave se muestra grande y encima de la imagen, y solo una a la vez.
 */
export function LiveHud({ analysis }: { analysis: FrameAnalysis | null }) {
  if (!analysis) return null;

  const top = [...analysis.suggestions].sort(
    (a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity],
  )[0];

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-3">
      {top ? (
        <p
          className={`max-w-[92%] rounded-full px-4 py-2 text-center text-sm font-semibold shadow-lg sm:text-base ${TONE[top.severity]}`}
        >
          {top.message}
        </p>
      ) : (
        <p className="rounded-full bg-emerald-500/85 px-4 py-2 text-center text-sm font-semibold text-emerald-950 shadow-lg">
          Encuadre y luz correctos
        </p>
      )}
    </div>
  );
}
