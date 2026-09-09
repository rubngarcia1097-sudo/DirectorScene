"use client";

import { useCallback, useEffect, useState } from "react";

import { GuideOverlay } from "@/components/GuideOverlay";
import { LiveHud } from "@/components/LiveHud";
import type { DirectorSettings } from "@/lib/ai/presets";
import type { Landmark } from "@/lib/ai/subject";
import type { FrameAnalysis, SubjectMetrics } from "@/lib/ai/types";
import type { CameraStatus } from "@/lib/hooks/useCamera";
import type { EngineStatus } from "@/lib/hooks/useFrameAnalysis";

interface CameraStageProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraStatus: CameraStatus;
  cameraError: string | null;
  engineStatus: EngineStatus;
  engineError: string | null;
  mirrored: boolean;
  settings: DirectorSettings;
  subject: SubjectMetrics | null;
  poseLandmarks: Landmark[] | null;
  analysis: FrameAnalysis | null;
  onStart: () => void;
}

/** Vídeo en vivo con las guías dibujadas encima. Nada se graba ni se sube. */
export function CameraStage({
  videoRef,
  cameraStatus,
  cameraError,
  engineStatus,
  engineError,
  mirrored,
  settings,
  subject,
  poseLandmarks,
  analysis,
  onStart,
}: CameraStageProps) {
  // El contenedor adopta la relación de aspecto real del vídeo, de modo que las
  // coordenadas normalizadas del análisis coinciden con los píxeles en pantalla.
  const [aspect, setAspect] = useState(9 / 16);

  const syncAspect = useCallback(() => {
    const video = videoRef.current;
    if (video && video.videoWidth > 0) {
      setAspect(video.videoWidth / video.videoHeight);
    }
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.addEventListener("loadedmetadata", syncAspect);
    video.addEventListener("resize", syncAspect);
    return () => {
      video.removeEventListener("loadedmetadata", syncAspect);
      video.removeEventListener("resize", syncAspect);
    };
  }, [syncAspect, videoRef]);

  const active = cameraStatus === "ready";

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative mx-auto overflow-hidden rounded-2xl border border-white/10 bg-black"
        // El ancho se deriva del alto máximo y de la relación de aspecto, así
        // el contenedor coincide exactamente con el vídeo y el overlay encaja.
        style={{ aspectRatio: aspect, width: `min(100%, calc(68dvh * ${aspect}))` }}
      >
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          className="h-full w-full object-contain"
          style={{ transform: mirrored ? "scaleX(-1)" : undefined }}
        />

        {active ? (
          <>
            <GuideOverlay
              settings={settings}
              videoAspect={aspect}
              subject={subject}
              poseLandmarks={poseLandmarks}
            />
            {engineStatus === "running" && !engineError ? (
              <LiveHud analysis={analysis} />
            ) : null}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-white/70">
              {cameraStatus === "requesting"
                ? "Pidiendo permiso de cámara…"
                : "La cámara está apagada."}
            </p>
            {cameraStatus !== "requesting" ? (
              <button
                type="button"
                onClick={onStart}
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-white/85"
              >
                Encender cámara
              </button>
            ) : null}
            {cameraError ? (
              <p className="text-xs text-rose-300">{cameraError}</p>
            ) : null}
          </div>
        )}

        {active && engineStatus === "loading" ? (
          <div className="absolute inset-x-0 bottom-0 bg-black/70 px-4 py-2 text-center text-xs text-white/80">
            Cargando modelos de visión en el dispositivo…
          </div>
        ) : null}

        {engineError ? (
          <div className="absolute inset-x-0 bottom-0 bg-rose-950/80 px-4 py-2 text-center text-xs text-rose-200">
            {engineError}
          </div>
        ) : null}
      </div>
    </div>
  );
}
