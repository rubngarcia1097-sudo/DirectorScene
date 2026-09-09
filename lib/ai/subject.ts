import { POSE } from "./mediapipe";
import type { BoundingBox, Point2, SubjectMetrics } from "./types";

/** Landmark normalizado tal y como lo entrega MediaPipe. */
export interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export const EMPTY_SUBJECT: SubjectMetrics = {
  present: false,
  box: null,
  center: null,
  eyeLine: null,
  headTop: null,
  fill: 0,
  shoulderTiltDeg: null,
  turn: null,
  confidence: 0,
};

const MIN_VISIBILITY = 0.5;

/**
 * Convierte landmarks de pose (y opcionalmente de rostro) en métricas de
 * encuadre. Trabaja en "espacio de pantalla": si la vista está espejada, los
 * puntos ya vienen invertidos, de modo que "izquierda" significa lo mismo para
 * el motor de reglas y para quien está delante de la cámara.
 */
export function extractSubject(
  poseLandmarks: Landmark[] | undefined,
  faceLandmarks: Landmark[] | undefined,
): SubjectMetrics {
  const visible = (poseLandmarks ?? []).filter(
    (point) => (point.visibility ?? 1) >= MIN_VISIBILITY,
  );

  const hasPose = visible.length >= 4;
  const hasFace = (faceLandmarks?.length ?? 0) > 0;

  if (!hasPose && !hasFace) return EMPTY_SUBJECT;

  const points = hasPose ? visible : (faceLandmarks as Landmark[]);
  const box = boundingBox(points);
  if (!box) return EMPTY_SUBJECT;

  const eyeLine = resolveEyeLine(poseLandmarks, faceLandmarks);
  const headTop = resolveHeadTop(poseLandmarks, faceLandmarks, box, eyeLine);

  const confidence = hasPose
    ? average(visible.map((point) => point.visibility ?? 1))
    : 0.9;

  return {
    present: true,
    box,
    center: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    eyeLine,
    headTop,
    // El "fill" mide cuánto del alto del frame ocupa el sujeto: es el proxy de
    // distancia a cámara más estable que tenemos sin profundidad real.
    fill: clamp01(box.height),
    shoulderTiltDeg: resolveShoulderTilt(poseLandmarks),
    turn: resolveTurn(poseLandmarks),
    confidence,
  };
}

function boundingBox(points: Landmark[]): BoundingBox | null {
  if (points.length === 0) return null;

  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  };
}

function resolveEyeLine(
  pose: Landmark[] | undefined,
  face: Landmark[] | undefined,
): Point2 | null {
  // Los índices 33 y 263 son las comisuras externas de los ojos en el malla facial.
  if (face && face.length > 263) {
    return midpoint(face[33], face[263]);
  }

  if (pose && pose.length > POSE.rightEye) {
    const left = pose[POSE.leftEye];
    const right = pose[POSE.rightEye];
    if (isVisible(left) && isVisible(right)) return midpoint(left, right);
  }

  return null;
}

function resolveHeadTop(
  pose: Landmark[] | undefined,
  face: Landmark[] | undefined,
  box: BoundingBox,
  eyeLine: Point2 | null,
): number | null {
  // El índice 10 de la malla facial es la frente alta; le restamos el hueco
  // hasta la coronilla, que la malla no cubre.
  if (face && face.length > 10) return Math.max(0, face[10].y - 0.03);

  if (eyeLine && pose && isVisible(pose[POSE.leftShoulder])) {
    const shoulderY = pose[POSE.leftShoulder].y;
    const headHeight = Math.abs(shoulderY - eyeLine.y);
    return Math.max(0, eyeLine.y - headHeight * 0.9);
  }

  return box.y;
}

/**
 * Inclinación de la línea de hombros en grados, medida en pantalla (no según
 * qué hombro es cuál), para que el resultado no dependa del espejado.
 */
function resolveShoulderTilt(pose: Landmark[] | undefined): number | null {
  if (!pose || pose.length <= POSE.rightShoulder) return null;

  const a = pose[POSE.leftShoulder];
  const b = pose[POSE.rightShoulder];
  if (!isVisible(a) || !isVisible(b)) return null;

  const [start, end] = a.x <= b.x ? [a, b] : [b, a];
  const dx = end.x - start.x;
  if (Math.abs(dx) < 1e-4) return null;

  return (Math.atan2(end.y - start.y, dx) * 180) / Math.PI;
}

/** 0 = frontal, 1 = perfil. Se estima por el acortamiento de los hombros. */
function resolveTurn(pose: Landmark[] | undefined): number | null {
  if (!pose || pose.length <= POSE.rightShoulder) return null;

  const left = pose[POSE.leftShoulder];
  const right = pose[POSE.rightShoulder];
  if (!isVisible(left) || !isVisible(right)) return null;

  const width = Math.hypot(right.x - left.x, right.y - left.y);
  const reference = 0.28; // ancho típico de hombros de frente en plano medio
  return clamp01(1 - width / reference);
}

function midpoint(a: Landmark, b: Landmark): Point2 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function isVisible(point: Landmark | undefined): point is Landmark {
  return !!point && (point.visibility ?? 1) >= MIN_VISIBILITY;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
