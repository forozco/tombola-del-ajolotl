// ── Tómbola del Ajolotl · Mundial 2026 · Octavos de final ──

export const POZO = 1600 // 8 amigos × $200

// code = código ISO que usa flag-icons para la bandera rectangular
export const TEAMS = {
  par: { name: 'Paraguay', code: 'py' },
  fra: { name: 'Francia', code: 'fr' },
  can: { name: 'Canadá', code: 'ca' },
  mar: { name: 'Marruecos', code: 'ma' },
  por: { name: 'Portugal', code: 'pt' },
  esp: { name: 'España', code: 'es' },
  usa: { name: 'EEUU', code: 'us' },
  bel: { name: 'Bélgica', code: 'be' },
  bra: { name: 'Brasil', code: 'br' },
  nor: { name: 'Noruega', code: 'no' },
  mex: { name: 'México', code: 'mx' },
  eng: { name: 'Inglaterra', code: 'gb-eng' },
  arg: { name: 'Argentina', code: 'ar' },
  egy: { name: 'Egipto', code: 'eg' },
  sui: { name: 'Suiza', code: 'ch' },
  col: { name: 'Colombia', code: 'co' },
}

// Cada amigo puso $200 y le tocaron 2 equipos en la tómbola
export const OWNERS = [
  { id: 'rajatl',   name: 'Rajatl',   color: '#e11d48', teams: ['eng', 'bra'] },
  { id: 'israeltl', name: 'Israeltl', color: '#2563eb', teams: ['mex', 'egy'] },
  { id: 'phoccotl', name: 'Phoccotl', color: '#059669', teams: ['can', 'fra'] },
  { id: 'margotl',  name: 'Margotl',  color: '#9333ea', teams: ['bel', 'sui'] },
  { id: 'cuernotl', name: 'Cuernotl', color: '#d97706', teams: ['por', 'par'] },
  { id: 'fertl',    name: 'Fertl',    color: '#0891b2', teams: ['mar', 'arg'] },
  { id: 'dantl',    name: 'Dantl',    color: '#db2777', teams: ['esp', 'nor'] },
  { id: 'gorlytl',  name: 'Gorlytl',  color: '#65a30d', teams: ['col', 'usa'] },
]

export const OWNER_BY_TEAM = Object.fromEntries(
  OWNERS.flatMap((o) => o.teams.map((t) => [t, o]))
)

// Estructura de llaves: los octavos tienen equipos fijos,
// las demás rondas se alimentan del ganador de otro partido (from)
// Horarios en UTC (los octavos son los oficiales; las rondas siguientes traen
// tbd y se corrigen solas con los datos en vivo cuando se confirme el horario)
export const MATCHES = [
  // Octavos · 4–7 de julio
  { id: 'o1', round: 0, utc: '2026-07-04T21:00Z', home: { team: 'par' }, away: { team: 'fra' } },
  { id: 'o2', round: 0, utc: '2026-07-04T17:00Z', home: { team: 'can' }, away: { team: 'mar' } },
  { id: 'o3', round: 0, utc: '2026-07-06T19:00Z', home: { team: 'por' }, away: { team: 'esp' } },
  { id: 'o4', round: 0, utc: '2026-07-07T00:00Z', home: { team: 'usa' }, away: { team: 'bel' } },
  { id: 'o5', round: 0, utc: '2026-07-05T20:00Z', home: { team: 'bra' }, away: { team: 'nor' } },
  { id: 'o6', round: 0, utc: '2026-07-06T00:00Z', home: { team: 'mex' }, away: { team: 'eng' } },
  { id: 'o7', round: 0, utc: '2026-07-07T16:00Z', home: { team: 'arg' }, away: { team: 'egy' } },
  { id: 'o8', round: 0, utc: '2026-07-07T20:00Z', home: { team: 'sui' }, away: { team: 'col' } },
  // Cuartos · 9–11 de julio (horarios oficiales)
  { id: 'q1', round: 1, utc: '2026-07-09T20:00Z', home: { from: 'o1' }, away: { from: 'o2' } },
  { id: 'q2', round: 1, utc: '2026-07-10T19:00Z', home: { from: 'o3' }, away: { from: 'o4' } },
  { id: 'q3', round: 1, utc: '2026-07-11T21:00Z', home: { from: 'o5' }, away: { from: 'o6' } },
  { id: 'q4', round: 1, utc: '2026-07-12T01:00Z', home: { from: 'o7' }, away: { from: 'o8' } },
  // Semifinales · 14–15 de julio (horarios oficiales)
  { id: 's1', round: 2, utc: '2026-07-14T19:00Z', home: { from: 'q1' }, away: { from: 'q2' } },
  { id: 's2', round: 2, utc: '2026-07-15T19:00Z', home: { from: 'q3' }, away: { from: 'q4' } },
  // Final · 19 de julio
  { id: 'f1', round: 3, utc: '2026-07-19T19:00Z', tbd: true, home: { from: 's1' }, away: { from: 's2' } },
]

export const ROUNDS = ['Octavos', 'Cuartos', 'Semifinal', 'Final']
