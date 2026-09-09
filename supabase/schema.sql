-- Esquema mínimo de DirectorScene.
-- Solo se guardan preferencias de encuadre: ni vídeo, ni audio, ni métricas
-- del análisis. El vídeo nunca sale del navegador.

create table if not exists public.presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  settings jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists presets_user_id_created_at_idx
  on public.presets (user_id, created_at desc);

alter table public.presets enable row level security;

-- Cada usuario solo ve y modifica sus propios presets.
create policy "presets: leer los propios"
  on public.presets for select
  using (auth.uid() = user_id);

create policy "presets: crear los propios"
  on public.presets for insert
  with check (auth.uid() = user_id);

create policy "presets: actualizar los propios"
  on public.presets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "presets: borrar los propios"
  on public.presets for delete
  using (auth.uid() = user_id);
