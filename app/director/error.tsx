"use client";

import { useEffect } from "react";

/**
 * Red de seguridad del estudio: si algo revienta durante el render (un bug
 * real, no un fallo de cámara o de red — esos ya se manejan dentro de cada
 * hook con su propio estado de error), Next.js monta esto en vez de dejar la
 * pantalla en blanco. `reset()` reintenta sin recargar toda la página.
 */
export default function DirectorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Al menos queda en la consola del navegador de quien lo reporte;
    // no hay backend propio al que enviarlo (el vídeo nunca sale de aquí).
    console.error("Error en el estudio:", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="text-4xl" aria-hidden>
        🎬💥
      </span>
      <h1 className="text-lg font-semibold">El estudio se ha detenido</h1>
      <p className="text-sm text-white/60">
        Algo falló mientras se analizaba la cámara. Si estabas grabando, ese
        clip no se pudo recuperar — el vídeo solo existe en la memoria de esta
        pestaña, nunca se guarda en ningún sitio.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-white/85"
        >
          Reintentar
        </button>
        <button
          type="button"
          // Recarga completa del documento a propósito, no una transición de
          // cliente: Next.js mantiene este boundary activo hasta llamar a
          // reset(), así que un router.push()/<Link> a la misma ruta no lo
          // habría limpiado (comprobado). La recarga dura también reinicia
          // cualquier estado corrupto fuera de React (p. ej. el motor de
          // MediaPipe), que reset() por sí solo no toca.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          onClick={() => window.location.assign("/director")}
          className="rounded-full border border-white/15 px-5 py-2 text-sm text-white/70 transition hover:border-white/40 hover:text-white"
        >
          Volver a empezar
        </button>
      </div>
      {error.digest ? (
        <p className="text-[10px] text-white/30">Referencia: {error.digest}</p>
      ) : null}
    </main>
  );
}
