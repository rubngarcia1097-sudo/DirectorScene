import assert from "node:assert/strict";
import { test } from "vitest";

import {
  buildDeviceProfile,
  buildDeviceTips,
  classifyCameraSource,
  classifyCameraTier,
  classifyDeviceKind,
  recommendFrameRate,
} from "./device";
import type { CameraCapabilitySummary } from "./device";

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15";
const IPAD_UA =
  "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15";
const IPAD_SPOOFED_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15";
const MAC_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128.0";
const ANDROID_PHONE_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Chrome/128.0";
const ANDROID_TABLET_UA =
  "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 Chrome/128.0";
const WINDOWS_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0";

test("classifyDeviceKind: iPhone y Android con 'Mobile' son móviles", () => {
  assert.equal(classifyDeviceKind(IPHONE_UA, true), "mobile");
  assert.equal(classifyDeviceKind(ANDROID_PHONE_UA, true), "mobile");
});

test("classifyDeviceKind: iPad (explícito o suplantando Safari de escritorio) es tablet", () => {
  assert.equal(classifyDeviceKind(IPAD_UA, true), "tablet");
  assert.equal(classifyDeviceKind(IPAD_SPOOFED_UA, true), "tablet");
  // El mismo UA sin soporte táctil es un Mac real, no un iPad.
  assert.equal(classifyDeviceKind(IPAD_SPOOFED_UA, false), "desktop");
});

test("classifyDeviceKind: Android sin 'Mobile' es tablet; Windows es desktop", () => {
  assert.equal(classifyDeviceKind(ANDROID_TABLET_UA, true), "tablet");
  assert.equal(classifyDeviceKind(WINDOWS_UA, false), "desktop");
  assert.equal(classifyDeviceKind(MAC_UA, false), "desktop");
});

test("classifyCameraSource: en móvil solo importa la lente activa", () => {
  assert.equal(classifyCameraSource("mobile", "", "environment"), "movil-trasera");
  assert.equal(classifyCameraSource("mobile", "", "user"), "movil-frontal");
  assert.equal(classifyCameraSource("tablet", "", null), "movil-frontal");
});

test("classifyCameraSource: en escritorio se lee el label del dispositivo", () => {
  assert.equal(
    classifyCameraSource("desktop", "Logitech BRIO Ultra HD", null),
    "webcam-externa",
  );
  assert.equal(
    classifyCameraSource("desktop", "FaceTime HD Camera", null),
    "webcam-integrada",
  );
  assert.equal(
    classifyCameraSource("desktop", "USB2.0 Camera", null),
    "desconocida",
  );
});

function caps(overrides: Partial<CameraCapabilitySummary>): CameraCapabilitySummary {
  return {
    maxWidth: null,
    maxHeight: null,
    maxFrameRate: null,
    currentWidth: null,
    currentHeight: null,
    currentFrameRate: null,
    ...overrides,
  };
}

test("classifyCameraTier: umbrales por el lado largo del sensor", () => {
  assert.equal(classifyCameraTier(caps({ maxWidth: 3840, maxHeight: 2160 })), "premium");
  assert.equal(classifyCameraTier(caps({ maxWidth: 1920, maxHeight: 1080 })), "alta");
  assert.equal(classifyCameraTier(caps({ maxWidth: 1280, maxHeight: 720 })), "media");
  assert.equal(classifyCameraTier(caps({ maxWidth: 640, maxHeight: 480 })), "basica");
  assert.equal(classifyCameraTier(caps({})), "basica");
});

test("classifyCameraTier: recurre a currentWidth/Height si no hay capabilities", () => {
  assert.equal(
    classifyCameraTier(caps({ currentWidth: 1920, currentHeight: 1080 })),
    "alta",
  );
});

test("recommendFrameRate: nunca recomienda más de lo que la cámara entrega", () => {
  assert.equal(recommendFrameRate(caps({ currentFrameRate: 60 })), 60);
  assert.equal(recommendFrameRate(caps({ currentFrameRate: 59.94 })), 60);
  assert.equal(recommendFrameRate(caps({ currentFrameRate: 30 })), 30);
  assert.equal(recommendFrameRate(caps({ currentFrameRate: 24 })), 30);
  assert.equal(recommendFrameRate(caps({ currentFrameRate: 20 })), 20);
  assert.equal(recommendFrameRate(caps({ currentFrameRate: 10 })), 15);
  assert.equal(recommendFrameRate(caps({})), 30);
});

const ids = (tips: { id: string }[]) => tips.map((tip) => tip.id);

test("buildDeviceTips: cámara integrada de laptop trae el módulo completo", () => {
  const tips = buildDeviceTips({
    deviceKind: "desktop",
    sourceKind: "webcam-integrada",
    tier: "media",
  });
  assert.deepEqual(ids(tips), [
    "laptop-height",
    "laptop-distance",
    "laptop-orientation",
    "laptop-mic",
    "laptop-backlight",
  ]);
});

test("buildDeviceTips: móvil con cámara frontal y sensor básico", () => {
  const tips = buildDeviceTips({
    deviceKind: "mobile",
    sourceKind: "movil-frontal",
    tier: "basica",
  });
  assert.deepEqual(ids(tips), ["tier-basica", "mobile-hold", "mobile-front"]);
});

test("buildDeviceTips: escritorio sin marca reconocida sugiere marcar el módulo de laptop", () => {
  const tips = buildDeviceTips({
    deviceKind: "desktop",
    sourceKind: "desconocida",
    tier: "alta",
  });
  assert.deepEqual(ids(tips), ["desktop-unknown"]);
});

test("buildDeviceProfile: forceLaptopCamera activa el módulo aunque el label no lo delate", () => {
  const base = {
    deviceKind: "desktop" as const,
    label: "USB2.0 Camera",
    facingMode: null,
    capabilities: caps({ maxWidth: 1280, maxHeight: 720, currentFrameRate: 30 }),
  };

  const sinForzar = buildDeviceProfile(base);
  assert.equal(sinForzar.sourceKind, "desconocida");
  assert.deepEqual(ids(sinForzar.tips), ["desktop-unknown"]);

  const forzado = buildDeviceProfile({ ...base, forceLaptopCamera: true });
  assert.equal(forzado.sourceKind, "webcam-integrada");
  assert.ok(ids(forzado.tips).includes("laptop-height"));
  assert.equal(forzado.resolutionLabel, "HD (720p)");
  assert.equal(forzado.recommendedFrameRate, 30);
});
