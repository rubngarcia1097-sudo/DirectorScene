"use client";

import type { FrameAnalysis, Severity, Suggestion } from "@/lib/ai/types";

const SEVERITY_STYLES: Record<Severity, string> = {
  ok: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  info: "border-sky-400/40 bg-sky-400/10 text-sky-100",
  warn: "border-amber-400/50 bg-amber-400/10 text-amber-100",
  error: "border-rose-500/50 bg-rose-500/10 text-rose-100",
};

const CATEGORY_ICON: Record<Suggestion["category"], string> = {
  encuadre: "◱",
  iluminacion: "☀",
  sujeto: "☺",
};

interface SuggestionPanelProps {
  analysis: FrameAnalysis | null;
  /** Mensaje de estado cuando todavía no hay análisis. */
  placeholder?: string;
}

/** Lista de instrucciones del director, ordenadas por severidad. */
export function SuggestionPanel({ analysis, placeholder }: SuggestionPanelProps) {
  if (!analysis) {
    return (
      <p className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/60">
        {placeholder ?? "Esperando señal de cámara…"}
      </p>
    );
  }

  if (analysis.suggestions.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-400/40 bg-emerald-400/10 p-4">
        <p className="text-sm font-medium text-emerald-200">
          Encuadre y luz correctos. Graba así.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {analysis.suggestions.map((suggestion) => (
        <li
          key={suggestion.id}
          className={`rounded-lg border p-3 ${SEVERITY_STYLES[suggestion.severity]}`}
        >
          <p className="flex items-start gap-2 text-sm font-medium">
            <span aria-hidden className="mt-px">
              {CATEGORY_ICON[suggestion.category]}
            </span>
            <span>{suggestion.message}</span>
          </p>
          {suggestion.hint ? (
            <p className="mt-1 pl-6 text-xs opacity-75">{suggestion.hint}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Barra compacta con la puntuación de la toma. */
export function ShotScore({ analysis }: { analysis: FrameAnalysis | null }) {
  const score = analysis?.score ?? 0;
  const tone =
    score >= 80 ? "bg-emerald-400" : score >= 55 ? "bg-amber-400" : "bg-rose-500";

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs uppercase tracking-wide text-white/50">Toma</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-300 ${tone}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="w-9 text-right text-sm font-semibold tabular-nums">
        {score}
      </span>
    </div>
  );
}
