// ── Marcadores en vivo del Mundial vía la API pública de ESPN (sin key) ──
// Un solo request trae todos los partidos de la fase eliminatoria: los que
// están en vivo (con goles y minuto), los terminados (con ganador) y los que
// vienen (con horario oficial).

const SCOREBOARD_URL =
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260704-20260719'

// Abreviatura ESPN → id de equipo en la app
const ABBR_TO_ID = {
  PAR: 'par', FRA: 'fra', CAN: 'can', MAR: 'mar',
  POR: 'por', ESP: 'esp', USA: 'usa', BEL: 'bel',
  BRA: 'bra', NOR: 'nor', MEX: 'mex', ENG: 'eng',
  ARG: 'arg', EGY: 'egy', SUI: 'sui', COL: 'col',
}

// Llave estable para emparejar un partido de la app con un evento de ESPN
export const pairKey = (a, b) => [a, b].sort().join('|')

// Devuelve { 'can|mar': { state, clock, detail, score, shootout, winnerId, utc }, ... }
export async function fetchLive() {
  const res = await fetch(SCOREBOARD_URL)
  if (!res.ok) throw new Error(`ESPN respondió ${res.status}`)
  const data = await res.json()
  const out = {}
  for (const event of data.events ?? []) {
    const comp = event.competitions?.[0]
    const home = comp?.competitors?.find((c) => c.homeAway === 'home')
    const away = comp?.competitors?.find((c) => c.homeAway === 'away')
    const homeId = ABBR_TO_ID[home?.team?.abbreviation]
    const awayId = ABBR_TO_ID[away?.team?.abbreviation]
    if (!homeId || !awayId) continue
    const state = comp.status?.type?.state // pre | in | post
    const shortDetail = comp.status?.type?.shortDetail
    const enPenales = home.shootoutScore != null || away.shootoutScore != null
    let winnerId = null
    let finish = null // ft (90 min) | aet (tiempo extra) | pens (penales)
    if (state === 'post') {
      if (home.winner) winnerId = homeId
      else if (away.winner) winnerId = awayId
      finish = enPenales ? 'pens' : /AET/i.test(shortDetail ?? '') ? 'aet' : 'ft'
    }
    // Goles con minuto y goleador (vienen en la misma respuesta)
    const espnIdToApp = { [home.team?.id]: homeId, [away.team?.id]: awayId }
    const goals = (comp.details ?? [])
      .filter((d) => d.scoringPlay && !d.shootout)
      .sort((a, b) => (a.clock?.value ?? 0) - (b.clock?.value ?? 0))
      .map((d) => ({
        minute: d.clock?.displayValue ?? '',
        player: d.athletesInvolved?.[0]?.displayName ?? 'Gol',
        teamId: espnIdToApp[d.team?.id] ?? null,
        ownGoal: Boolean(d.ownGoal),
        penalty: Boolean(d.penaltyKick),
      }))
    out[pairKey(homeId, awayId)] = {
      utc: event.date,
      state,
      clock: comp.status?.displayClock,
      halftime: shortDetail === 'HT',
      score: { [homeId]: home.score, [awayId]: away.score },
      shootout: { [homeId]: home.shootoutScore, [awayId]: away.shootoutScore },
      winnerId,
      finish,
      goals,
    }
  }
  return out
}
