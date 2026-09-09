"use client";

/**
 * Última red de seguridad: solo entra en juego si el fallo ocurre en el
 * propio layout raíz, fuera del alcance de `app/director/error.tsx`. Al
 * sustituir el layout raíz, tiene que traer su propio <html>/<body>.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-neutral-950 px-6 text-center text-white">
        <h1 className="text-lg font-semibold">DirectorScene no pudo arrancar</h1>
        <p className="max-w-md text-sm text-white/60">
          Algo falló antes de cargar la app. Prueba a reintentar; si sigue
          pasando, recarga la página entera.
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-white/85"
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
