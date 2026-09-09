import { ImageResponse } from "next/og";

import { buildIconElement } from "@/lib/icon-design";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Favicon generado por código con `next/og` — ver el diseño compartido en
 * `lib/icon-design.tsx`. Redondeado ligeramente: a este tamaño se ve dentro
 * de una pestaña cuadrada, a diferencia del icono de instalación (iOS y
 * Android aplican su propia máscara de esquinas).
 */
export default function Icon() {
  return new ImageResponse(buildIconElement(size.width, { rounded: true }), size);
}
