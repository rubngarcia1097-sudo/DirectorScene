"use client";

import { QUICK_PRESETS } from "@/lib/ai/presets";
import type { DirectorSettings } from "@/lib/ai/presets";

interface QuickPresetsProps {
  onApply: (settings: DirectorSettings) => void;
  /** true mientras se graba: la plantilla cambiaría la plataforma a mitad de toma. */
  disabled?: boolean;
}

/**
 * Plantillas fijas por tipo de contenido: aplican de golpe plataforma,
 * composición, estilo de plano y guías en vez de tocar cada control por
 * separado. Pensado como punto de partida — cada ajuste sigue siendo
 * editable después en `ControlBar`.
 */
export function QuickPresets({ onApply, disabled = false }: QuickPresetsProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] uppercase tracking-wider text-white/60">
        Plantillas rápidas
      </span>
      <div className="grid gap-2 sm:grid-cols-3">
        {QUICK_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            disabled={disabled}
            onClick={() => onApply(preset.settings)}
            title={preset.description}
            className="flex flex-col gap-0.5 rounded-lg border border-white/15 px-3 py-2 text-left transition hover:border-white/40 disabled:opacity-40"
          >
            <span className="text-xs font-medium">{preset.label}</span>
            <span className="text-[10px] leading-snug text-white/60">
              {preset.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
