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

// Catálogo de traducción: nombre corporativo (o antiguo) → nombre FIFA-oficial.
// FIFA aplica 'clean venue policy' durante el Mundial: los estadios pierden
// los patrocinadores. ESPN suele devolver el nombre comercial vigente
// ("Estadio Banorte", "MetLife Stadium"…). Este catálogo hace la traducción
// sin depender del match_id, así funciona incluso si ESPN devuelve venues
// para partidos que no tengamos en VENUES.
//
// Si ESPN devuelve un nombre que NO está en este mapa, se muestra tal cual
// (asumimos que ya es un nombre correcto). El catálogo cubre las 16 sedes
// del Mundial 2026.
const CORPORATE_TO_FIFA = {
  // México
  'Estadio Banorte': 'Estadio Ciudad de México',
  'Estadio Azteca': 'Estadio Ciudad de México',
  'Estadio BBVA': 'Estadio Monterrey',
  'Estadio BBVA Bancomer': 'Estadio Monterrey',
  'Estadio Akron': 'Estadio Guadalajara',
  // Estados Unidos
  'MetLife Stadium': 'New York New Jersey Stadium',
  'SoFi Stadium': 'Los Angeles Stadium',
  'AT&T Stadium': 'Dallas Stadium',
  'Hard Rock Stadium': 'Miami Stadium',
  'Mercedes-Benz Stadium': 'Atlanta Stadium',
  'Lincoln Financial Field': 'Philadelphia Stadium',
  'Arrowhead Stadium': 'Kansas City Stadium',
  'GEHA Field at Arrowhead Stadium': 'Kansas City Stadium',
  'Gillette Stadium': 'Boston Stadium',
  'NRG Stadium': 'Houston Stadium',
  "Levi's Stadium": 'San Francisco Bay Area Stadium',
  'Lumen Field': 'Seattle Stadium',
  // Canadá
  'BMO Field': 'Toronto Stadium',
  'BC Place': 'Vancouver Stadium',
}

// Traduce un nombre corporativo/antiguo al FIFA-oficial. Si el nombre no
// está en el catálogo, se devuelve como vino (para no romper con partidos
// que ESPN detalle en el futuro con nombres que aún no conocemos).
export function fifaVenueName(rawName) {
  if (!rawName) return null
  return CORPORATE_TO_FIFA[rawName] ?? rawName
}

// Nombre del estadio para mostrar en la UI. Prioridad:
//   1. ESPN (traducido con el catálogo corporativo → FIFA). Es la fuente
//      autoritativa y refleja cambios de última hora; el catálogo se
//      encarga de que siempre veamos el nombre limpio del torneo.
//   2. Fallback a VENUES[match.id] (nombre FIFA-oficial hardcodeado por
//      partido) — cubre cuando ESPN aún no llenó el venue (partidos muy
//      futuros).
//   3. Como último recurso, la ciudad si ESPN solo dio eso.
// Si nada devuelve nombre, devolvemos null y la UI omite la línea.
export function venueLabel(match) {
  const espn = match.live?.venue
  return fifaVenueName(espn?.name) || VENUES[match.id]?.name || espn?.city || null
}
