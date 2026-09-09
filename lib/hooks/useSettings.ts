"use client";

import { useCallback, useSyncExternalStore } from "react";

import { DEFAULT_SETTINGS } from "@/lib/ai/presets";
import type { DirectorSettings } from "@/lib/ai/presets";

const STORAGE_KEY = "directorscene.settings";

/**
 * Store mínimo sobre localStorage.
 *
 * Se usa `useSyncExternalStore` en vez de un efecto de hidratación: el servidor
 * renderiza los valores por defecto, el cliente los sustituye tras hidratar sin
 * disparar renders en cascada, y los cambios se propagan entre pestañas.
 */
let snapshot: DirectorSettings | null = null;
const listeners = new Set<() => void>();

function readStorage(): DirectorSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<DirectorSettings>) };
  } catch {
    // Ajustes corruptos o storage bloqueado: valores por defecto.
    return DEFAULT_SETTINGS;
  }
}

function getSnapshot(): DirectorSettings {
  // La referencia debe ser estable entre renders o React entra en bucle.
  snapshot ??= readStorage();
  return snapshot;
}

function getServerSnapshot(): DirectorSettings {
  return DEFAULT_SETTINGS;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    snapshot = readStorage();
    listeners.forEach((notify) => notify());
  };

  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function write(next: DirectorSettings): void {
  snapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Sin persistencia disponible; los ajustes duran lo que la sesión.
  }
  listeners.forEach((notify) => notify());
}

/** Ajustes del director, persistidos en el navegador. */
export function useSettings() {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setSettings = useCallback((next: DirectorSettings) => write(next), []);

  const update = useCallback(
    <K extends keyof DirectorSettings>(key: K, value: DirectorSettings[K]) => {
      write({ ...getSnapshot(), [key]: value });
    },
    [],
  );

  return { settings, setSettings, update };
}
