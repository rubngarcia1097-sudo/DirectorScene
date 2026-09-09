"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus = "idle" | "requesting" | "ready" | "denied" | "error";
export type FacingMode = "user" | "environment";

interface OpenOptions {
  facingMode: FacingMode;
  deviceId: string | null;
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
  start: () => Promise<void>;
  stop: () => void;
  flip: () => void;
  selectDevice: (deviceId: string) => void;
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

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
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

      const stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId
          ? {
              deviceId: { exact: deviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }
          : { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
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
    start,
    stop,
    flip,
    selectDevice,
  };
}
