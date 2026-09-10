"use client";

import { useEffect, useRef } from "react";

import { computeCropRect } from "@/lib/ai/crop";
import { COMPOSITIONS, PLATFORMS } from "@/lib/ai/presets";
import type { DirectorSettings } from "@/lib/ai/presets";
import type { Landmark } from "@/lib/ai/subject";
import type { BoundingBox, SubjectMetrics } from "@/lib/ai/types";

const SKELETON: Array<[number, number]> = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
];

interface GuideOverlayProps {
  settings: DirectorSettings;
  videoAspect: number;
  subject: SubjectMetrics | null;
  poseLandmarks: Landmark[] | null;
}

/**
 * Guías de encuadre dibujadas sobre el vídeo: recorte de entrega, regla de
 * tercios, zona segura de la plataforma y caja del sujeto.
 */
export function GuideOverlay({
  settings,
  videoAspect,
  subject,
  poseLandmarks,
}: GuideOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);

    const platform = PLATFORMS[settings.platform];
    const crop = computeCropRect(videoAspect, platform.aspect);

    // Coordenadas del recorte en píxeles del canvas.
    const rect = {
      x: crop.x * width,
      y: crop.y * height,
      width: crop.width * width,
      height: crop.height * height,
    };

    drawOutsideCrop(context, rect, width, height);
    drawCropBorder(context, rect, platform.aspectLabel);

    if (settings.showSafeArea) drawSafeArea(context, rect, platform.safeArea);
    if (settings.showGrid) drawThirds(context, rect);

    drawCompositionTarget(context, rect, COMPOSITIONS[settings.composition].targetX);

    if (settings.showSkeleton && poseLandmarks) {
      drawSkeleton(context, rect, poseLandmarks);
    }

    if (subject?.present && subject.box) {
      drawSubject(context, rect, subject.box, subject.headTop);
    }
  }, [poseLandmarks, settings, subject, videoAspect]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}

type Rect = { x: number; y: number; width: number; height: number };

/** Oscurece lo que quedará fuera del recorte de entrega. */
function drawOutsideCrop(
  context: CanvasRenderingContext2D,
  rect: Rect,
  width: number,
  height: number,
) {
  context.save();
  context.fillStyle = "rgba(0, 0, 0, 0.55)";
  context.beginPath();
  context.rect(0, 0, width, height);
  context.rect(rect.x, rect.y, rect.width, rect.height);
  context.fill("evenodd");
  context.restore();
}

function drawCropBorder(
  context: CanvasRenderingContext2D,
  rect: Rect,
  label: string,
) {
  context.save();
  context.strokeStyle = "rgba(255, 255, 255, 0.8)";
  context.lineWidth = 2;
  context.strokeRect(rect.x, rect.y, rect.width, rect.height);

  context.fillStyle = "rgba(255, 255, 255, 0.85)";
  context.font = "600 12px system-ui, sans-serif";
  // Abajo, no arriba: el carrusel de filtros ocupa la esquina superior del
  // recorte cuando la cámara está encendida.
  context.fillText(label, rect.x + 8, rect.y + rect.height - 10);
  context.restore();
}

function drawThirds(context: CanvasRenderingContext2D, rect: Rect) {
  context.save();
  context.strokeStyle = "rgba(255, 255, 255, 0.35)";
  context.lineWidth = 1;
  context.beginPath();
  for (let i = 1; i < 3; i += 1) {
    const x = rect.x + (rect.width * i) / 3;
    const y = rect.y + (rect.height * i) / 3;
    context.moveTo(x, rect.y);
    context.lineTo(x, rect.y + rect.height);
    context.moveTo(rect.x, y);
    context.lineTo(rect.x + rect.width, y);
  }
  context.stroke();
  context.restore();
}

function drawSafeArea(
  context: CanvasRenderingContext2D,
  rect: Rect,
  safe: { top: number; bottom: number; left: number; right: number },
) {
  const inner = {
    x: rect.x + safe.left * rect.width,
    y: rect.y + safe.top * rect.height,
    width: rect.width * (1 - safe.left - safe.right),
    height: rect.height * (1 - safe.top - safe.bottom),
  };

  context.save();
  context.strokeStyle = "rgba(250, 204, 21, 0.7)";
  context.setLineDash([6, 6]);
  context.lineWidth = 1.5;
  context.strokeRect(inner.x, inner.y, inner.width, inner.height);
  context.restore();
}

function drawCompositionTarget(
  context: CanvasRenderingContext2D,
  rect: Rect,
  targetX: number,
) {
  const x = rect.x + targetX * rect.width;
  context.save();
  context.strokeStyle = "rgba(56, 189, 248, 0.85)";
  context.lineWidth = 2;
  context.setLineDash([2, 8]);
  context.beginPath();
  context.moveTo(x, rect.y);
  context.lineTo(x, rect.y + rect.height);
  context.stroke();
  context.restore();
}

function drawSubject(
  context: CanvasRenderingContext2D,
  rect: Rect,
  box: BoundingBox,
  headTop: number | null,
) {
  const x = rect.x + box.x * rect.width;
  const y = rect.y + box.y * rect.height;
  const width = box.width * rect.width;
  const height = box.height * rect.height;

  context.save();
  context.strokeStyle = "rgba(34, 197, 94, 0.9)";
  context.lineWidth = 2;
  context.strokeRect(x, y, width, height);

  if (headTop !== null) {
    const headY = rect.y + headTop * rect.height;
    context.strokeStyle = "rgba(34, 197, 94, 0.6)";
    context.setLineDash([4, 4]);
    context.beginPath();
    context.moveTo(rect.x, headY);
    context.lineTo(rect.x + rect.width, headY);
    context.stroke();
  }
  context.restore();
}

function drawSkeleton(
  context: CanvasRenderingContext2D,
  rect: Rect,
  landmarks: Landmark[],
) {
  context.save();
  context.strokeStyle = "rgba(244, 114, 182, 0.8)";
  context.fillStyle = "rgba(244, 114, 182, 0.9)";
  context.lineWidth = 2;

  for (const [from, to] of SKELETON) {
    const a = landmarks[from];
    const b = landmarks[to];
    if (!a || !b) continue;
    if ((a.visibility ?? 1) < 0.5 || (b.visibility ?? 1) < 0.5) continue;

    context.beginPath();
    context.moveTo(rect.x + a.x * rect.width, rect.y + a.y * rect.height);
    context.lineTo(rect.x + b.x * rect.width, rect.y + b.y * rect.height);
    context.stroke();
  }

  for (const point of landmarks) {
    if ((point.visibility ?? 1) < 0.5) continue;
    context.beginPath();
    context.arc(
      rect.x + point.x * rect.width,
      rect.y + point.y * rect.height,
      2.5,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  context.restore();
}
