"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { computeCropRect } from "@/lib/ai/crop";
import { PLATFORMS } from "@/lib/ai/presets";
import type { PlatformId } from "@/lib/ai/presets";
import { computeOutputSize } from "@/lib/ai/recording";

export type RecorderStatus = "idle" | "recording" | "processing" | "done" | "error";

export interface RecordingResult {
  url: string;
  fileName: string;
  sizeBytes: number;
  durationMs: number;
}

export interface UseRecorderOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Solo se puede grabar con la cámara encendida. */
  active: boolean;
  mirrored: boolean;
  platform: PlatformId;
  /** fps de grabación; lo ideal es lo que la cámara realmente entrega (ver device.ts). */
  targetFrameRate?: number;
}

export interface UseRecorderResult {
  status: RecorderStatus;
  elapsedMs: number;
  /** Tiempo hasta el corte automático; null si la plataforma no impone tope. */
  remainingMs: number | null;
  error: string | null;
  /** Aviso no bloqueante: p. ej. se grabó sin audio por falta de permiso. */
  warning: string | null;
  result: RecordingResult | null;
  supported: boolean;
  start: (options: { withAudio: boolean }) => Promise<void>;
  stop: () => void;
  discard: () => void;
}

const DEFAULT_FRAME_RATE = 30;
const ELAPSED_TICK_MS = 200;

const MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
}

function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "MediaRecorder" in window &&
    typeof HTMLCanvasElement.prototype.captureStream === "function"
  );
}

// El soporte no cambia mientras la pestaña vive: no hace falta suscripción.
const noopSubscribe = () => () => {};
const getServerSupportSnapshot = () => false;

/**
 * Si el soporte se calculase directamente en el cuerpo del hook, el servidor
 * (sin `window`) y el cliente tras hidratar darían resultados distintos: un
 * mismatch de hidratación. `useSyncExternalStore` es el patrón recomendado
 * por React para esto — renderiza el snapshot del servidor y lo corrige justo
 * después de montar, sin pasar por un `setState` síncrono en un efecto.
 */
function useRecorderSupport(): boolean {
  return useSyncExternalStore(noopSubscribe, isSupported, getServerSupportSnapshot);
}

/**
 * Graba el recorte de entrega tal cual lo ve el usuario: mismo aspecto y
 * espejado que la plataforma elegida, sin las guías del overlay. La grabación
 * es un canvas redibujado desde el `<video>` en vivo — no el stream crudo —
 * así el archivo final ya sale recortado al 9:16 (o 16:9) correcto.
 *
 * El clip se queda en memoria (Blob URL) hasta que el usuario lo descarga:
 * en ningún momento sale del navegador.
 */
