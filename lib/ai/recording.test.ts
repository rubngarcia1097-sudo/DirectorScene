import assert from "node:assert/strict";
import { test } from "vitest";

import { computeOutputSize } from "./recording";

test("no amplía un recorte que ya cabe en el máximo", () => {
  const size = computeOutputSize(400, 700, 1080);
  assert.deepEqual(size, { width: 400, height: 700 });
});

test("reduce proporcionalmente cuando el lado largo supera el máximo", () => {
  const size = computeOutputSize(1080, 1920, 1080);
  assert.equal(size.height, 1080);
  // El ancho mantiene la proporción original (1080/1920).
  assert.ok(Math.abs(size.width - 1080 * (1080 / 1920)) <= 1);
});

test("las dimensiones de salida siempre son pares", () => {
  const size = computeOutputSize(401, 703, 1080);
  assert.equal(size.width % 2, 0);
  assert.equal(size.height % 2, 0);
});

test("nunca devuelve menos de 2px por lado", () => {
  const size = computeOutputSize(1, 1, 1080);
  assert.ok(size.width >= 2);
  assert.ok(size.height >= 2);
});
