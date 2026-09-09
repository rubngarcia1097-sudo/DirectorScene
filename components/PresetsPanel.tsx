"use client";

import { useEffect, useState } from "react";

import { PLATFORMS } from "@/lib/ai/presets";
import type { DirectorSettings } from "@/lib/ai/presets";
import { deletePreset, listPresets, savePreset } from "@/lib/supabase/presets";
import type { Preset } from "@/lib/supabase/presets";

interface PresetsPanelProps {
  settings: DirectorSettings;
  onApply: (settings: DirectorSettings) => void;
  /** Cambia al iniciar o cerrar sesión: obliga a recargar la lista. */
  sessionKey: string;
  /** true cuando los presets viven en Supabase y no en este navegador. */
  remote: boolean;
}

/** Presets guardados: nube si hay sesión, localStorage si no. */
export function PresetsPanel({
  settings,
  onApply,
  sessionKey,
  remote,
}: PresetsPanelProps) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Se incrementa tras guardar o borrar para releer la lista; así el efecto es
  // la única vía de carga y no hay dos escrituras compitiendo.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    listPresets()
      .then((rows) => {
        if (cancelled) return;
        setPresets(rows);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "No se pudieron cargar.");
      });

    return () => {
      cancelled = true;
    };
  }, [sessionKey, version]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const label = name.trim();
    if (!label) return;

    setBusy(true);
    try {
      await savePreset(label, settings);
      setName("");
      setVersion((current) => current + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      await deletePreset(id);
      setVersion((current) => current + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo borrar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={save} className="flex gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={60}
          placeholder="Nombre del preset"
          aria-label="Nombre del preset"
          className="min-w-0 flex-1 rounded-full border border-white/15 bg-transparent px-3 py-1.5 text-xs outline-none placeholder:text-white/30 focus:border-white/40"
        />
        <button
          type="submit"
          disabled={busy || name.trim().length === 0}
          className="shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:border-white/40 hover:text-white disabled:opacity-40"
        >
          Guardar ajustes
        </button>
      </form>

      {presets.length === 0 ? (
        <p className="text-[11px] text-white/40">
          Todavía no has guardado ningún preset.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {presets.map((preset) => (
            <li
              key={preset.id}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
            >
              <button
                type="button"
                onClick={() => onApply(preset.settings)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block truncate text-xs font-medium">
                  {preset.name}
                </span>
                <span className="block text-[10px] text-white/40">
                  {PLATFORMS[preset.settings.platform]?.label ?? "—"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => void remove(preset.id)}
                disabled={busy}
                aria-label={`Borrar ${preset.name}`}
                className="shrink-0 rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/50 transition hover:border-rose-400/50 hover:text-rose-200 disabled:opacity-40"
              >
                Borrar
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[10px] text-white/35">
        {remote
          ? "Sincronizados en tu cuenta."
          : "Guardados solo en este navegador."}
      </p>

      {error ? <p className="text-[11px] text-rose-300">{error}</p> : null}
    </div>
  );
}
