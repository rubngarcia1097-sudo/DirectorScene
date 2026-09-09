"use client";

import { useEffect } from "react";

/**
 * Registra `public/sw.js` para que la app (y los binarios de MediaPipe) sigan
 * funcionando con la cobertura mala o inexistente de quien graba en la calle.
 * Solo en producción: en `next dev` el propio HMR ya invalida assets, y un
 * service worker de por medio solo complica depurar qué se está sirviendo.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sin service worker la app sigue funcionando igual, solo sin caché
      // de los binarios de MediaPipe entre sesiones.
    });
  }, []);

  return null;
}
