import { ImageResponse } from "next/og";

import { buildIconElement } from "@/lib/icon-design";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * Icono de pantalla de inicio en iOS/iPadOS — mismo diseño que el favicon
 * (`lib/icon-design.tsx`), sin redondear: iOS aplica su propia máscara.
 */
export default function AppleIcon() {
  return new ImageResponse(buildIconElement(size.width), size);
}
