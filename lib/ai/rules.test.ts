import assert from "node:assert/strict";
import { test } from "vitest";

import { computeCropRect } from "./crop";
import { SuggestionStabilizer } from "./engine";
import { evaluateFraming } from "./framing";
import { LightingBaseline, analyzeLighting, evaluateLighting, scoreShot } from "./lighting";
import type { LightingMetrics } from "./types";
import { PLATFORMS, SHOT_STYLE_LIST } from "./presets";
import { extractSubject } from "./subject";
import type { Landmark } from "./subject";
import type { SubjectMetrics } from "./types";

/**
 * Los tests cubren el motor de dirección, que es la parte con reglas de
 * negocio. Se ejecutan con el type-stripping nativo de Node: `npm test`.
 */

function subject(overrides: Partial<SubjectMetrics> = {}): SubjectMetrics {
  return {
    present: true,
    box: { x: 0.25, y: 0.1, width: 0.5, height: 0.7 },
    center: { x: 0.5, y: 0.45 },
    eyeLine: { x: 0.5, y: 0.3 },
    headTop: 0.1,
    fill: 0.7,
    shoulderTiltDeg: 0,
    turn: 0.1,
    confidence: 0.9,
    ...overrides,
  };
}

const ids = (list: { id: string }[]) => list.map((item) => item.id);

test("un sujeto bien encuadrado no genera sugerencias", () => {
  const result = evaluateFraming(subject(), {
    platform: "tiktok",
    composition: "center",
    shotStyle: "talking-head",
    mirrored: true,
  });
  assert.deepEqual(ids(result), []);
});

test("sin sujeto avisa de que no hay nadie en cuadro", () => {
  const result = evaluateFraming(
    { ...subject(), present: false, box: null, center: null },
    { platform: "tiktok", composition: "center", shotStyle: "talking-head", mirrored: true },
  );
  assert.deepEqual(ids(result), ["subject-missing"]);
});

test("el mensaje horizontal cambia según el espejado", () => {
  const off = subject({ center: { x: 0.75, y: 0.45 } });

  const [espejado] = evaluateFraming(off, {
    platform: "tiktok",
    composition: "center",
    shotStyle: "talking-head",
    mirrored: true,
  });
  assert.equal(espejado.id, "framing-horizontal");
  assert.match(espejado.message, /tu izquierda/);

  const [directo] = evaluateFraming(off, {
    platform: "tiktok",
    composition: "center",
    shotStyle: "talking-head",
    mirrored: false,
  });
  assert.match(directo.message, /cámara a la derecha/);
});

test("la regla de tercios acepta al sujeto descentrado", () => {
  const tercio = subject({ center: { x: 1 / 3, y: 0.45 } });

  const centrado = evaluateFraming(tercio, {
    platform: "tiktok",
    composition: "center",
    shotStyle: "talking-head",
    mirrored: true,
  });
  assert.ok(ids(centrado).includes("framing-horizontal"));

  const tercios = evaluateFraming(tercio, {
    platform: "tiktok",
    composition: "thirds-left",
    shotStyle: "talking-head",
    mirrored: true,
  });
  assert.ok(!ids(tercios).includes("framing-horizontal"));
});

test("detecta demasiada distancia y cabeza cortada", () => {
  const lejos = evaluateFraming(
    subject({ fill: 0.2, box: { x: 0.4, y: 0.4, width: 0.2, height: 0.2 } }),
    { platform: "tiktok", composition: "center", shotStyle: "talking-head", mirrored: true },
  );
  assert.ok(ids(lejos).includes("framing-too-far"));

  const cortada = evaluateFraming(subject({ headTop: 0.005 }), {
    platform: "tiktok",
    composition: "center",
    shotStyle: "talking-head",
    mirrored: true,
  });
  assert.ok(ids(cortada).includes("framing-headroom-low"));
});

test("el estilo de plano cambia qué distancia se considera correcta", () => {
  // 0.5 de ocupación: demasiado lejos para "hablas a cámara" ([0.55, 0.85]),
  // pero justo el hueco que necesita "producto en mano" ([0.35, 0.65]) para
  // que quepan las manos y lo que se enseña.
  const sujeto = subject({ fill: 0.5 });

  const hablando = evaluateFraming(sujeto, {
    platform: "tiktok",
    composition: "center",
    shotStyle: "talking-head",
    mirrored: true,
  });
  assert.ok(ids(hablando).includes("framing-too-far"));

  const producto = evaluateFraming(sujeto, {
    platform: "tiktok",
    composition: "center",
    shotStyle: "product-demo",
    mirrored: true,
  });
  assert.ok(!ids(producto).includes("framing-too-far"));
});

test("avisa cuando el sujeto cae bajo los botones de la plataforma", () => {
  const result = evaluateFraming(subject({ center: { x: 0.9, y: 0.45 } }), {
    platform: "tiktok",
    composition: "center",
    shotStyle: "talking-head",
    mirrored: true,
  });
  assert.ok(ids(result).includes("framing-safe-right"));
});

