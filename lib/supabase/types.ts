import type { DirectorSettings } from "@/lib/ai/presets";

/**
 * Forma de la tabla `presets`. Solo viajan preferencias: ni frames, ni audio,
 * ni métricas del sujeto. El SQL equivalente está en `supabase/schema.sql`.
 */
export interface PresetRow {
  id: string;
  user_id: string;
  name: string;
  settings: DirectorSettings;
  created_at: string;
}

/** Columnas que devuelven las queries de la app. */
export type PresetSelection = Pick<PresetRow, "id" | "name" | "settings">;
