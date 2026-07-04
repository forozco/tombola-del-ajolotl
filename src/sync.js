// ── Capa de sincronización con Supabase ──
// Con credenciales en .env la app trabaja en tiempo real entre todos;
// sin ellas, funciona en modo local (localStorage).

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && key ? createClient(url, key) : null
export const hasSupabase = Boolean(supabase)

export async function fetchResults() {
  const { data, error } = await supabase.from('resultados').select('match_id, winner')
  if (error) throw error
  return Object.fromEntries(data.map((r) => [r.match_id, r.winner]))
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

// Guarda ganador y marcador final; si la columna marcador aún no existe
// en la tabla, reintenta guardando solo el ganador para no perder el registro
export async function saveResult(matchId, winner, marcador) {
  if (marcador) {
    const res = await supabase.from('resultados').upsert({ match_id: matchId, winner, marcador })
    if (!res.error) return res
  }
  return supabase.from('resultados').upsert({ match_id: matchId, winner })
}
