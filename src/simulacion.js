// ── Modo simulación (?simular en la URL) ──
// Recorre todo el torneo en ~3 minutos para probar la experiencia en vivo:
// reloj corriendo, goles con goleador, medio tiempo, tiempo extra, penales,
// ganadores avanzando en el cuadro y campeón al final. Todo en memoria:
// no escribe en Supabase ni en el localStorage real.

import { pairKey } from './live.js'

const VELOCIDAD = 6 // minutos de juego por segundo real (90' ≈ 15s)
const START = Date.now()

const G = (min, lado, player, extra = {}) => ({ min, lado, player, ...extra })

// Guion: cada partido con su patada inicial (segundos desde que abre la página),
// goles, duración (90 o 120) y ganador. Los cruces siguientes usan a los
// ganadores del guion para que el cuadro avance consistente.
const GUION = [
  // Octavos
  { home: 'par', away: 'fra', kick: 6, winner: 'away', finish: 'ft',
    goals: [G(12, 'away', 'K. Mbappé'), G(34, 'home', 'M. Almirón'), G(58, 'away', 'A. Griezmann', { penalty: true }), G(71, 'home', 'J. Enciso'), G(88, 'away', 'O. Dembélé')] },
  { home: 'can', away: 'mar', kick: 24, winner: 'home', finish: 'pens', dur: 120, pens: [4, 3],
    goals: [G(22, 'away', 'B. El Khannouss'), G(79, 'home', 'A. David')] },
  { home: 'por', away: 'esp', kick: 47, winner: 'away', finish: 'ft',
    goals: [G(18, 'away', 'Lamine Yamal'), G(51, 'home', 'C. Ronaldo', { penalty: true }), G(84, 'away', 'Nico Williams')] },
  { home: 'usa', away: 'bel', kick: 47, winner: 'away', finish: 'ft',
    goals: [G(9, 'home', 'C. Pulisic'), G(27, 'away', 'J. Doku'), G(56, 'away', 'K. De Bruyne'), G(74, 'home', 'F. Balogun'), G(90, 'away', 'L. Openda')] },
  { home: 'bra', away: 'nor', kick: 65, winner: 'home', finish: 'ft',
    goals: [G(31, 'home', 'Raphinha'), G(66, 'home', 'Vini Jr.')] },
  { home: 'mex', away: 'eng', kick: 65, winner: 'home', finish: 'ft',
    goals: [G(88, 'home', 'S. Giménez')] },
  { home: 'arg', away: 'egy', kick: 83, winner: 'home', finish: 'ft',
    goals: [G(15, 'home', 'L. Messi'), G(44, 'home', 'J. Álvarez'), G(77, 'home', 'L. Messi')] },
  { home: 'sui', away: 'col', kick: 83, winner: 'away', finish: 'aet', dur: 120,
    goals: [G(40, 'home', 'B. Embolo'), G(62, 'away', 'L. Díaz'), G(104, 'away', 'J. Durán')] },
  // Cuartos (ganadores del guion: fra, can, esp, bel, bra, mex, arg, col)
  { home: 'fra', away: 'can', kick: 106, winner: 'home', finish: 'ft',
    goals: [G(24, 'home', 'K. Mbappé'), G(69, 'home', 'M. Thuram')] },
  { home: 'esp', away: 'bel', kick: 106, winner: 'home', finish: 'ft',
    goals: [G(58, 'home', 'Pedri')] },
  { home: 'bra', away: 'mex', kick: 124, winner: 'away', finish: 'ft',
    goals: [G(23, 'home', 'Raphinha'), G(55, 'away', 'S. Giménez'), G(90, 'away', 'A. Vega')] },
  { home: 'arg', away: 'col', kick: 124, winner: 'home', finish: 'ft',
    goals: [G(78, 'home', 'L. Messi')] },
  // Semifinales (fra, esp, mex, arg)
  // Semifinal con tanda larga: llega a muerte súbita (6-7)
  { home: 'fra', away: 'esp', kick: 142, winner: 'away', finish: 'pens', dur: 120, pens: [6, 7],
    goals: [] },
  { home: 'mex', away: 'arg', kick: 142, winner: 'away', finish: 'ft',
    goals: [G(10, 'home', 'S. Giménez'), G(75, 'away', 'J. Álvarez'), G(90, 'away', 'L. Messi')] },
  // Final (esp vs arg) — campeón: Argentina
  { home: 'esp', away: 'arg', kick: 165, winner: 'away', finish: 'aet', dur: 120,
    goals: [G(35, 'home', 'Lamine Yamal'), G(68, 'away', 'J. Álvarez'), G(112, 'away', 'L. Messi')] },
]

// Serie de la tanda: [4,3] → [1,0],[1,1],[2,1],[2,2],[3,2],[3,3],[4,3]
function seriePenales([a, b]) {
  const pasos = []
  let x = 0
  let y = 0
  while (x < a || y < b) {
    if (x < a) pasos.push([++x, y])
    if (y < b) pasos.push([x, ++y])
  }
  return pasos
}

export function simLive(tSeg = (Date.now() - START) / 1000) {
  const out = {}
  for (const m of GUION) {
    const ids = { home: m.home, away: m.away }
    const key = pairKey(m.home, m.away)
    const utc = new Date(START + m.kick * 1000).toISOString()
    const dur = m.dur ?? 90

    if (tSeg < m.kick) {
      out[key] = {
        utc, state: 'pre', clock: "0'", halftime: false,
        score: { [m.home]: '0', [m.away]: '0' },
        shootout: {}, winnerId: null, finish: null, goals: [],
      }
      continue
    }

    const finDelJuego = m.kick + dur / VELOCIDAD
    const minuto = Math.min(Math.floor((tSeg - m.kick) * VELOCIDAD), dur)
    const caidos = m.goals.filter((g) => g.min <= minuto)
    const score = { [m.home]: 0, [m.away]: 0 }
    for (const g of caidos) score[ids[g.lado]]++
    const goals = caidos.map((g) => ({
      minute: `${g.min}'`,
      player: g.player,
      teamId: ids[g.lado],
      ownGoal: Boolean(g.ownGoal),
      penalty: Boolean(g.penalty),
    }))
    const scoreStr = { [m.home]: String(score[m.home]), [m.away]: String(score[m.away]) }

    if (minuto >= dur) {
      // Tanda de penales en vivo: un penal por segundo antes del final
      if (m.pens) {
        const serie = seriePenales(m.pens)
        const paso = Math.floor(tSeg - finDelJuego)
        if (paso < serie.length) {
          const [pa, pb] = serie[paso]
          out[key] = {
            utc, state: 'in', clock: `${dur}'`, halftime: false,
            score: scoreStr,
            shootout: { [m.home]: pa, [m.away]: pb },
            winnerId: null, finish: null, goals,
          }
          continue
        }
      }
      out[key] = {
        utc, state: 'post', clock: 'FT', halftime: false,
        score: scoreStr,
        shootout: m.pens ? { [m.home]: m.pens[0], [m.away]: m.pens[1] } : {},
        winnerId: ids[m.winner], finish: m.finish, goals,
      }
    } else {
      out[key] = {
        utc, state: 'in',
        clock: `${minuto}'`,
        halftime: minuto >= 45 && minuto < 48,
        score: scoreStr,
        shootout: {}, winnerId: null, finish: null, goals,
      }
    }
  }
  return out
}
