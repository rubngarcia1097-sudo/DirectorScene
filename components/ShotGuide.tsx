"use client";

import { SHOT_STYLES } from "@/lib/ai/presets";
import type { ShotStyleId } from "@/lib/ai/presets";

interface ShotGuideProps {
  shotStyle: ShotStyleId;
}

/**
 * Guía técnica fija del estilo de plano elegido: posición de cámara y de luz
 * recomendadas. A diferencia de `SuggestionPanel` (reactivo, aparece y
 * desaparece según lo que detecta el motor frame a frame), esto se queda en
 * pantalla siempre igual — es la referencia de "cómo se supone que se vea
 * esto", no un aviso de que algo está mal ahora mismo.
 */
export function ShotGuide({ shotStyle }: ShotGuideProps) {
  const style = SHOT_STYLES[shotStyle];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
      <span className="text-[11px] uppercase tracking-wider text-white/50">
        Guía técnica · {style.label}
      </span>
      <GuideList title="Posición" items={style.guide.position} />
      <GuideList title="Luz" items={style.guide.lighting} />
    </div>
  );
}

function GuideList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-white/80">{title}</p>
      <ul className="flex flex-col gap-1 pl-4 text-xs leading-relaxed text-white/70">
        {items.map((item) => (
          <li key={item} className="list-disc">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
