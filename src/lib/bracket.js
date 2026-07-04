// ── Lógica del cuadro: pura, sin React ──
// Resuelve quién ocupa cada lugar del bracket, quién ganó y quién quedó
// eliminado en cascada. Todo derivado de:
//  - MATCHES (data estática): estructura del torneo con slots
//  - results (map matchId → winnerTeamId): resultado guardado
//  - live (map pairKey → eventState): estado en vivo de ESPN
//  - detalles (map matchId → snapshot): resultado histórico persistido

import { MATCHES } from '../data.js'
import { pairKey } from '../live.js'
import { localDateStr, localTimeStr } from './dates.js'

export const MATCH_BY_ID = Object.fromEntries(MATCHES.map((m) => [m.id, m]))

// Resuelve quién ocupa un slot del cuadro (equipo fijo o el ganador del cruce
// del que se alimenta).
export function slotTeam(slot, results) {
  if (slot.team) return slot.team
  return matchWinner(slot.from, results)
}

// El ganador guardado solo cuenta si sigue siendo participante del partido.
// Blindaje contra data desfasada (p. ej. si se cambió el bracket sin borrar
// resultados viejos).
export function matchWinner(matchId, results) {
  const m = MATCH_BY_ID[matchId]
  const home = slotTeam(m.home, results)
  const away = slotTeam(m.away, results)
  const w = results[matchId]
  return w && (w === home || w === away) ? w : null
}

// Estado derivado principal de la app: cada partido resuelto con sus equipos,
// su ganador, su evento en vivo (o snapshot si ya terminó), horario efectivo
// y el conjunto de equipos eliminados en cascada.
export function computeBracket(results, live = {}, detalles = {}) {
  const resolved = MATCHES.map((m) => {
    const home = slotTeam(m.home, results)
    const away = slotTeam(m.away, results)
    const winner = matchWinner(m.id, results)
    // En vivo manda ESPN; si ya no lo sirve, usamos el snapshot guardado en
    // Supabase (goles, marcador, cómo terminó) para no perder nada.
    const evLive = home && away ? live[pairKey(home, away)] : null
    const ev = evLive ?? detalles[m.id] ?? null
    const utc = ev?.utc ?? m.utc
    return {
      ...m,
      homeTeam: home,
      awayTeam: away,
      winner,
      live: ev,
      tbd: m.tbd && !ev,
      utc, // horario efectivo: el oficial de ESPN si ya se conoce el cruce
      date: localDateStr(utc),
      time: localTimeStr(utc),
    }
  })
  const eliminated = new Set()
  for (const m of resolved) {
    if (m.winner) {
      eliminated.add(m.winner === m.homeTeam ? m.awayTeam : m.homeTeam)
    }
  }
  const champion = resolved.find((m) => m.id === 'f1')?.winner ?? null
  return { resolved, eliminated, champion }
}
