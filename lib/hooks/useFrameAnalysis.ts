"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { computeCropRect, toCropSpace } from "@/lib/ai/crop";
import { SuggestionStabilizer, analyzeFrame } from "@/lib/ai/engine";
import { EMPTY_LIGHTING, analyzeLighting } from "@/lib/ai/lighting";
import { loadVisionEngine } from "@/lib/ai/mediapipe";
import type { VisionEngine } from "@/lib/ai/mediapipe";
import { PLATFORMS } from "@/lib/ai/presets";
import type { DirectorSettings } from "@/lib/ai/presets";
import { EMPTY_SUBJECT, extractSubject } from "@/lib/ai/subject";
import type { Landmark } from "@/lib/ai/subject";
import type { BoundingBox, FrameAnalysis } from "@/lib/ai/types";

export type EngineStatus = "idle" | "loading" | "running" | "error";

export interface UseFrameAnalysisOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  mirrored: boolean;
  settings: DirectorSettings;
  /** Análisis por segundo. Más de ~15 no aporta y calienta el dispositivo. */
  targetFps?: number;
}

export interface UseFrameAnalysisResult {
  analysis: FrameAnalysis | null;
  status: EngineStatus;
  error: string | null;
  fps: number;
  /** Landmarks de pose en espacio de análisis, para dibujar el esqueleto. */
  poseLandmarks: Landmark[] | null;
}

/** Ancho del frame reducido que se usa para el histograma de brillo. */
const SAMPLE_WIDTH = 160;

/**
 * Bucle de análisis en vivo: pose + rostro (MediaPipe) e histograma (Canvas).
 * Todo ocurre en el cliente sobre el frame actual, que se descarta enseguida.
 */
export function useFrameAnalysis({
  videoRef,
  enabled,
  mirrored,
  settings,
  targetFps = 15,
}: UseFrameAnalysisOptions): UseFrameAnalysisResult {
  const [analysis, setAnalysis] = useState<FrameAnalysis | null>(null);
  const [poseLandmarks, setPoseLandmarks] = useState<Landmark[] | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);

  const engineRef = useRef<VisionEngine | null>(null);
  const rafRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const lastRunRef = useRef(0);
  const fpsWindowRef = useRef<number[]>([]);

  // Los ajustes cambian con la UI; el bucle los lee por ref para no reiniciarse
  // en cada pulsación. La sincronización va en un efecto: escribir una ref
  // durante el render está prohibido.
  const settingsRef = useRef(settings);
  const mirroredRef = useRef(mirrored);
  useEffect(() => {
    settingsRef.current = settings;
    mirroredRef.current = mirrored;
  }, [mirrored, settings]);

  const getCanvas = useCallback((width: number, height: number) => {
    canvasRef.current ??= document.createElement("canvas");
    const canvas = canvasRef.current;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    return canvas;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const stabilizer = new SuggestionStabilizer();

    void loadVisionEngine()
      .then((engine) => {
        if (cancelled) return;
        engineRef.current = engine;
        setReady(true);
        setError(null);
        rafRef.current = requestAnimationFrame(tick);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error
            ? `No se pudo cargar el motor de IA: ${cause.message}`
            : "No se pudo cargar el motor de IA.",
        );
      });

    function tick() {
      rafRef.current = requestAnimationFrame(tick);

      const video = videoRef.current;
      const engine = engineRef.current;
      if (!video || !engine || video.readyState < 2) return;
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      const now = performance.now();
      if (now - lastRunRef.current < 1000 / targetFps) return;

      // detectForVideo exige timestamps crecientes y un frame nuevo.
      if (video.currentTime === lastVideoTimeRef.current) return;
      lastVideoTimeRef.current = video.currentTime;
      lastRunRef.current = now;

      const startedAt = now;
      const flip = mirroredRef.current;
      const platform = PLATFORMS[settingsRef.current.platform];
      // Analizamos solo el recorte que se publicará, no el frame completo.
      const crop = computeCropRect(
        video.videoWidth / video.videoHeight,
        platform.aspect,
      );

      try {
        const poseResult = engine.pose.detectForVideo(video, now);
        const faceResult = engine.face.detectForVideo(video, now);

        // Espejamos y recortamos: a partir de aquí todo está en espacio de
        // pantalla y referido al encuadre de entrega.
        const pose = toAnalysisSpace(poseResult.landmarks?.[0], flip, crop);
        const face = toAnalysisSpace(faceResult.faceLandmarks?.[0], flip, crop);

        const subject = pose || face ? extractSubject(pose, face) : EMPTY_SUBJECT;

        const cropWidthPx = video.videoWidth * crop.width;
        const cropHeightPx = video.videoHeight * crop.height;
        const height = Math.max(
          1,
          Math.round((SAMPLE_WIDTH * cropHeightPx) / cropWidthPx),
        );
        const canvas = getCanvas(SAMPLE_WIDTH, height);
        const context = canvas.getContext("2d", { willReadFrequently: true });

        let lighting = EMPTY_LIGHTING;
        if (context) {
          context.save();
          if (flip) {
            context.translate(SAMPLE_WIDTH, 0);
            context.scale(-1, 1);
          }
          context.drawImage(
            video,
            crop.x * video.videoWidth,
            crop.y * video.videoHeight,
            cropWidthPx,
            cropHeightPx,
            0,
            0,
            SAMPLE_WIDTH,
            height,
          );
          context.restore();
          lighting = analyzeLighting(
            context.getImageData(0, 0, SAMPLE_WIDTH, height),
            subject.box,
          );
        }

        setPoseLandmarks(pose ?? null);
        setAnalysis(
          analyzeFrame({
            subject,
            lighting,
            settings: settingsRef.current,
            mirrored: flip,
            latencyMs: performance.now() - startedAt,
            stabilizer,
          }),
        );

        const window = fpsWindowRef.current;
        window.push(now);
        while (window.length > 0 && now - window[0] > 1000) window.shift();
        setFps(window.length);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Fallo analizando el frame.");
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }

    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastVideoTimeRef.current = -1;
      stabilizer.reset();
    };
  }, [enabled, getCanvas, targetFps, videoRef]);

  const status: EngineStatus = !enabled
    ? "idle"
    : error
      ? "error"
      : ready
        ? "running"
        : "loading";

  return {
    analysis: enabled ? analysis : null,
    status,
    error: enabled ? error : null,
    fps,
    poseLandmarks: enabled ? poseLandmarks : null,
  };
}

function toAnalysisSpace(
  landmarks: Landmark[] | undefined,
  mirrored: boolean,
  crop: BoundingBox,
): Landmark[] | undefined {
  if (!landmarks || landmarks.length === 0) return undefined;

  return landmarks.map((point) => {
    const x = mirrored ? 1 - point.x : point.x;
    const mapped = toCropSpace({ x, y: point.y }, crop);
    return { ...point, x: mapped.x, y: mapped.y };
  });
}
