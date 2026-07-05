// ── Modo simulación (?simular en la URL) ──
// Recorre todo el torneo en ~4 minutos para probar la experiencia en vivo:
// reloj corriendo, goles con goleador, medio tiempo, tiempo extra, penales
// (con muerte súbita), ganadores avanzando en el cuadro y campeón al final.
// Cada partido ocurre en su fecha real del torneo y el "hoy" de la app
// avanza con un reloj virtual (simNow), así se ve pasar el calendario.
// Todo en memoria: no escribe en Supabase ni en el localStorage real.

import { pairKey } from './live.js'

const VELOCIDAD = 6 // minutos de juego por segundo real (90' ≈ 15s)
const START = Date.now()

const G = (min, lado, player, extra = {}) => ({ min, lado, player, ...extra })

// Guion en orden cronológico del torneo: kick = segundo de la simulación,
// utc = horario real del partido (ancla del calendario virtual)
const GUION = [
  // Octavos · 4–7 de julio
  { home: 'can', away: 'mar', kick: 6, utc: '2026-07-04T17:00:00Z', winner: 'home', finish: 'pens', dur: 120, pens: [4, 3],
    goals: [G(22, 'away', 'B. El Khannouss'), G(79, 'home', 'A. David')] },
  { home: 'par', away: 'fra', kick: 36, utc: '2026-07-04T21:00:00Z', winner: 'away', finish: 'ft',
    goals: [G(12, 'away', 'K. Mbappé'), G(34, 'home', 'M. Almirón'), G(58, 'away', 'A. Griezmann', { penalty: true }), G(71, 'home', 'J. Enciso'), G(88, 'away', 'O. Dembélé')] },
  { home: 'bra', away: 'nor', kick: 54, utc: '2026-07-05T20:00:00Z', winner: 'home', finish: 'ft',
    goals: [G(31, 'home', 'Raphinha'), G(66, 'home', 'Vini Jr.')] },
  { home: 'mex', away: 'eng', kick: 58, utc: '2026-07-06T00:00:00Z', winner: 'home', finish: 'ft',
    goals: [G(88, 'home', 'S. Giménez')] },
  { home: 'por', away: 'esp', kick: 76, utc: '2026-07-06T19:00:00Z', winner: 'away', finish: 'ft',
    goals: [G(18, 'away', 'Lamine Yamal'), G(51, 'home', 'C. Ronaldo', { penalty: true }), G(84, 'away', 'Nico Williams')] },
  { home: 'usa', away: 'bel', kick: 80, utc: '2026-07-07T00:00:00Z', winner: 'away', finish: 'ft',
    goals: [G(9, 'home', 'C. Pulisic'), G(27, 'away', 'J. Doku'), G(56, 'away', 'K. De Bruyne'), G(74, 'home', 'F. Balogun'), G(90, 'away', 'L. Openda')] },
  { home: 'arg', away: 'egy', kick: 98, utc: '2026-07-07T16:00:00Z', winner: 'home', finish: 'ft',
    goals: [G(15, 'home', 'L. Messi'), G(44, 'home', 'J. Álvarez'), G(77, 'home', 'L. Messi')] },
  { home: 'sui', away: 'col', kick: 102, utc: '2026-07-07T20:00:00Z', winner: 'away', finish: 'aet', dur: 120,
    goals: [G(40, 'home', 'B. Embolo'), G(62, 'away', 'L. Díaz'), G(104, 'away', 'J. Durán')] },
  // Cuartos · 9–11 de julio (ganadores: can, fra, bra, mex, esp, bel, arg, col)
  { home: 'fra', away: 'can', kick: 126, utc: '2026-07-09T20:00:00Z', winner: 'home', finish: 'ft',
    goals: [G(24, 'home', 'K. Mbappé'), G(69, 'home', 'M. Thuram')] },
  { home: 'esp', away: 'bel', kick: 144, utc: '2026-07-10T19:00:00Z', winner: 'home', finish: 'ft',
    goals: [G(58, 'home', 'Pedri')] },
  { home: 'bra', away: 'mex', kick: 162, utc: '2026-07-11T21:00:00Z', winner: 'away', finish: 'ft',
    goals: [G(23, 'home', 'Raphinha'), G(55, 'away', 'S. Giménez'), G(90, 'away', 'A. Vega')] },
  { home: 'arg', away: 'col', kick: 166, utc: '2026-07-12T01:00:00Z', winner: 'home', finish: 'ft',
    goals: [G(78, 'home', 'L. Messi')] },
  // Semifinales · 14–15 de julio (tanda larga en s1: muerte súbita 6-7)
  { home: 'fra', away: 'esp', kick: 184, utc: '2026-07-14T19:00:00Z', winner: 'away', finish: 'pens', dur: 120, pens: [6, 7],
    goals: [] },
  { home: 'mex', away: 'arg', kick: 220, utc: '2026-07-15T19:00:00Z', winner: 'away', finish: 'ft',
    goals: [G(10, 'home', 'S. Giménez'), G(75, 'away', 'J. Álvarez'), G(90, 'away', 'L. Messi')] },
  // Final · 19 de julio — campeón: Argentina
  { home: 'esp', away: 'arg', kick: 240, utc: '2026-07-19T19:00:00Z', winner: 'away', finish: 'aet', dur: 120,
    goals: [G(35, 'home', 'Lamine Yamal'), G(68, 'away', 'J. Álvarez'), G(112, 'away', 'L. Messi')] },
]