test("extractSubject descarta landmarks poco visibles", () => {
  const puntos: Landmark[] = [
    { x: 0.4, y: 0.2, visibility: 0.9 },
    { x: 0.6, y: 0.6, visibility: 0.9 },
    { x: 0.5, y: 0.4, visibility: 0.9 },
    { x: 0.55, y: 0.5, visibility: 0.9 },
    { x: 0.01, y: 0.99, visibility: 0.1 }, // ruido: no debe ampliar la caja
  ];

  const metrics = extractSubject(puntos, undefined);
  assert.equal(metrics.present, true);
  assert.ok(metrics.box);
  assert.ok(Math.abs(metrics.box.x - 0.4) < 1e-9);
  assert.ok(Math.abs(metrics.box.height - 0.4) < 1e-9);
});

test("el recorte de entrega se ajusta a la relación de la plataforma", () => {
  // Webcam 16:9 grabando en vertical 9:16: solo se publica la franja central.
  const vertical = computeCropRect(16 / 9, 9 / 16);
  assert.ok(Math.abs(vertical.width - (9 / 16) / (16 / 9)) < 1e-9);
  assert.equal(vertical.height, 1);
  assert.ok(Math.abs(vertical.x - (1 - vertical.width) / 2) < 1e-9);

  // Cámara vertical grabando 16:9: se recorta arriba y abajo.
  const horizontal = computeCropRect(9 / 16, 16 / 9);
  assert.equal(horizontal.width, 1);
  assert.ok(horizontal.height < 1);
});

/** Construye un ImageData sintético: mitad izquierda y derecha con brillos dados. */
function frame(left: number, right: number, width = 8, height = 8): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const value = x < width / 2 ? left : right;
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 255;
    }
  }
  return { data, width, height, colorSpace: "srgb" } as ImageData;
}

test("el histograma detecta subexposición", () => {
  const metrics = analyzeLighting(frame(20, 20), null);
  assert.ok(metrics.brightness < 0.1);
  assert.ok(ids(evaluateLighting(metrics)).includes("light-dark"));
});

test("el histograma detecta luz lateral", () => {
  const metrics = analyzeLighting(frame(220, 60), null);
  assert.ok(metrics.sideBalance > 0.16);
  const [aviso] = evaluateLighting(metrics).filter((item) => item.id === "light-side");
  assert.match(aviso.message, /por la izquierda/);
});

