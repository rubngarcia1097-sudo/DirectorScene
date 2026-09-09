"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * Destino del enlace mágico de Supabase.
 *
 * Con el flujo PKCE la URL trae un `code` que hay que canjear por sesión; con
 * el flujo implícito el token viene en el hash y el cliente lo procesa solo.
 * Se lee `window.location` dentro del efecto para no necesitar `useSearchParams`
 * (que obligaría a envolver la página en un Suspense).
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    let cancelled = false;

    const finish = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const described = params.get("error_description");

      if (described) {
        if (!cancelled) setError(described);
        return;
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
          code,
        );
        if (exchangeError) {
          if (!cancelled) setError(exchangeError.message);
          return;
        }
      }

      if (!cancelled) router.replace("/director");
    };

    void finish();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const message = configured
    ? error
    : "Supabase no está configurado en este entorno.";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      {message ? (
        <>
          <p className="text-sm text-rose-300">{message}</p>
          <a href="/director" className="text-xs text-white/60 underline">
            Volver al estudio
          </a>
        </>
      ) : (
        <p className="text-sm text-white/60">Confirmando tu acceso…</p>
      )}
    </main>
  );
}
