// ── Utilidades derivadas de un partido individual ──
// Se usan tanto en la UI (finishLabel) como al persistir en Supabase
// (marcadorTexto, detalleDe).

import { TEAMS, VENUES } from '../data.js'

// Cómo terminó el partido, para mostrar bajo el marcador cuando ya acabó.
// "Final · penales 4-2 para Marruecos", "Final · en tiempo extra", etc.
export function finishLabel(match) {
  const ev = match.live
  if (!ev || ev.state !== 'post') return null
  if (ev.finish === 'pens') {
    const sh = ev.shootout
    const ganador = match.winner ? TEAMS[match.winner] : null
    const marcadorPens =
      match.winner === match.homeTeam
        ? `${sh?.[match.homeTeam] ?? '?'}-${sh?.[match.awayTeam] ?? '?'}`
        : `${sh?.[match.awayTeam] ?? '?'}-${sh?.[match.homeTeam] ?? '?'}`
    return `Final · penales ${marcadorPens}${ganador ? ` para ${ganador.name}` : ''}`
  }
  if (ev.finish === 'aet') return 'Final · en tiempo extra'
  return 'Final · en los 90 minutos'
}

// Texto compacto del marcador final: "2-1", "1-1 (pen 4-2)", "2-1 (t. extra)".
// Se guarda en la columna 'marcador' de Supabase para lectura rápida.
export function marcadorTexto(m) {
  const ev = m.live
  if (!ev) return null
  let txt = `${ev.score?.[m.homeTeam] ?? '?'}-${ev.score?.[m.awayTeam] ?? '?'}`
  if (ev.finish === 'pens') {
    txt += ` (pen ${ev.shootout?.[m.homeTeam] ?? '?'}-${ev.shootout?.[m.awayTeam] ?? '?'})`
  } else if (ev.finish === 'aet') {
    txt += ' (t. extra)'
  }
  return txt
}

// Snapshot completo del partido terminado (goles, cómo terminó, marcador) que
// se persiste en la columna 'detalle' jsonb de Supabase. Sirve como respaldo
// cuando ESPN deja de servir el evento (post-torneo).
export function detalleDe(m) {
  const ev = m.live
  if (!ev) return null
  return {
    state: 'post',
    utc: ev.utc,
    score: ev.score,
    shootout: ev.shootout ?? {},
    finish: ev.finish,
    goals: ev.goals ?? [],
    winnerId: ev.winnerId,
    venue: ev.venue ?? null,
  }
}

// Nombre del estadio para mostrar en la UI. Prioridad:
//   1. ESPN en tiempo real (event.competitions[0].venue.fullName) — cuando
//      el evento ya está detallado por ESPN, gana porque puede reflejar
//      cambios de sede de última hora.
//   2. Fallback a VENUES en data.js (nomenclatura FIFA-oficial 'clean venue')
//      — asegura que siempre haya dato desde el minuto 0, incluso en
//      partidos muy futuros donde ESPN aún no llena el venue.
//   3. Como último recurso, la ciudad si ESPN solo dio eso.
// Si nada devuelve nombre, devolvemos null y la UI omite la línea.
export function venueLabel(match) {
  const espn = match.live?.venue
  return espn?.name || VENUES[match.id]?.name || espn?.city || null
}