test("el histograma detecta contraluz", () => {
  // Sujeto oscuro en el centro sobre fondo claro.
  const metrics = analyzeLighting(frame(230, 230), {
    x: 0.25,
    y: 0.25,
    width: 0.5,
    height: 0.5,
  });
  const darkSubject = analyzeLighting(
    (() => {
      const image = frame(230, 230, 8, 8);
      for (let y = 2; y < 6; y += 1) {
        for (let x = 2; x < 6; x += 1) {
          const index = (y * 8 + x) * 4;
          image.data[index] = 40;
          image.data[index + 1] = 40;
          image.data[index + 2] = 40;
        }
      }
      return image;
    })(),
    { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
  );

  assert.ok(metrics.subjectBrightness !== null);
  assert.ok(darkSubject.backgroundBrightness - darkSubject.subjectBrightness! > 0.18);
  assert.ok(ids(evaluateLighting(darkSubject)).includes("light-backlit"));
});

function lightingMetrics(overrides: Partial<LightingMetrics> = {}): LightingMetrics {
  return {
    brightness: 0.5,
    contrast: 0.3,
    clippedHighlights: 0,
    crushedShadows: 0,
    sideBalance: 0,
    subjectBrightness: 0.4,
    backgroundBrightness: 0.5,
    warmth: 0,
    ...overrides,
  };
}

test("sin baseline, el contraluz se exige contra el umbral fijo de estudio", () => {
  const leve = lightingMetrics({ backgroundBrightness: 0.6, subjectBrightness: 0.45 }); // gap 0.15
  const fuerte = lightingMetrics({ backgroundBrightness: 0.65, subjectBrightness: 0.4 }); // gap 0.25

  assert.ok(!ids(evaluateLighting(leve)).includes("light-backlit"));
  assert.ok(ids(evaluateLighting(fuerte)).includes("light-backlit"));
});

test("LightingBaseline deja de avisar cuando ya se está en el mejor contraluz que da el espacio", () => {
  const baseline = new LightingBaseline();
  // Un hueco de 0.25 es peor que el umbral fijo (0.18): sin adaptación,
  // avisaría en cada frame de toda la sesión aunque sea lo mejor que el
  // usuario puede lograr con la luz que tiene.
  const persistente = lightingMetrics({ backgroundBrightness: 0.65, subjectBrightness: 0.4 });

  const primero = evaluateLighting(persistente, baseline);
  assert.ok(ids(primero).includes("light-backlit"));

  // Tras observar el mismo hueco varias veces, el umbral se adapta a ese
  // "mejor logrado" (+ margen) y deja de avisar sobre lo que ya es su techo.
  let ultimo = primero;
  for (let i = 0; i < 5; i += 1) {
    ultimo = evaluateLighting(persistente, baseline);
  }
  assert.ok(!ids(ultimo).includes("light-backlit"));
});

test("LightingBaseline sigue avisando si el contraluz empeora respecto a lo ya logrado", () => {
  const baseline = new LightingBaseline();
  const logrado = lightingMetrics({ backgroundBrightness: 0.6, subjectBrightness: 0.4 }); // gap 0.2
  for (let i = 0; i < 5; i += 1) evaluateLighting(logrado, baseline);
  assert.ok(!ids(evaluateLighting(logrado, baseline)).includes("light-backlit"));

  const peor = lightingMetrics({ backgroundBrightness: 0.8, subjectBrightness: 0.3 }); // gap 0.5
  assert.ok(ids(evaluateLighting(peor, baseline)).includes("light-backlit"));
});

test("LightingBaseline nunca relaja el umbral por debajo del fijo cuando ya se cumple de sobra", () => {
  const baseline = new LightingBaseline();
  const buena = lightingMetrics({ backgroundBrightness: 0.5, subjectBrightness: 0.48 }); // gap 0.02
  for (let i = 0; i < 5; i += 1) evaluateLighting(buena, baseline);

  // Con la mejor luz posible ya muy por debajo del umbral fijo, un contraluz
  // que antes habría pasado desapercibido (0.2) debe seguir avisando: el
  // espacio del usuario demuestra que puede hacerlo mejor.
  const peorQueSuMejor = lightingMetrics({ backgroundBrightness: 0.6, subjectBrightness: 0.4 });
  assert.ok(ids(evaluateLighting(peorQueSuMejor, baseline)).includes("light-backlit"));
});

test("LightingBaseline ignora frames casi negros o quemados al aprender el mejor logrado", () => {
  const baseline = new LightingBaseline();
  // Frame degenerado: todo oscuro, el hueco es pequeño mecánicamente, no
  // porque la luz sea buena — no debería enseñarle nada al baseline.
  const degenerado = lightingMetrics({ brightness: 0.05, backgroundBrightness: 0.06, subjectBrightness: 0.04 });
  for (let i = 0; i < 5; i += 1) baseline.observe(degenerado);

  assert.equal(baseline.backlitThreshold(), 0.18);
});

test("la puntuación es 0 sin sujeto y baja con cada sugerencia", () => {
  const luz = analyzeLighting(frame(128, 128), null);

  assert.equal(scoreShot([], luz, false), 0);
  assert.ok(scoreShot([], luz, true) > 95);

  const conAviso = scoreShot(
    [{ id: "a", category: "encuadre", severity: "warn", message: "m" }],
    luz,
    true,
  );
  assert.ok(conAviso < scoreShot([], luz, true));
});

test("el estabilizador exige varios frames antes de mostrar y ocultar", () => {
  const stabilizer = new SuggestionStabilizer(3, 4);
  const candidate = [
    { id: "x", category: "encuadre" as const, severity: "info" as const, message: "m" },
  ];

  assert.deepEqual(ids(stabilizer.update(candidate)), []);
  assert.deepEqual(ids(stabilizer.update(candidate)), []);
  assert.deepEqual(ids(stabilizer.update(candidate)), ["x"]);

  // Desaparece de los candidatos: aguanta unos frames antes de irse.
  assert.deepEqual(ids(stabilizer.update([])), ["x"]);
  assert.deepEqual(ids(stabilizer.update([])), ["x"]);
  assert.deepEqual(ids(stabilizer.update([])), ["x"]);
  assert.deepEqual(ids(stabilizer.update([])), []);
});

test("los formatos cortos tienen tope de duración; YouTube normal no", () => {
  // Cifras de 2026 (ver comentario en presets.ts): Shorts y Reels graban en
  // la app hasta 3 min, TikTok hasta 10; YouTube largo no tiene techo.
  assert.equal(PLATFORMS.shorts.maxDurationSec, 180);
  assert.equal(PLATFORMS.reels.maxDurationSec, 180);
  assert.equal(PLATFORMS.tiktok.maxDurationSec, 600);
  assert.equal(PLATFORMS.youtube.maxDurationSec, null);

  for (const platform of Object.values(PLATFORMS)) {
    if (platform.maxDurationSec !== null) {
      assert.ok(platform.maxDurationSec > 0);
    }
  }
});

test("cada estilo de plano trae guía técnica de posición y luz, no solo cifras", () => {
  for (const style of SHOT_STYLE_LIST) {
    assert.ok(style.guide.position.length > 0, `${style.id} sin guía de posición`);
    assert.ok(style.guide.lighting.length > 0, `${style.id} sin guía de luz`);
  }
});
