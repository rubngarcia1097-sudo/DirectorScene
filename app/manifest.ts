import type { MetadataRoute } from "next";

/**
 * Manifest de la PWA: permite "Añadir a pantalla de inicio" en Android/Chrome
 * (en iOS, `apple-icon.tsx` + las etiquetas meta del layout ya cubren ese
 * caso). `start_url` va directo al estudio, no a la landing — quien instala
 * la app quiere grabar, no leer el marketing otra vez. `display: standalone`
 * la abre sin la barra de navegador, como una app de cámara real.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DirectorScene",
    short_name: "Director",
    description:
      "Dirección de cámara en tiempo real para TikTok, Reels, Shorts y YouTube. El análisis de encuadre e iluminación corre en tu navegador.",
    start_url: "/director",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    lang: "es",
    categories: ["photo", "video"],
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
    ],
  };
}
