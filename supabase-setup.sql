-- ── Tómbola del Ajolotl · setup de Supabase ──
-- Pega TODO este archivo en: Dashboard → SQL Editor → New query → Run

-- Tabla de resultados: un renglón por partido decidido
create table public.resultados (
  match_id text primary key,
  winner text not null,
  marcador text, -- p. ej. "2-1", "1-1 (pen 4-2)", "2-1 (t. extra)"
  detalle jsonb, -- snapshot completo: goles (goleador y minuto), cómo terminó
  updated_at timestamptz not null default now()
);

-- Si la tabla ya existía sin estas columnas, estos ALTER las agregan
alter table public.resultados add column if not exists marcador text;
alter table public.resultados add column if not exists detalle jsonb;

-- match_id solo puede ser una llave real del bracket (15 partidos) y winner
-- solo puede ser uno de los 16 equipos clasificados. Blindaje contra scripts
-- que descubran la anon key y quieran meter basura en la tabla.
alter table public.resultados
  drop constraint if exists resultados_match_id_valido,
  add constraint resultados_match_id_valido check (
    match_id in (
      'o1','o2','o3','o4','o5','o6','o7','o8',
      'q1','q2','q3','q4',
      's1','s2',
      'f1'
    )
  );
alter table public.resultados
  drop constraint if exists resultados_winner_valido,
  add constraint resultados_winner_valido check (
    winner in (
      'par','fra','can','mar','por','esp','usa','bel',
      'bra','nor','mex','eng','arg','egy','sui','col'
    )
  );

-- Cualquiera con el link de la app puede leer y escribir (es una app entre
-- amigos). Los CHECK de arriba filtran filas basura; las políticas siguen
-- abiertas para no meter fricción entre los 8 jugadores.
alter table public.resultados enable row level security;
drop policy if exists "leer" on public.resultados;
drop policy if exists "insertar" on public.resultados;
drop policy if exists "actualizar" on public.resultados;
drop policy if exists "borrar" on public.resultados;
create policy "leer" on public.resultados for select using (true);
create policy "insertar" on public.resultados for insert with check (true);
create policy "actualizar" on public.resultados for update using (true);
create policy "borrar" on public.resultados for delete using (true);

-- Habilitar realtime: los cambios se transmiten a todos los teléfonos al instante
alter publication supabase_realtime add table public.resultados;
