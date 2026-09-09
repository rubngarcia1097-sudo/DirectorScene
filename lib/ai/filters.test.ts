import assert from "node:assert/strict";
import { test } from "vitest";

import {
  FILTER_PRESETS,
  buildLightAdjustmentCss,
  composeFilterCss,
} from "./filters";

test("el preset 'Ninguno' no aplica ningún filtro", () => {
  assert.equal(FILTER_PRESETS.none.css, "");
});

test("cada preset con color trae una cadena CSS no vacía", () => {
  for (const id of ["warm", "cool", "bw", "vivid"] as const) {
    assert.ok(FILTER_PRESETS[id].css.length > 0, `${id} sin filtro CSS`);
  }
});

test("el ajuste de luz en 0 no genera filtro (no toca la imagen)", () => {
  assert.equal(buildLightAdjustmentCss(0), "");
});

test("un ajuste positivo sube el brillo; uno negativo lo baja", () => {
  const brighter = buildLightAdjustmentCss(0.5);
  const darker = buildLightAdjustmentCss(-0.5);
  assert.match(brighter, /brightness\(1\.\d+\)/);
  assert.match(darker, /brightness\(0\.\d+\)/);
});

test("el ajuste de luz se recorta a [-1, 1]", () => {
  assert.equal(buildLightAdjustmentCss(5), buildLightAdjustmentCss(1));
  assert.equal(buildLightAdjustmentCss(-5), buildLightAdjustmentCss(-1));
});

test("composeFilterCss combina el look y el ajuste de luz", () => {
  const composed = composeFilterCss("bw", 0.4);
  assert.match(composed, /grayscale/);
  assert.match(composed, /brightness/);
});

test("composeFilterCss sin ajuste de luz no añade nada de más", () => {
  assert.equal(composeFilterCss("none", 0), "");
  assert.equal(composeFilterCss("vivid", 0), FILTER_PRESETS.vivid.css);
});
