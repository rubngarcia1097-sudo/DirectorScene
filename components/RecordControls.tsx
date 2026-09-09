"use client";

import { useEffect, useRef, useState } from "react";

import { isTypingTarget } from "@/lib/dom";
import type { UseRecorderResult } from "@/lib/hooks/useRecorder";

/** Segundos de margen para colocarse en cuadro antes de que arranque la grabación de verdad. */
const COUNTDOWN_SECONDS = 3;

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatSize(bytes: number): string {
  return `${(bytes / 1e6).toFixed(1)} MB`;
}

interface RecordControlsProps {
  recorder: UseRecorderResult;
  disabled: boolean;
}

/**
 * Controles de grabación: el clip sale ya recortado a la plataforma elegida,
 * sin las guías del overlay. Se queda en memoria hasta que se descarga o se
 * descarta; nunca se envía a ningún sitio.
 */
export function RecordControls({ recorder, disabled }: RecordControlsProps) {
  const [withAudio, setWithAudio] = useState(true);
  const [countdownEnabled, setCountdownEnabled] = useState(true);

  // `recorder` es un objeto nuevo en cada render (cambia con cada tick del
  // cronómetro mientras se graba, varias veces por segundo). Si el efecto
  // dependiera de él directamente, el listener se desmontaría y volvería a
  // montar constantemente durante toda la grabación — una ventana de sobra
  // para perder una tecla pulsada justo en mal momento. En vez de eso, el
  // listener se registra una sola vez y lee siempre el valor más reciente a
  // través de un ref actualizado en cada render.
  const latestRef = useRef({ recorder, disabled, withAudio, countdownEnabled });
  useEffect(() => {
    latestRef.current = { recorder, disabled, withAudio, countdownEnabled };
  });

  // Barra espaciadora graba/detiene, Esc cancela la cuenta atrás o descarta
  // el clip revisado — pensado para grabarse a uno mismo sin tener que
  // volver corriendo a tocar la pantalla.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;

      const { recorder, disabled, withAudio, countdownEnabled } = latestRef.current;

      if (event.code === "Space") {
        if (recorder.status === "idle" && !disabled) {
          event.preventDefault();
          void recorder.start({
            withAudio,
            countdownSeconds: countdownEnabled ? COUNTDOWN_SECONDS : 0,
          });
        } else if (recorder.status === "recording") {
          event.preventDefault();
          recorder.stop();
        }
        return;
      }

      if (event.code === "Escape") {
        if (recorder.status === "countdown") {
          event.preventDefault();
          recorder.stop();
        } else if (recorder.status === "done") {
          event.preventDefault();
          recorder.discard();
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!recorder.supported) {
    return (
      <p className="text-[11px] text-white/60">
        Este navegador no puede grabar vídeo localmente.
      </p>
    );
  }

  if (recorder.status === "countdown") {
    return (
      <div className="flex items-center gap-3">
        <span
          aria-live="polite"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-bold text-black tabular-nums"
        >
          {recorder.countdownSeconds}
        </span>
        <span className="text-sm text-white/60">Prepárate…</span>
        <button
          type="button"
          onClick={recorder.stop}
          className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70 transition hover:border-white/40 hover:text-white"
        >
          Cancelar
        </button>
      </div>
    );
  }

  if (recorder.status === "recording") {
    // Últimos 10 s antes del corte automático de la plataforma: se avisa en
    // vez de dejar que la grabación se detenga sin más.
    const closeToLimit = recorder.remainingMs !== null && recorder.remainingMs <= 10_000;

    return (
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`flex items-center gap-2 text-sm font-medium ${
            closeToLimit ? "text-amber-300" : "text-rose-300"
          }`}
        >
          <span
            aria-hidden
            className={`h-2.5 w-2.5 animate-pulse rounded-full ${
              closeToLimit ? "bg-amber-400" : "bg-rose-500"
            }`}
          />
          Grabando {formatTime(recorder.elapsedMs)}
          {recorder.remainingMs !== null
            ? ` · quedan ${formatTime(recorder.remainingMs)}`
            : ""}
        </span>
        <button
          type="button"
          onClick={recorder.stop}
          className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black transition hover:bg-white/85"
        >
          Detener
        </button>
      </div>
    );
  }

  if (recorder.status === "processing") {
    return <p className="text-sm text-white/60">Procesando el clip…</p>;
  }

  if (recorder.status === "done" && recorder.result) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-center justify-between text-xs text-white/50">
          <span>
            Clip listo · {formatTime(recorder.result.durationMs)} ·{" "}
            {formatSize(recorder.result.sizeBytes)}
          </span>
        </div>
        <video
          src={recorder.result.url}
          controls
          playsInline
          className="max-h-64 w-full rounded-lg bg-black"
        />
        <div className="flex gap-2">
          <a
            href={recorder.result.url}
            download={recorder.result.fileName}
            className="flex-1 rounded-full bg-white px-4 py-1.5 text-center text-xs font-semibold text-black transition hover:bg-white/85"
          >
            Descargar
          </a>
          <button
            type="button"
            onClick={recorder.discard}
            className="rounded-full border border-white/15 px-4 py-1.5 text-xs text-white/70 transition hover:border-white/40 hover:text-white"
          >
            Descartar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            void recorder.start({
              withAudio,
              countdownSeconds: countdownEnabled ? COUNTDOWN_SECONDS : 0,
            })
          }
          className="flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black transition hover:bg-white/85 disabled:opacity-40"
        >
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-rose-500" />
          Grabar clip
        </button>

        <label className="flex items-center gap-1.5 text-xs text-white/60">
          <input
            type="checkbox"
            checked={withAudio}
            onChange={(event) => setWithAudio(event.target.checked)}
            className="accent-white"
          />
          Con audio
        </label>

        <label className="flex items-center gap-1.5 text-xs text-white/60">
          <input
            type="checkbox"
            checked={countdownEnabled}
            onChange={(event) => setCountdownEnabled(event.target.checked)}
            className="accent-white"
          />
          Cuenta atrás ({COUNTDOWN_SECONDS} s)
        </label>

        {recorder.error ? (
          <p className="w-full text-[11px] text-rose-300">{recorder.error}</p>
        ) : null}
        {recorder.warning ? (
          <p className="w-full text-[11px] text-amber-300">{recorder.warning}</p>
        ) : null}
      </div>

      {!disabled ? (
        <p className="text-[10px] text-white/60">
          Barra espaciadora: grabar/detener · Esc: cancelar o descartar
        </p>
      ) : null}
    </div>
  );
}
