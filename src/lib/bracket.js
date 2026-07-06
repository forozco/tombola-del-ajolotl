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

// Delta mínimo entre kickoff de ESPN y kickoff hardcoded para considerarlo
// una reprogramación. Debajo del umbral es ruido (segundos, minutos por la
// forma que ESPN redondea). 15 min captura un retraso real (México 18:00 →
// 19:00 se ve; un ajuste de un par de minutos, no).
const RESCHEDULE_THRESHOLD_MS = 15 * 60_000

// Filtra un estado alterado según el estado actual del partido. Regla:
//  - delayed / postponed / rescheduled: solo tienen sentido antes del kickoff.
//    Al arrancar el juego pasan a ser info stale que satura la card.
//  - suspended: solo aplica con el juego en curso ('in').
//  - canceled: se muestra siempre — es un estado terminal.
function alteredRelevante(altered, state) {
  if (!altered) return null
  const k = altered.kind
  if (k === 'delayed' || k === 'postponed' || k === 'rescheduled') {
    return state === 'pre' ? altered : null
  }
  if (k === 'suspended') return state === 'in' ? altered : null
  return altered
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
    // Inferir "reprogramado" cuando ESPN devuelve un kickoff distinto al
    // oficial hardcoded y aún no arranca el partido. Cubre el caso común en
    // el que ESPN mueve el partido silenciosamente (actualiza event.date pero
    // deja el status como STATUS_SCHEDULED) — sin este heurístico, la hora
    // cambia en la UI pero el usuario no ve señal de que fue movido. Solo
    // en 'pre': una vez arranca el juego, la info del retraso ya no aporta.
    const deltaKickoff =
      ev?.utc && m.utc ? Math.abs(new Date(ev.utc) - new Date(m.utc)) : 0
    const alteredInferido =
      ev && !ev.altered && ev.state === 'pre' && deltaKickoff > RESCHEDULE_THRESHOLD_MS
        ? { kind: 'rescheduled', originalUtc: m.utc, newUtc: ev.utc }
        : null
    // Ya sea explícito de ESPN o inferido, filtramos por el estado actual
    // del partido para no mostrar info stale (delayed durante 'in', etc.).
    const alteredFinal = alteredRelevante(ev?.altered ?? alteredInferido, ev?.state)
    const evConAltered = ev ? { ...ev, altered: alteredFinal } : ev
    return {
      ...m,
      homeTeam: home,
      awayTeam: away,
      winner,
      live: evConAltered,
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
