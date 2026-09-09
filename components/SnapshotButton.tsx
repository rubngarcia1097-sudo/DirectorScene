"use client";

import type { UseSnapshotResult } from "@/lib/hooks/useSnapshot";
import { canShareFiles, isShareAbort } from "@/lib/share";

interface SnapshotButtonProps {
  snapshot: UseSnapshotResult;
  disabled: boolean;
}

/**
 * Captura una foto del encuadre actual (mismo recorte que la grabación, sin
 * las guías) para elegir una miniatura sin grabar un clip entero.
 */
export function SnapshotButton({ snapshot, disabled }: SnapshotButtonProps) {
  if (snapshot.result) {
    const { result } = snapshot;
    const file = new File([result.blob], result.fileName, { type: result.blob.type });
    const shareable = canShareFiles([file]);

    async function share() {
      try {
        await navigator.share({ files: [file], title: result.fileName });
      } catch (cause) {
        if (!isShareAbort(cause)) console.error("No se pudo compartir la foto", cause);
      }
    }

    return (
      <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1 pl-1 pr-3">
        {/* Blob URL local: next/image no la puede optimizar ni servir. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={result.url}
          alt="Miniatura de la foto capturada"
          className="h-7 w-7 rounded-full object-cover"
        />
        {shareable ? (
          <button
            type="button"
            onClick={() => void share()}
            className="text-xs font-medium text-white/80 underline decoration-white/30 underline-offset-2 hover:text-white"
          >
            Compartir
          </button>
        ) : null}
        <a
          href={result.url}
          download={result.fileName}
          className="text-xs font-medium text-white/80 underline decoration-white/30 underline-offset-2 hover:text-white"
        >
          Descargar foto
        </a>
        <button
          type="button"
          onClick={snapshot.discard}
          aria-label="Descartar foto"
          className="text-xs text-white/60 hover:text-white/80"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={snapshot.capture}
        className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:border-white/40 hover:text-white disabled:opacity-40"
      >
        📷 Foto
      </button>
      {snapshot.error ? (
        <p className="text-[11px] text-rose-300">{snapshot.error}</p>
      ) : null}
    </div>
  );
}
