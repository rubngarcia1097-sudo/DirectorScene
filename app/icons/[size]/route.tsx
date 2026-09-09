import { ImageResponse } from "next/og";

import { buildIconElement } from "@/lib/icon-design";

/** Únicos tamaños que pide `app/manifest.ts`; cualquier otro da 404. */
const ALLOWED_SIZES = [192, 512] as const;
type AllowedSize = (typeof ALLOWED_SIZES)[number];

export function generateStaticParams() {
  return ALLOWED_SIZES.map((size) => ({ size: String(size) }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size: sizeParam } = await params;
  const size = Number(sizeParam);

  if (!ALLOWED_SIZES.includes(size as AllowedSize)) {
    return new Response("Not found", { status: 404 });
  }

  return new ImageResponse(buildIconElement(size), { width: size, height: size });
}
