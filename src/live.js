// ── Marcadores en vivo del Mundial vía la API pública de ESPN (sin key) ──
// Un solo request trae todos los partidos de la fase eliminatoria: los que
// están en vivo (con goles y minuto), los terminados (con ganador) y los que
// vienen (con horario oficial).

const SCOREBOARD_URL =
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260704-20260719'

// Endpoint de detalle por partido: trae boxscore con posesión, tiros, etc.
// Solo se llama para partidos en curso, para no gastar la cuota gratuita.
const summaryUrl = (eventId) =>
  `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${eventId}`

// Abreviatura ESPN → id de equipo en la app
const ABBR_TO_ID = {
  PAR: 'par', FRA: 'fra', CAN: 'can', MAR: 'mar',
  POR: 'por', ESP: 'esp', USA: 'usa', BEL: 'bel',
  BRA: 'bra', NOR: 'nor', MEX: 'mex', ENG: 'eng',
  ARG: 'arg', EGY: 'egy', SUI: 'sui', COL: 'col',
}

// Llave estable para emparejar un partido de la app con un evento de ESPN
export const pairKey = (a, b) => [a, b].sort().join('|')

// Corta la petición si ESPN cuelga la conexión: mejor error rápido y reintento
// que un poll atorado esperando el TCP timeout del sistema (~2 min).
const TIMEOUT_MS = 15_000

// Extrae la posesión % de un partido del endpoint summary. Falla en silencio si
// ESPN no la devuelve todavía (los primeros minutos), o si la forma cambia:
// mejor no mostrar nada que mostrar basura.
async function fetchPossession(eventId) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)
  try {
    const res = await fetch(summaryUrl(eventId), { signal: controller.signal })
    if (!res.ok) return null
    const data = await res.json()
    const teams = data.boxscore?.teams
    if (!teams || teams.length < 2) return null
    const pct = (t) => {
      const s = t.statistics?.find((s) => /possess/i.test(s.name ?? ''))
      if (!s) return null
      const v = Number(s.value ?? parseFloat(s.displayValue))
      return Number.isFinite(v) ? Math.round(v) : null
    }
    const home = teams.find((t) => t.homeAway === 'home') ?? teams[0]
    const away = teams.find((t) => t.homeAway === 'away') ?? teams[1]
    const h = pct(home)
    const a = pct(away)
    if (h == null || a == null) return null
    return { home: h, away: a }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// Devuelve { 'can|mar': { state, clock, detail, score, shootout, winnerId, utc }, ... }
export async function fetchLive() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  let res
  try {
    res = await fetch(SCOREBOARD_URL, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) throw new Error(`ESPN respondió ${res.status}`)
  const data = await res.json()
  const out = {}
  // Guardamos el eventId por llave solo mientras enriquecemos con posesión;
  // no queremos filtrar detalles internos de ESPN al resto de la app.
  const eventIdByKey = {}
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
    const key = pairKey(homeId, awayId)
    eventIdByKey[key] = event.id
    out[key] = {
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

  // Segunda ronda solo para partidos en vivo: enriquecer con posesión %.
  // Se hace en paralelo; si un summary falla o ESPN no la trae todavía (los
  // primeros minutos), se conserva el resto sin ruido.
  const enVivo = Object.entries(out).filter(([, ev]) => ev.state === 'in')
  if (enVivo.length) {
    const posesiones = await Promise.all(
      enVivo.map(([key]) => fetchPossession(eventIdByKey[key]))
    )
    enVivo.forEach(([key], i) => {
      if (posesiones[i]) out[key].possession = posesiones[i]
    })
  }

  return out
}