export function useRecorder({
  videoRef,
  active,
  mirrored,
  platform,
  targetFrameRate = DEFAULT_FRAME_RATE,
}: UseRecorderOptions): UseRecorderResult {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [recordingCapMs, setRecordingCapMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [result, setResult] = useState<RecordingResult | null>(null);
  const supported = useRecorderSupport();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const drawStateRef = useRef<{
    crop: ReturnType<typeof computeCropRect>;
    mirrored: boolean;
    lastDrawAt: number;
  } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const chunksRef = useRef<Blob[]>([]);
  const resultUrlRef = useRef<string | null>(null);

  const cleanupTimers = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (timerRef.current !== null) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const stopMic = useCallback(() => {
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
  }, []);

  const discard = useCallback(() => {
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    resultUrlRef.current = null;
    setResult(null);
    setError(null);
    setWarning(null);
    setStatus("idle");
    setElapsedMs(0);
    setRecordingCapMs(null);
  }, []);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    setStatus("processing");
    recorder.stop();
  }, []);

  const start = useCallback(
    async ({ withAudio }: { withAudio: boolean }) => {
      const video = videoRef.current;
      if (!isSupported()) {
        setError("Este navegador no puede grabar vídeo (MediaRecorder no disponible).");
        setStatus("error");
        return;
      }
      if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
        setError("La cámara todavía no está lista.");
        setStatus("error");
        return;
      }

      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
      setResult(null);
      setError(null);
      setWarning(null);
      chunksRef.current = [];

      const crop = computeCropRect(
        video.videoWidth / video.videoHeight,
        PLATFORMS[platform].aspect,
      );
      const cropWidthPx = video.videoWidth * crop.width;
      const cropHeightPx = video.videoHeight * crop.height;
      const { width: outputWidth, height: outputHeight } = computeOutputSize(
        cropWidthPx,
        cropHeightPx,
      );

      canvasRef.current ??= document.createElement("canvas");
      const canvas = canvasRef.current;
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const context = canvas.getContext("2d");
      if (!context) {
        setError("No se pudo preparar el lienzo de grabación.");
        setStatus("error");
        return;
      }

      // Encuadre fijado al empezar: si cambian de plataforma a mitad de toma,
      // la grabación en curso sigue con el recorte que tenía cuando arrancó.
      drawStateRef.current = { crop, mirrored, lastDrawAt: 0 };

      let audioTracks: MediaStreamTrack[] = [];
      if (withAudio) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = micStream;
          audioTracks = micStream.getAudioTracks();
        } catch {
          setWarning("No se pudo activar el micrófono: se grabará sin audio.");
        }
      }

      const videoTrack = canvas.captureStream(targetFrameRate).getVideoTracks()[0];
      const combined = new MediaStream([videoTrack, ...audioTracks]);

      const mimeType = pickMimeType();
      let recorder: MediaRecorder;
      try {
        recorder = mimeType
          ? new MediaRecorder(combined, { mimeType })
          : new MediaRecorder(combined);
      } catch (cause) {
        stopMic();
        setError(cause instanceof Error ? cause.message : "No se pudo iniciar la grabación.");
        setStatus("error");
        return;
      }

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        cleanupTimers();
        stopMic();
        videoTrack.stop();

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "video/webm",
        });
        const url = URL.createObjectURL(blob);
        resultUrlRef.current = url;
        const extension = blob.type.includes("mp4") ? "mp4" : "webm";

        setResult({
          url,
          fileName: `directorscene-${platform}-${Date.now()}.${extension}`,
          sizeBytes: blob.size,
          durationMs: performance.now() - startedAtRef.current,
        });
        setStatus("done");
      };

      recorder.onerror = () => {
        cleanupTimers();
        stopMic();
        videoTrack.stop();
        setError("La grabación se interrumpió inesperadamente.");
        setStatus("error");
      };

      recorderRef.current = recorder;
      startedAtRef.current = performance.now();
      recorder.start(1000);
      setStatus("recording");
      setElapsedMs(0);

      // Tope fijado al empezar, igual que el recorte: cambiar de plataforma
      // a mitad de toma no debe alargar ni acortar el límite ya en marcha.
      const maxDurationSec = PLATFORMS[platform].maxDurationSec;
      const maxDurationMs = maxDurationSec !== null ? maxDurationSec * 1000 : null;
      setRecordingCapMs(maxDurationMs);

      const drawIntervalMs = 1000 / targetFrameRate;

      const draw = (now: number) => {
        rafRef.current = requestAnimationFrame(draw);
        const state = drawStateRef.current;
        const currentVideo = videoRef.current;
        if (!state || !currentVideo) return;
        if (now - state.lastDrawAt < drawIntervalMs) return;
        state.lastDrawAt = now;

        context.save();
        if (state.mirrored) {
          context.translate(outputWidth, 0);
          context.scale(-1, 1);
        }
        context.drawImage(
          currentVideo,
          state.crop.x * currentVideo.videoWidth,
          state.crop.y * currentVideo.videoHeight,
          cropWidthPx,
          cropHeightPx,
          0,
          0,
          outputWidth,
          outputHeight,
        );
        context.restore();
      };
      rafRef.current = requestAnimationFrame(draw);

      timerRef.current = setInterval(() => {
        const elapsed = performance.now() - startedAtRef.current;
        setElapsedMs(elapsed);
        // Corte automático al llegar al tope de la plataforma, igual que TikTok
        // o Instagram cortan la grabación en su propia cámara.
        if (maxDurationMs !== null && elapsed >= maxDurationMs) stop();
      }, ELAPSED_TICK_MS);
    },
    [cleanupTimers, mirrored, platform, stop, stopMic, targetFrameRate, videoRef],
  );

  // Si la cámara se apaga (o el componente se desmonta) a mitad de grabación,
  // se corta todo en vez de dejar el MediaRecorder y el micrófono colgados.
  useEffect(() => {
    if (active) return;
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }, [active]);

  useEffect(
    () => () => {
      cleanupTimers();
      stopMic();
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    },
    [cleanupTimers, stopMic],
  );

  return {
    status,
    elapsedMs,
    remainingMs: recordingCapMs !== null ? Math.max(0, recordingCapMs - elapsedMs) : null,
    error,
    warning,
    result,
    supported,
    start,
    stop,
    discard,
  };
}