// ── Reloj virtual: interpola entre anclas (segundo de sim → fecha real) ──
const ANCLAS = GUION.map((m) => [m.kick, new Date(m.utc).getTime()])
const EXTRA_MS_POR_SEG = 10 * 60_000 // fuera de anclas: 10 min virtuales por segundo

export function simNow(tSeg = (Date.now() - START) / 1000) {
  const [k0, u0] = ANCLAS[0]
  if (tSeg <= k0) return u0 - (k0 - tSeg) * EXTRA_MS_POR_SEG
  for (let i = 0; i < ANCLAS.length - 1; i++) {
    const [ka, ua] = ANCLAS[i]
    const [kb, ub] = ANCLAS[i + 1]
    if (tSeg <= kb) return ua + ((tSeg - ka) / (kb - ka)) * (ub - ua)
  }
  const [kf, uf] = ANCLAS[ANCLAS.length - 1]
  return uf + (tSeg - kf) * EXTRA_MS_POR_SEG
}

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

// Posesión virtual: parte de 50-50, deriva suave con una sinusoide y se
// inclina hacia el ganador para que la barra "cuente" la historia del partido.
function simPosesion(m, tSeg) {
  const t = (tSeg - m.kick) / 6
  const bias = m.winner === 'home' ? 6 : -6
  const drift = Math.sin(t) * 7
  const home = Math.max(28, Math.min(72, Math.round(50 + bias + drift)))
  return { home, away: 100 - home }
}

// Estadios FIFA-oficiales del Mundial 2026 asignados por equipo anfitrión
// (para dar variedad al demo). Nomenclatura FIFA "clean venue": los nombres
// comerciales (MetLife, SoFi, AT&T, etc.) se reemplazan por "[Ciudad] Stadium"
// durante el torneo. Es lo que ESPN devolverá en producción, así que el demo
// se ve idéntico al real.
const STADIUMS = {
  can: { name: 'Toronto Stadium', city: 'Toronto' },
  mar: { name: 'Estadio Guadalajara', city: 'Guadalajara' },
  par: { name: 'Boston Stadium', city: 'Foxborough' },
  fra: { name: 'Los Angeles Stadium', city: 'Inglewood' },
  bra: { name: 'Dallas Stadium', city: 'Arlington' },
  nor: { name: 'San Francisco Bay Area Stadium', city: 'Santa Clara' },
  mex: { name: 'Estadio Ciudad de México', city: 'Ciudad de México' },
  eng: { name: 'Estadio Monterrey', city: 'Monterrey' },
  por: { name: 'Philadelphia Stadium', city: 'Philadelphia' },
  esp: { name: 'Seattle Stadium', city: 'Seattle' },
  usa: { name: 'Atlanta Stadium', city: 'Atlanta' },
  bel: { name: 'Miami Stadium', city: 'Miami Gardens' },
  arg: { name: 'Houston Stadium', city: 'Houston' },
  egy: { name: 'Vancouver Stadium', city: 'Vancouver' },
  sui: { name: 'Kansas City Stadium', city: 'Kansas City' },
  col: { name: 'New York New Jersey Stadium', city: 'East Rutherford' },
}

export function simLive(tSeg = (Date.now() - START) / 1000) {
  const out = {}
  for (const m of GUION) {
    const ids = { home: m.home, away: m.away }
    const key = pairKey(m.home, m.away)
    const dur = m.dur ?? 90

    if (tSeg < m.kick) {
      out[key] = {
        utc: m.utc, state: 'pre', clock: "0'", halftime: false,
        score: { [m.home]: '0', [m.away]: '0' },
        shootout: {}, winnerId: null, finish: null, goals: [],
        venue: STADIUMS[m.home] ?? null,
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
            utc: m.utc, state: 'in', clock: `${dur}'`, halftime: false,
            score: scoreStr,
            shootout: { [m.home]: pa, [m.away]: pb },
            winnerId: null, finish: null, goals,
            venue: STADIUMS[m.home] ?? null,
          }
          continue
        }
      }
      out[key] = {
        utc: m.utc, state: 'post', clock: 'FT', halftime: false,
        score: scoreStr,
        shootout: m.pens ? { [m.home]: m.pens[0], [m.away]: m.pens[1] } : {},
        winnerId: ids[m.winner], finish: m.finish, goals,
        venue: STADIUMS[m.home] ?? null,
      }
    } else {
      out[key] = {
        utc: m.utc, state: 'in',
        clock: `${minuto}'`,
        halftime: minuto >= 45 && minuto < 48,
        score: scoreStr,
        shootout: {}, winnerId: null, finish: null, goals,
        possession: simPosesion(m, tSeg),
        venue: STADIUMS[m.home] ?? null,
      }
    }
  }
  return out
}
