"use client";

import type { DirectorSettings } from "@/lib/ai/presets";
import { getSupabaseClient } from "./client";
import type { PresetSelection } from "./types";

export interface Preset {
  id: string;
  name: string;
  settings: DirectorSettings;
}

/**
 * Presets del usuario. Mientras no haya Supabase configurado o sesión iniciada
 * se usa localStorage, así el flujo de grabación nunca depende de la red.
 */
const STORAGE_KEY = "directorscene.presets";

const COLUMNS = "id, name, settings";

export async function listPresets(): Promise<Preset[]> {
  const supabase = getSupabaseClient();
  const session = await supabase?.auth.getSession();

  if (!supabase || !session?.data.session) return readLocalPresets();

  const { data, error } = await supabase
    .from("presets")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .returns<PresetSelection[]>();

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function savePreset(
  name: string,
  settings: DirectorSettings,
): Promise<Preset> {
  const supabase = getSupabaseClient();
  const session = await supabase?.auth.getSession();
  const userId = session?.data.session?.user.id;

  if (!supabase || !userId) {
    const preset: Preset = { id: crypto.randomUUID(), name, settings };
    writeLocalPresets([preset, ...readLocalPresets()]);
    return preset;
  }

  const { data, error } = await supabase
    .from("presets")
    .insert({ name, settings, user_id: userId })
    .select(COLUMNS)
    .returns<PresetSelection[]>()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deletePreset(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const session = await supabase?.auth.getSession();

  if (!supabase || !session?.data.session) {
    writeLocalPresets(readLocalPresets().filter((preset) => preset.id !== id));
    return;
  }

  const { error } = await supabase.from("presets").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

function readLocalPresets(): Preset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Preset[]) : [];
  } catch {
    return [];
  }
}

function writeLocalPresets(presets: Preset[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // Modo privado sin almacenamiento: seguimos sin presets persistentes.
  }
}
