import type { Metadata } from "next";
import Link from "next/link";

import { DirectorStudio } from "@/components/DirectorStudio";

export const metadata: Metadata = {
  title: "Estudio · DirectorScene",
  description:
    "Dirección de cámara en tiempo real: encuadre, ángulo e iluminación analizados en tu propio navegador.",
};

export default function DirectorPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-sm font-semibold tracking-tight">
          <Link href="/">DirectorScene</Link>
        </h1>
        <span className="rounded-full border border-white/15 px-3 py-1 text-[11px] text-white/60">
          El vídeo no sale de tu navegador
        </span>
      </header>

      <DirectorStudio />
    </main>
  );
}
