"use client";

import type { CameraSourceKind, DeviceProfile } from "@/lib/ai/device";
import { MAX_OUTPUT_DIMENSION } from "@/lib/ai/recording";

const SOURCE_LABELS: Record<CameraSourceKind, string> = {
  "movil-trasera": "Cámara trasera del móvil",
  "movil-frontal": "Cámara frontal del móvil",
  "webcam-integrada": "Webcam integrada de laptop",
  "webcam-externa": "Webcam externa",
  desconocida: "Cámara de escritorio (sin identificar)",
};

interface DeviceQualityPanelProps {
  profile: DeviceProfile | null;
  expanded: boolean;
  onToggle: () => void;
  /** Solo aplica en escritorio: el label de la cámara no siempre delata que es la de la laptop. */
  forceLaptopCamera: boolean;
  onToggleForceLaptop: () => void;
  onUseHorizontal: () => void;
  platformIsHorizontal: boolean;
}

/**
 * Calidad detectada de la cámara activa y consejos para sacarle partido.
 *
 * La clasificación no adivina "gama alta/media" por marca de teléfono (el
 * navegador no la expone de forma fiable): se basa en la resolución y fps que
 * la cámara realmente negoció, que es lo que de verdad determina la calidad
 * del clip. Incluye un módulo dedicado a webcams integradas de laptop.
 */
export function DeviceQualityPanel({
  profile,
  expanded,
  onToggle,
  forceLaptopCamera,
  onToggleForceLaptop,
  onUseHorizontal,
  platformIsHorizontal,
}: DeviceQualityPanelProps) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex flex-col gap-0.5">
          <span className="text-[11px] uppercase tracking-wider text-white/50">
            Calidad de grabación
          </span>
          <span className="text-xs text-white/70">
            {profile
              ? `${SOURCE_LABELS[profile.sourceKind]} · ${profile.resolutionLabel}`
              : "Enciende la cámara para detectarla"}
          </span>
        </span>
        <span aria-hidden className="shrink-0 text-xs text-white/60">
          {expanded ? "−" : "+"}
        </span>
      </button>

      {expanded ? (
        <div className="flex flex-col gap-3 border-t border-white/10 p-4">
          {!profile ? (
            <p className="text-xs text-white/50">
              Enciende la cámara para ver recomendaciones según su resolución y
              tipo de dispositivo.
            </p>
          ) : (
            <>
              <div className="rounded-lg border border-sky-400/30 bg-sky-400/10 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-200">
                  Configuración ideal para esta cámara
                </p>
                <p className="mt-1 text-xs text-sky-100">
                  {SOURCE_LABELS[profile.sourceKind]} · salida en {MAX_OUTPUT_DIMENSION}p a{" "}
                  {profile.recommendedFrameRate} fps
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-white/70">
                <dt className="text-white/60">Fuente</dt>
                <dd className="text-right">{SOURCE_LABELS[profile.sourceKind]}</dd>
                <dt className="text-white/60">Resolución detectada</dt>
                <dd className="text-right">{profile.resolutionLabel}</dd>
                <dt className="text-white/60">fps de grabación</dt>
                <dd className="text-right">{profile.recommendedFrameRate}</dd>
              </dl>

              {profile.tips.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {profile.tips.map((tip) => (
                    <li
                      key={tip.id}
                      className="rounded-lg border border-white/10 bg-black/20 p-3"
                    >
                      <p className="text-xs font-medium text-white/90">{tip.title}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-white/55">
                        {tip.detail}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : null}

              {profile.deviceKind === "desktop" ? (
                <label className="flex items-center gap-2 text-xs text-white/60">
                  <input
                    type="checkbox"
                    checked={forceLaptopCamera}
                    onChange={onToggleForceLaptop}
                    className="accent-white"
                  />
                  Uso la cámara integrada de mi laptop
                </label>
              ) : null}

              {profile.sourceKind === "webcam-integrada" && !platformIsHorizontal ? (
                <button
                  type="button"
                  onClick={onUseHorizontal}
                  className="self-start rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/80 transition hover:border-white/40 hover:text-white"
                >
                  Cambiar a horizontal (YouTube 16:9)
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
