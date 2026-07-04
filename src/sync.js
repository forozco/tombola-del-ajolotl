// ── Capa de sincronización con Supabase ──
// Con credenciales en .env la app trabaja en tiempo real entre todos;
// sin ellas, funciona en modo local (localStorage).

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && key ? createClient(url, key) : null
export const hasSupabase = Boolean(supabase)

export async function fetchResults() {
  // Intenta traer también el detalle (goles, marcador, cómo terminó); si la
  // columna aún no existe, cae a lo básico (ganador) sin romper
  let { data, error } = await supabase
    .from('resultados')
    .select('match_id, winner, marcador, detalle')
  if (error) {
    ;({ data, error } = await supabase.from('resultados').select('match_id, winner'))
    if (error) throw error
  }
  const results = {}
  const detalles = {}
  for (const r of data) {
    results[r.match_id] = r.winner
    if (r.detalle) detalles[r.match_id] = r.detalle
  }
  return { results, detalles }
}

export function subscribeResults(onChange) {
  const channel = supabase
    .channel('resultados-cambios')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'resultados' },
      (payload) => onChange(payload)
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}

// Guarda el registro completo del partido (ganador + marcador + detalle con
// los goles). Si alguna columna aún no existe en la tabla, va cayendo a una
// versión más simple para nunca perder al menos al ganador.
export async function saveResult(matchId, winner, marcador, detalle) {
  const intentos = [
    { match_id: matchId, winner, marcador, detalle },
    { match_id: matchId, winner, marcador },
    { match_id: matchId, winner },
  ]
  let last
  for (const fila of intentos) {
    // Omite claves undefined para no forzar columnas inexistentes
    const limpio = Object.fromEntries(Object.entries(fila).filter(([, v]) => v !== undefined))
    last = await supabase.from('resultados').upsert(limpio)
    if (!last.error) return last
  }
  return last
}

// Solo lo usa el modo admin de emergencia (?admin en la URL)
export function deleteResult(matchId) {
  return supabase.from('resultados').delete().eq('match_id', matchId)
}
