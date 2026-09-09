"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export interface UseSupabaseSessionResult {
  session: Session | null;
  /** false cuando el proyecto no tiene credenciales: la app va en modo local. */
  configured: boolean;
  loading: boolean;
  /** Envía un enlace mágico al correo indicado. */
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

/**
 * Sesión de Supabase.
 *
 * La autenticación es opcional: sin credenciales configuradas devuelve
 * `configured: false` y el resto de la app sigue funcionando contra
 * localStorage.
 */
export function useSupabaseSession(): UseSupabaseSessionResult {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    let cancelled = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setResolved(true);
    });

    // Cubre login, logout y refresco de token, también desde otra pestaña.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setResolved(true);
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase no está configurado en este entorno.");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) throw new Error(error.message);
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  }, []);

  return {
    session,
    configured,
    loading: configured && !resolved,
    signIn,
    signOut,
  };
}
