import { evaluateFraming } from "./framing";
import type { FramingContext } from "./framing";
import { evaluateLighting, scoreShot } from "./lighting";
import { SEVERITY_ORDER } from "./presets";
import type { DirectorSettings } from "./presets";
import type {
  FrameAnalysis,
  LightingMetrics,
  SubjectMetrics,
  Suggestion,
} from "./types";

/**
 * Estabilizador de sugerencias.
 *
 * Sin él la lista parpadea: los landmarks oscilan frame a frame y una regla
 * puede entrar y salir varias veces por segundo. Una sugerencia aparece tras
 * `enterFrames` frames seguidos y desaparece tras `exitFrames` sin detectarse.
 */
export class SuggestionStabilizer {
  private readonly hits = new Map<string, number>();
  private readonly misses = new Map<string, number>();
  private readonly active = new Map<string, Suggestion>();

  private readonly enterFrames: number;
  private readonly exitFrames: number;

  constructor(enterFrames = 4, exitFrames = 10) {
    this.enterFrames = enterFrames;
    this.exitFrames = exitFrames;
  }

  update(candidates: Suggestion[]): Suggestion[] {
    const seen = new Set(candidates.map((item) => item.id));

    for (const candidate of candidates) {
      this.misses.delete(candidate.id);
      const hits = (this.hits.get(candidate.id) ?? 0) + 1;
      this.hits.set(candidate.id, hits);
      if (hits >= this.enterFrames || this.active.has(candidate.id)) {
        // Refrescamos el contenido: el texto puede cambiar (grados, %).
        this.active.set(candidate.id, candidate);
      }
    }

    // Un id puede estar a la vez en `active` y en `hits`: el Set evita contar
    // el mismo frame perdido dos veces.
    for (const id of new Set([...this.active.keys(), ...this.hits.keys()])) {
      if (seen.has(id)) continue;
      const misses = (this.misses.get(id) ?? 0) + 1;
      this.misses.set(id, misses);
      if (misses >= this.exitFrames) {
        this.active.delete(id);
        this.hits.delete(id);
        this.misses.delete(id);
      }
    }

    return [...this.active.values()].sort(
      (a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity],
    );
  }

  reset(): void {
    this.hits.clear();
    this.misses.clear();
    this.active.clear();
  }
}

export interface AnalysisInput {
  subject: SubjectMetrics;
  lighting: LightingMetrics;
  settings: DirectorSettings;
  mirrored: boolean;
  latencyMs: number;
  stabilizer?: SuggestionStabilizer;
}

/** Une reglas de encuadre y de luz en un único resultado por frame. */
export function analyzeFrame({
  subject,
  lighting,
  settings,
  mirrored,
  latencyMs,
  stabilizer,
}: AnalysisInput): FrameAnalysis {
  const context: FramingContext = {
    platform: settings.platform,
    composition: settings.composition,
    shotStyle: settings.shotStyle,
    mirrored,
  };

  const raw = [
    ...evaluateFraming(subject, context),
    // Sin sujeto en cuadro las métricas de luz del "sujeto" no significan nada,
    // pero la exposición global sigue siendo útil.
    ...evaluateLighting(lighting),
  ];

  const stabilized = stabilizer ? stabilizer.update(raw) : raw;
  const visible = stabilized.filter(
    (item) => SEVERITY_ORDER[item.severity] >= SEVERITY_ORDER[settings.minSeverity],
  );

  return {
    subject,
    lighting,
    suggestions: visible,
    score: scoreShot(stabilized, lighting, subject.present),
    latencyMs,
    timestamp: Date.now(),
  };
}
