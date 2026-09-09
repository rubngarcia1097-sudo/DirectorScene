"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { classifyDeviceKind } from "@/lib/ai/device";
import type { CameraCapabilitySummary, DeviceKind } from "@/lib/ai/device";

export type CameraStatus = "idle" | "requesting" | "ready" | "denied" | "error";
export type FacingMode = "user" | "environment";

interface OpenOptions {
  facingMode: FacingMode;
  deviceId: string | null;
}

/** Lo que realmente negoció la pista de vídeo activa, para dar recomendaciones. */
export interface CameraTrackInfo {
  label: string;
  deviceKind: DeviceKind;
  capabilities: CameraCapabilitySummary;
}

export interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  status: CameraStatus;
  error: string | null;
  /** true cuando la vista se muestra espejada (cámara frontal). */
  mirrored: boolean;
  facingMode: FacingMode;
  devices: MediaDeviceInfo[];
  deviceId: string | null;
  /** null hasta que hay un stream activo. */
  trackInfo: CameraTrackInfo | null;
  start: () => Promise<void>;
  stop: () => void;
  flip: () => void;
  selectDevice: (deviceId: string) => void;
}

function readCapabilities(track: MediaStreamTrack): CameraCapabilitySummary {
  // Safari y algunos navegadores no implementan getCapabilities(); sin ella
  // solo queda lo que getSettings() diga de la negociación actual.
  const capabilities =
    typeof track.getCapabilities === "function" ? track.getCapabilities() : {};
  const settings = typeof track.getSettings === "function" ? track.getSettings() : {};

  return {
    maxWidth: capabilities.width?.max ?? null,
    maxHeight: capabilities.height?.max ?? null,
    maxFrameRate: capabilities.frameRate?.max ?? null,
    currentWidth: settings.width ?? null,
    currentHeight: settings.height ?? null,
    currentFrameRate: settings.frameRate ?? null,
  };
}

/**
 * Acceso a la cámara con getUserMedia. El stream se queda en el elemento
 * <video>: no se graba, no se sube y se corta al desmontar.
 */
export function useCamera(): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<FacingMode>("user");
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [trackInfo, setTrackInfo] = useState<CameraTrackInfo | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
    setTrackInfo(null);
  }, []);

  /**
   * Abre el stream con unas restricciones concretas. Recibe la cámara elegida
   * por parámetro (y no del estado) para poder cambiarla y reabrirla en el
   * mismo gesto del usuario, sin efectos intermedios.
   */
  const open = useCallback(async ({ facingMode, deviceId }: OpenOptions) => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError("Este navegador no soporta acceso a cámara (getUserMedia).");
      return;
    }

    setStatus("requesting");
    setError(null);

    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());

      // "ideal" es solo una preferencia: el navegador la negocia hacia abajo
      // solo (nunca la fuerza), así que pedir Full HD no rompe cámaras más
      // modestas y deja que las buenas entreguen lo que realmente tienen —
      // limitarlo a 720p de partida las desaprovechaba.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId
          ? {
              deviceId: { exact: deviceId },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            }
          : { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });

      streamRef.current = stream;

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => {
          // Safari puede rechazar play() sin gesto de usuario; el <video> lleva
          // autoPlay + playsInline y reintenta solo.
        });
      }

      // Las etiquetas de dispositivo solo existen tras conceder el permiso.
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices(list.filter((device) => device.kind === "videoinput"));

      const track = stream.getVideoTracks()[0];
      if (track) {
        const hasTouch = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
        setTrackInfo({
          label: track.label,
          deviceKind: classifyDeviceKind(navigator.userAgent, hasTouch),
          capabilities: readCapabilities(track),
        });
      }

      setStatus("ready");
    } catch (cause) {
      const name = cause instanceof DOMException ? cause.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setStatus("denied");
        setError(
          "Permiso de cámara denegado. Actívalo en el candado de la barra de direcciones.",
        );
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setStatus("error");
        setError("No se encontró ninguna cámara disponible.");
      } else {
        setStatus("error");
        setError(cause instanceof Error ? cause.message : "No se pudo abrir la cámara.");
      }
    }
  }, []);

  const start = useCallback(
    () => open({ facingMode, deviceId }),
    [deviceId, facingMode, open],
  );

  const active = status === "ready" || status === "requesting";

  const flip = useCallback(() => {
    const next: FacingMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    setDeviceId(null);
    if (active) void open({ facingMode: next, deviceId: null });
  }, [active, facingMode, open]);

  const selectDevice = useCallback(
    (id: string) => {
      setDeviceId(id || null);
      if (active) void open({ facingMode, deviceId: id || null });
    },
    [active, facingMode, open],
  );

  useEffect(() => stop, [stop]);

  return {
    videoRef,
    status,
    error,
    mirrored: facingMode === "user",
    facingMode,
    devices,
    deviceId,
    trackInfo,
    start,
    stop,
    flip,
    selectDevice,
  };
}
