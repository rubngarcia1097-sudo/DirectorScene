"use client";

import { useState } from "react";

import type { UseRecorderResult } from "@/lib/hooks/useRecorder";

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

  if (!recorder.supported) {
    return (
      <p className="text-[11px] text-white/40">
        Este navegador no puede grabar vídeo localmente.
      </p>
    );
  }

  if (recorder.status === "recording") {
    return (
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-2 text-sm font-medium text-rose-300">
          <span
            aria-hidden
            className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500"
          />
          Grabando {formatTime(recorder.elapsedMs)}
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
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={disabled}
        onClick={() => void recorder.start({ withAudio })}
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

      {recorder.error ? (
        <p className="w-full text-[11px] text-rose-300">{recorder.error}</p>
      ) : null}
      {recorder.warning ? (
        <p className="w-full text-[11px] text-amber-300">{recorder.warning}</p>
      ) : null}
    </div>
  );
}
