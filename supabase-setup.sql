-- ── Tómbola del Ajolotl · setup de Supabase ──
-- Pega TODO este archivo en: Dashboard → SQL Editor → New query → Run

-- Tabla de resultados: un renglón por partido decidido
create table public.resultados (
  match_id text primary key,
  winner text not null,
  marcador text, -- p. ej. "2-1", "1-1 (pen 4-2)", "2-1 (t. extra)"
  updated_at timestamptz not null default now()
);

-- Si la tabla ya existía sin la columna marcador, este ALTER la agrega
alter table public.resultados add column if not exists marcador text;

-- Cualquiera con el link de la app puede leer y escribir (es una app entre amigos)
alter table public.resultados enable row level security;
create policy "leer" on public.resultados for select using (true);
create policy "insertar" on public.resultados for insert with check (true);
create policy "actualizar" on public.resultados for update using (true);
create policy "borrar" on public.resultados for delete using (true);

-- Habilitar realtime: los cambios se transmiten a todos los teléfonos al instante
alter publication supabase_realtime add table public.resultados;
