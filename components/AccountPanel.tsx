"use client";

import { useState } from "react";

import type { UseSupabaseSessionResult } from "@/lib/hooks/useSupabaseSession";

/**
 * Alta y cierre de sesión con enlace mágico. La cuenta solo sirve para
 * sincronizar presets entre dispositivos: la app funciona igual sin ella.
 */
export function AccountPanel({ auth }: { auth: UseSupabaseSessionResult }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!auth.configured) {
    return (
      <p className="text-xs leading-relaxed text-white/50">
        Modo local: los presets se guardan en este navegador. Configura
        <code className="mx-1 rounded bg-white/10 px-1">NEXT_PUBLIC_SUPABASE_URL</code>
        y la clave anónima para sincronizarlos entre dispositivos.
      </p>
    );
  }

  if (auth.loading) {
    return <p className="text-xs text-white/50">Comprobando sesión…</p>;
  }

  if (auth.session) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-xs text-white/60">
          {auth.session.user.email ?? "Sesión iniciada"}
        </p>
        <button
          type="button"
          onClick={() => void auth.signOut()}
          className="shrink-0 rounded-full border border-white/15 px-3 py-1 text-[11px] text-white/70 transition hover:border-white/40 hover:text-white"
        >
          Cerrar sesión
        </button>
      </div>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;

    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      await auth.signIn(email.trim());
      setStatus("Te hemos enviado un enlace de acceso. Revisa tu correo.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo enviar el enlace.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label htmlFor="account-email" className="text-[11px] text-white/50">
        Entra con tu correo para guardar presets en la nube
      </label>
      <div className="flex gap-2">
        <input
          id="account-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="tu@correo.com"
          className="min-w-0 flex-1 rounded-full border border-white/15 bg-transparent px-3 py-1.5 text-xs outline-none placeholder:text-white/30 focus:border-white/40"
        />
        <button
          type="submit"
          disabled={busy}
          className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-white/85 disabled:opacity-50"
        >
          {busy ? "Enviando…" : "Enviar enlace"}
        </button>
      </div>
      {status ? <p className="text-[11px] text-emerald-300">{status}</p> : null}
      {error ? <p className="text-[11px] text-rose-300">{error}</p> : null}
    </form>
  );
}
