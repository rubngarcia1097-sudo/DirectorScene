"use client";

import { useEffect, useRef } from "react";

import { FILTER_PRESET_LIST } from "@/lib/ai/filters";
import type { FilterPresetId } from "@/lib/ai/filters";

/** Miniatura cuadrada de cada muestra, en píxeles físicos de canvas. */
const SWATCH_SIZE = 88;
/** Redibujar las miniaturas cada tanto basta para transmitir el look real de
 * la cámara sin competir por el hilo principal con el motor de MediaPipe. */
const REDRAW_INTERVAL_MS = 200;

interface FilterCarouselProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  filter: FilterPresetId;
  lightBoost: number;
  onSelectFilter: (id: FilterPresetId) => void;
  onLightBoostChange: (value: number) => void;
}

/**
 * Selector de filtro directamente sobre la vista en vivo, con una miniatura
 * por opción que muestra el look real (recorte centrado del propio frame de
 * cámara con ese filtro aplicado) en vez de un simple nombre de texto —
 * pensado para elegir mientras se encuadra, no en un panel aparte.
 */
export function FilterCarousel({
  videoRef,
  filter,
  lightBoost,
  onSelectFilter,
  onLightBoostChange,
}: FilterCarouselProps) {
  const canvasRefs = useRef<Partial<Record<FilterPresetId, HTMLCanvasElement | null>>>({});

  useEffect(() => {
    let rafId: number;
    let lastDrawAt = 0;

    const draw = (now: number) => {
      rafId = requestAnimationFrame(draw);
      const video = videoRef.current;
      if (!video || video.videoWidth === 0) return;
      if (now - lastDrawAt < REDRAW_INTERVAL_MS) return;
      lastDrawAt = now;

      const side = Math.min(video.videoWidth, video.videoHeight);
      const sx = (video.videoWidth - side) / 2;
      const sy = (video.videoHeight - side) / 2;

      for (const preset of FILTER_PRESET_LIST) {
        const canvas = canvasRefs.current[preset.id];
        const context = canvas?.getContext("2d");
        if (!context) continue;
        context.filter = preset.css || "none";
        context.drawImage(video, sx, sy, side, side, 0, 0, SWATCH_SIZE, SWATCH_SIZE);
      }
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [videoRef]);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center gap-2 p-3">
      <div className="pointer-events-auto flex max-w-full gap-2 overflow-x-auto rounded-2xl bg-black/70 p-2">
        {FILTER_PRESET_LIST.map((preset) => {
          const active = filter === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelectFilter(preset.id)}
              className="flex shrink-0 flex-col items-center gap-1 rounded-xl px-1 py-1"
            >
              <span
                className={`h-11 w-11 overflow-hidden rounded-full border-2 bg-black transition ${
                  active ? "border-sky-400 shadow-[0_0_0_2px_rgba(56,189,248,0.35)]" : "border-white/30"
                }`}
              >
                <canvas
                  ref={(el) => {
                    canvasRefs.current[preset.id] = el;
                  }}
                  width={SWATCH_SIZE}
                  height={SWATCH_SIZE}
                  aria-hidden
                  className="h-full w-full object-cover"
                />
              </span>
              <span
                className={`text-[9px] font-medium whitespace-nowrap ${
                  active ? "text-sky-300" : "text-white/90"
                }`}
              >
                {preset.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-[11px] text-white/90">
        <span aria-hidden>☀️</span>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.05}
          value={lightBoost}
          onChange={(event) => onLightBoostChange(Number(event.target.value))}
          aria-label="Ajuste de luz"
          className="w-28 accent-sky-400 sm:w-36"
        />
        <span className="w-8 shrink-0 text-right tabular-nums">
          {lightBoost > 0 ? "+" : ""}
          {Math.round(lightBoost * 100)}
        </span>
      </div>
    </div>
  );
}
