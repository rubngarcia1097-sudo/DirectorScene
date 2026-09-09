/**
 * Wrapper de MediaPipe Tasks Vision.
 *
 * Todo corre en el navegador (WebAssembly/WebGL). Este módulo solo se importa
 * de forma dinámica desde componentes cliente: el bundle de WASM no debe
 * llegar nunca al servidor.
 */
import type {
  FaceLandmarker,
  FaceLandmarkerResult,
  PoseLandmarker,
  PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";

/**
 * Los binarios de WASM se copian a `public/mediapipe/wasm` con
 * `scripts/copy-mediapipe-wasm.mjs` (se ejecuta en `postinstall`), así que la
 * app no depende de una CDN externa en runtime.
 */
const WASM_PATH = "/mediapipe/wasm";

/**
 * Los modelos `.task` pesan varios MB y no se versionan en el repo. Por defecto
 * se descargan del bucket público de Google; se pueden servir desde otro origen
 * definiendo las variables de entorno.
 */
const POSE_MODEL_URL =
  process.env.NEXT_PUBLIC_POSE_MODEL_URL ??
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

const FACE_MODEL_URL =
  process.env.NEXT_PUBLIC_FACE_MODEL_URL ??
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export interface VisionEngine {
  pose: PoseLandmarker;
  face: FaceLandmarker;
  close: () => void;
}

export type { FaceLandmarkerResult, PoseLandmarkerResult };

let enginePromise: Promise<VisionEngine> | null = null;

/**
 * Crea (una sola vez por pestaña) los detectores de pose y rostro en modo VIDEO.
 * Las llamadas concurrentes comparten la misma promesa.
 */
export function loadVisionEngine(): Promise<VisionEngine> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("loadVisionEngine solo corre en el navegador"));
  }

  enginePromise ??= createEngine().catch((error) => {
    // Si falla la carga permitimos reintentar en la siguiente llamada.
    enginePromise = null;
    throw error;
  });

  return enginePromise;
}

async function createEngine(): Promise<VisionEngine> {
  const { FilesetResolver, FaceLandmarker, PoseLandmarker } = await import(
    "@mediapipe/tasks-vision"
  );

  const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);

  const [pose, face] = await Promise.all([
    PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: "GPU" },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputSegmentationMasks: false,
    }),
    FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate: "GPU" },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    }),
  ]);

  return {
    pose,
    face,
    close: () => {
      pose.close();
      face.close();
      enginePromise = null;
    },
  };
}

/** Índices de landmarks de pose que usa el motor de reglas. */
export const POSE = {
  nose: 0,
  leftEye: 2,
  rightEye: 5,
  leftEar: 7,
  rightEar: 8,
  leftShoulder: 11,
  rightShoulder: 12,
  leftHip: 23,
  rightHip: 24,
} as const;
