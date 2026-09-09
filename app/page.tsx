import Link from "next/link";

const FEATURES = [
  {
    title: "Encuadre",
    body: "Regla de tercios, distancia a cámara, aire sobre la cabeza y zona segura de cada plataforma.",
  },
  {
    title: "Ángulo",
    body: "Altura de cámara respecto a la línea de ojos, nivelación y giro del cuerpo.",
  },
  {
    title: "Iluminación",
    body: "Histograma del frame en vivo: subexposición, zonas quemadas, contraluz y luz lateral.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col justify-center gap-10 px-6 py-16">
      <div className="flex flex-col gap-5">
        <span className="w-fit rounded-full border border-white/15 px-3 py-1 text-[11px] uppercase tracking-wider text-white/60">
          Director de vídeo con IA
        </span>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Te dirige mientras grabas.
        </h1>
        <p className="max-w-xl text-base text-white/70">
          DirectorScene analiza tu cámara en tiempo real y te dice cómo mejorar la
          toma para TikTok, Reels, Shorts y YouTube. La IA de visión corre en tu
          navegador: el vídeo nunca sale de tu dispositivo.
        </p>
        <Link
          href="/director"
          className="w-fit rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/85"
        >
          Abrir el estudio
        </Link>
      </div>

      <ul className="grid gap-4 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <li
            key={feature.title}
            className="rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <h2 className="text-sm font-semibold">{feature.title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-white/60">
              {feature.body}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
