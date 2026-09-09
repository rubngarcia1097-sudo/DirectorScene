"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { computeCropRect } from "@/lib/ai/crop";
import { composeFilterCss } from "@/lib/ai/filters";
import type { FilterPresetId } from "@/lib/ai/filters";
import { PLATFORMS } from "@/lib/ai/presets";
import type { PlatformId } from "@/lib/ai/presets";
import { computeOutputSize } from "@/lib/ai/recording";

export interface SnapshotResult {
  url: string;
  blob: Blob;
  fileName: string;
  sizeBytes: number;
}

export interface UseSnapshotOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  mirrored: boolean;
  platform: PlatformId;
  /** Mismo look que la vista previa y la grabación de vídeo. */
  filter: FilterPresetId;
  lightBoost: number;
}

export interface UseSnapshotResult {
  result: SnapshotResult | null;
  error: string | null;
  capture: () => void;
  discard: () => void;
}

/**
 * Captura un fotograma del recorte de entrega — mismo recorte y espejado que
 * graba `useRecorder`, sin las guías del overlay — para elegir una miniatura
 * sin grabar un clip entero. El PNG vive en memoria (Blob URL) hasta que se
 * descarga o se descarta; nunca sale del navegador. No interfiere con una
 * grabación de vídeo en curso: dibuja en su propio canvas, independiente del
 * de `useRecorder`.
 */
export function useSnapshot({
  videoRef,
  mirrored,
  platform,
  filter,
  lightBoost,
}: UseSnapshotOptions): UseSnapshotResult {
  const [result, setResult] = useState<SnapshotResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultUrlRef = useRef<string | null>(null);

  const discard = useCallback(() => {
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    resultUrlRef.current = null;
    setResult(null);
    setError(null);
  }, []);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setError("La cámara todavía no está lista.");
      return;
    }

    const crop = computeCropRect(
      video.videoWidth / video.videoHeight,
      PLATFORMS[platform].aspect,
    );
    const cropWidthPx = video.videoWidth * crop.width;
    const cropHeightPx = video.videoHeight * crop.height;
    const { width, height } = computeOutputSize(cropWidthPx, cropHeightPx);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      setError("No se pudo preparar el lienzo de la foto.");
      return;
    }

    context.save();
    context.filter = composeFilterCss(filter, lightBoost) || "none";
    if (mirrored) {
      context.translate(width, 0);
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
      width,
      height,
    );
    context.restore();

    canvas.toBlob((blob) => {
      if (!blob) {
        setError("No se pudo generar la foto.");
        return;
      }
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = URL.createObjectURL(blob);
      setError(null);
      setResult({
        url: resultUrlRef.current,
        blob,
        fileName: `directorscene-${platform}-${Date.now()}.png`,
        sizeBytes: blob.size,
      });
    }, "image/png");
  }, [filter, lightBoost, mirrored, platform, videoRef]);

  useEffect(
    () => () => {
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    },
    [],
  );

  return { result, error, capture, discard };
}
