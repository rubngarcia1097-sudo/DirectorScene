#!/usr/bin/env node
/**
 * Descarga los modelos .task de MediaPipe a public/mediapipe/models.
 *
 * Opcional: por defecto la app los carga del bucket público de Google. Ejecuta
 * este script (`npm run fetch:models`) y apunta NEXT_PUBLIC_POSE_MODEL_URL /
 * NEXT_PUBLIC_FACE_MODEL_URL a /mediapipe/models/... para servirlos desde tu
 * propio origen: útil sin conexión, con CSP estricta o para no depender de un
 * tercero en producción. Los modelos no se versionan en el repo.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const MODELS = [
  {
    name: "pose_landmarker_lite.task",
    url: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
  },
  {
    name: "face_landmarker.task",
    url: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
  },
];

const target = join(process.cwd(), "public", "mediapipe", "models");
await mkdir(target, { recursive: true });

for (const model of MODELS) {
  const response = await fetch(model.url);
  if (!response.ok) {
    throw new Error(`${model.name}: HTTP ${response.status}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(join(target, model.name), bytes);
  console.log(`[mediapipe] ${model.name} (${(bytes.length / 1e6).toFixed(1)} MB)`);
}

console.log(`[mediapipe] modelos en ${target}`);
