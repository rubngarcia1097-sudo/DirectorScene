import assert from "node:assert/strict";
import { test } from "vitest";

import { EMPTY_SPEECH_STATE, MIN_GAP_MS, REPEAT_MS, selectSpeech } from "./voice";
import type { Suggestion } from "./types";

const aviso = (id: string, severity: Suggestion["severity"] = "info"): Suggestion => ({
  id,
  category: "encuadre",
  severity,
  message: `mensaje ${id}`,
});

test("dicta la sugerencia más grave, no la primera", () => {
  const { say } = selectSpeech({
    suggestions: [aviso("a", "info"), aviso("b", "warn")],
    state: EMPTY_SPEECH_STATE,
    now: 10_000,
    speaking: false,
  });
  assert.equal(say, "mensaje b");
});

test("no habla mientras el sintetizador sigue hablando", () => {
  const { say } = selectSpeech({
    suggestions: [aviso("a")],
    state: EMPTY_SPEECH_STATE,
    now: 10_000,
    speaking: true,
  });
  assert.equal(say, null);
});

test("no repite la misma instrucción hasta pasado el intervalo", () => {
  const state = { lastId: "a", lastAt: 10_000 };

  assert.equal(
    selectSpeech({
      suggestions: [aviso("a")],
      state,
      now: 10_000 + REPEAT_MS - 1,
      speaking: false,
    }).say,
    null,
  );

  assert.equal(
    selectSpeech({
      suggestions: [aviso("a")],
      state,
      now: 10_000 + REPEAT_MS,
      speaking: false,
    }).say,
    "mensaje a",
  );
});

test("respeta un silencio mínimo entre instrucciones distintas", () => {
  const state = { lastId: "a", lastAt: 10_000 };

  assert.equal(
    selectSpeech({
      suggestions: [aviso("b")],
      state,
      now: 10_000 + MIN_GAP_MS - 1,
      speaking: false,
    }).say,
    null,
  );

  const decision = selectSpeech({
    suggestions: [aviso("b")],
    state,
    now: 10_000 + MIN_GAP_MS,
    speaking: false,
  });
  assert.equal(decision.say, "mensaje b");
  assert.deepEqual(decision.state, { lastId: "b", lastAt: 10_000 + MIN_GAP_MS });
});

test("confirma una sola vez que la toma está bien", () => {
  const primera = selectSpeech({
    suggestions: [],
    state: { lastId: "a", lastAt: 0 },
    now: 10_000,
    speaking: false,
  });
  assert.equal(primera.say, "Así está bien");

  // Con el encuadre ya correcto no vuelve a insistir.
  assert.equal(
    selectSpeech({
      suggestions: [],
      state: primera.state,
      now: 10_000 + REPEAT_MS * 3,
      speaking: false,
    }).say,
    null,
  );
});
