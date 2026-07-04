import { useEffect, useMemo, useRef, useState } from 'react'
import { TEAMS, OWNERS, OWNER_BY_TEAM, MATCHES, ROUNDS, POZO } from './data.js'
import { hasSupabase, fetchResults, subscribeResults, saveResult, deleteResult } from './sync.js'
import { fetchLive, pairKey } from './live.js'

import { simLive, simNow } from './simulacion.js'
import { FLAG_URLS } from './banderas.js'

// Puerta de emergencia: con ?admin en la URL se puede corregir un resultado
// a mano (por si la API fallara). En uso normal la app es solo de consulta.
const ES_ADMIN = new URLSearchParams(window.location.search).has('admin')

// Modo demo: con ?simular la app recorre un torneo ficticio en ~4 minutos,
// sin tocar Supabase ni el localStorage real.
const ES_SIM = new URLSearchParams(window.location.search).has('simular')

// El "ahora" de la app: reloj real, o reloj virtual del demo (los días
// del calendario avanzan conforme corre la simulación)
const AHORA = () => (ES_SIM ? simNow() : Date.now())

const STORAGE_KEY = 'tombola-ajolotl-v1'
const THEME_KEY = 'tombola-ajolotl-theme'

const MATCH_BY_ID = Object.fromEntries(MATCHES.map((m) => [m.id, m]))

// Resuelve quién ocupa un lugar de la llave (equipo fijo u origen de otro partido)
function slotTeam(slot, results) {
  if (slot.team) return slot.team
  return matchWinner(slot.from, results)
}

// El ganador guardado solo cuenta si sigue siendo participante del partido
function matchWinner(matchId, results) {
  const m = MATCH_BY_ID[matchId]
  const home = slotTeam(m.home, results)
  const away = slotTeam(m.away, results)
  const w = results[matchId]
  return w && (w === home || w === away) ? w : null
}

// Fecha y hora locales del teléfono a partir del horario UTC del partido
function localDateStr(utc) {
  const d = new Date(utc)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function localTimeStr(utc) {
  return new Date(utc).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function computeBracket(results, live = {}) {
  const resolved = MATCHES.map((m) => {
    const home = slotTeam(m.home, results)
    const away = slotTeam(m.away, results)
    const winner = matchWinner(m.id, results)
    // Si ESPN ya conoce este cruce, su horario oficial manda sobre el estimado
    const ev = home && away ? live[pairKey(home, away)] : null
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
  const champion = resolved.find((m) => m.id === 'f1').winner
  return { resolved, eliminated, champion }
}

function loadResults() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {}
  } catch {
    return {}
  }
}

function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved) return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// Fecha local en formato YYYY-MM-DD para comparar contra match.date
function todayStr(ms = AHORA()) {
  const d = new Date(ms)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function fechaLarga(dateStr) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function fechaCorta(dateStr) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

// La jornada que se muestra en "Hoy". Regla: una jornada "se activa" 2h antes
// de su primer partido, y la activa es la más reciente que ya entró. Así los
// partidos de un día siguen visibles toda esa jornada y hasta ~2h antes del
// primer partido del siguiente día (no desaparecen de golpe a medianoche).
// Funciona en cualquier zona horaria: cada día se agrupa por la hora local del
// dispositivo y el margen se compara contra timestamps absolutos (UTC).
const ROLLOVER_MS = 2 * 3_600_000
function jornadaHoy(matches, ahora) {
  const dias = [...new Set(matches.map((m) => m.date))].sort()
  const inicioDe = (d) =>
    Math.min(...matches.filter((m) => m.date === d).map((m) => new Date(m.utc).getTime()))
  let activa = dias[0]
  for (const d of dias) {
    if (inicioDe(d) - ahora <= ROLLOVER_MS) activa = d
    else break
  }
  return activa
}

// Abreviatura de la zona horaria del dispositivo (p. ej. "GMT-6"), para
// dejar claro que los horarios se muestran en la hora local de cada quien
function zonaHoraria() {
  try {
    const parts = new Intl.DateTimeFormat('es-MX', { timeZoneName: 'short' }).formatToParts(
      new Date()
    )
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? ''
  } catch {
    return ''
  }
}

// Iconos de línea para el switch de tema
function IconSol() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

function IconLuna() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  )
}

// Iconos del switch de vista de El Camino
function IconBracket() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h4M4 17h4M8 7v10M8 12h9" />
    </svg>
  )
}

function IconLista() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M8 6h12M8 12h12M8 18h12M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </svg>
  )
}

// Bandera seria cuadrada (SVG oficial de flag-icons)
function Bandera({ teamId, className = '' }) {
  const team = TEAMS[teamId]
  if (!team) return <span className={`bandera bandera-vacia ${className}`} />
  return (
    <span
      className={`bandera ${className}`}
      style={{ backgroundImage: FLAG_URLS[team.code] }}
      title={team.name}
    />
  )
}

function OwnerChip({ owner, small }) {
  return (
    <span className={`owner-chip${small ? ' small' : ''}`} style={{ '--owner': owner.color }}>
      <span className="owner-dot" />
      {owner.name}
    </span>
  )
}

function TeamRow({ teamId, match, champion, onPick }) {
  const team = teamId ? TEAMS[teamId] : null
  const owner = teamId ? OWNER_BY_TEAM[teamId] : null
  const isWinner = match.winner && match.winner === teamId
  const isLoser = match.winner && match.winner !== teamId
  const ev = match.live
  const score = ev && ev.state !== 'pre' ? ev.score?.[teamId] : null
  const admin = ES_ADMIN && onPick && match.homeTeam && match.awayTeam

  if (!team) {
    return (
      <div className="team-row pending">
        <span className="flag">
          <Bandera />
        </span>
        <span className="team-name">Por definir</span>
      </div>
    )
  }
  return (
    <div
      className={`team-row${isWinner ? ' winner' : ''}${isLoser ? ' loser' : ''}${admin ? ' admin' : ''}`}
      onClick={admin ? () => onPick(match.id, teamId) : undefined}
    >
      <span className="flag">
        <Bandera teamId={teamId} />
      </span>
      <span className="team-name">{team.name}</span>
      <OwnerChip owner={owner} small />
      {score != null && <span className="score">{score}</span>}
      {match.winner && (
        <span className="check">{isWinner ? (champion === teamId ? '★' : '✓') : ''}</span>
      )}
    </div>
  )
}

// Cómo terminó el partido: en los 90, en tiempo extra o en penales
function finishLabel(match) {
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

function MatchCard({ match, champion, meta, onPick }) {
  const homeOwner = match.homeTeam ? OWNER_BY_TEAM[match.homeTeam] : null
  const awayOwner = match.awayTeam ? OWNER_BY_TEAM[match.awayTeam] : null
  const duel = homeOwner && awayOwner && homeOwner.id !== awayOwner.id
  const enVivo = match.live?.state === 'in'
  const terminado = match.live?.state === 'post'
  const sh = match.live?.shootout ?? {}
  const enPenales = enVivo && Object.values(sh).some((v) => v != null)
  const muerteSubita =
    enPenales && (sh[match.homeTeam] ?? 0) + (sh[match.awayTeam] ?? 0) >= 10
  const enTiempoExtra = enVivo && !enPenales && (parseInt(match.live.clock) || 0) > 90
  return (
    <div
      id={`match-${match.id}`}
      className={`match-card${match.winner ? ' decided' : ''}${enVivo ? ' playing' : ''}`}
    >
      {meta && (
        <div className="match-meta">
          <span className="round-chip">{ROUNDS[match.round]}</span>
          <span className="match-time">
            {match.tbd ? 'hora por confirmar' : `${match.time} h`}
          </span>
        </div>
      )}
      {enVivo && (
        <div className="live-bar">
          <span className="live-dot" />
          {enPenales ? (
            <>
              {muerteSubita ? 'PENALES · MUERTE SÚBITA' : 'PENALES'} ·{' '}
              <Bandera teamId={match.homeTeam} /> {sh[match.homeTeam] ?? 0}–
              {sh[match.awayTeam] ?? 0} <Bandera teamId={match.awayTeam} />
            </>
          ) : match.live.halftime ? (
            'MEDIO TIEMPO'
          ) : enTiempoExtra ? (
            `TIEMPO EXTRA · ${match.live.clock}`
          ) : (
            `EN VIVO · ${match.live.clock}`
          )}
        </div>
      )}
      {terminado && <div className="live-bar done">{finishLabel(match)}</div>}
      {duel && (
        <div className="duel-label">
          <strong style={{ color: homeOwner.color }}>{homeOwner.name}</strong>
          <span className="mini-vs"> vs </span>
          <strong style={{ color: awayOwner.color }}>{awayOwner.name}</strong>
        </div>
      )}
      {homeOwner && awayOwner && homeOwner.id === awayOwner.id && (
        <div className="duel-label same">
          <strong style={{ color: homeOwner.color }}>{homeOwner.name}</strong> juega contra sí
          mismo — avanza seguro
        </div>
      )}
      <TeamRow teamId={match.homeTeam} match={match} champion={champion} onPick={onPick} />
      {meta && <GolesDe match={match} teamId={match.homeTeam} />}
      <TeamRow teamId={match.awayTeam} match={match} champion={champion} onPick={onPick} />
      {meta && <GolesDe match={match} teamId={match.awayTeam} />}
    </div>
  )
}

// Goles de un equipo, listados justo debajo de su renglón
function GolesDe({ match, teamId }) {
  const goles = match.live?.goals?.filter((g) => g.teamId === teamId) ?? []
  if (!goles.length) return null
  return (
    <div className="goles">
      {goles.map((g, i) => (
        <span key={i} className="gol">
          <span className="gol-min">{g.minute}</span> {g.player}
          {g.penalty ? ' (penal)' : ''}
          {g.ownGoal ? ' (autogol)' : ''}
        </span>
      ))}
    </div>
  )
}

function Bracket({ bracket, onPick }) {
  return (
    <div className="bracket">
      {ROUNDS.map((label, round) => (
        <section key={label} className="round">
          <h2 className="round-title">{label}</h2>
          <div className="round-matches">
            {bracket.resolved
              .filter((m) => m.round === round)
              .map((m) => (
                <MatchCard key={m.id} match={m} champion={bracket.champion} onPick={onPick} />
              ))}
          </div>
        </section>
      ))}
    </div>
  )
}

// Renglón compacto para listas de próximos partidos y resultados
function MiniMatch({ match, onGoTo, bracket, abierto }) {
  const home = match.homeTeam ? TEAMS[match.homeTeam] : null
  const away = match.awayTeam ? TEAMS[match.awayTeam] : null
  const homeOwner = match.homeTeam ? OWNER_BY_TEAM[match.homeTeam] : null
  const awayOwner = match.awayTeam ? OWNER_BY_TEAM[match.awayTeam] : null
  const ev = match.live
  const terminado = Boolean(match.winner) && home && away
  const marcador =
    ev && ev.state !== 'pre' && home && away
      ? ` ${ev.score?.[match.homeTeam] ?? '?'} – ${ev.score?.[match.awayTeam] ?? '?'} `
      : null
  const comoTermino =
    ev?.finish === 'pens'
      ? `penales ${ev.shootout?.[match.homeTeam] ?? '?'}-${ev.shootout?.[match.awayTeam] ?? '?'}`
      : ev?.finish === 'aet'
        ? 'tiempo extra'
        : null
  const claseLado = (teamId) =>
    terminado ? (match.winner === teamId ? ' gano' : ' perdio') : ''

  // Resumen para la quiniela: quién avanza y cómo queda el amigo que perdió
  let resumen = null
  if (terminado) {
    const wOwner = OWNER_BY_TEAM[match.winner]
    const perdedor = match.winner === match.homeTeam ? match.awayTeam : match.homeTeam
    const lOwner = OWNER_BY_TEAM[perdedor]
    if (match.id === 'f1') {
      resumen = (
        <>
          <strong style={{ color: wOwner.color }}>{wOwner.name}</strong> campeón — se lleva los
          ${POZO.toLocaleString()}
        </>
      )
    } else if (wOwner.id === lOwner.id) {
      resumen = (
        <>
          <strong style={{ color: wOwner.color }}>{wOwner.name}</strong> avanza con{' '}
          {TEAMS[match.winner].name}
        </>
      )
    } else {
      const vivos = lOwner.teams.filter((t) => !bracket.eliminated.has(t))
      resumen = (
        <>
          <strong style={{ color: wOwner.color }}>{wOwner.name}</strong> avanza ·{' '}
          <strong style={{ color: lOwner.color }}>{lOwner.name}</strong>{' '}
          {vivos.length
            ? `sigue vivo con ${vivos.map((t) => TEAMS[t].name).join(' y ')}`
            : 'queda eliminado'}
        </>
      )
    }
  }

  return (
    <button className={`mini-match${abierto ? ' abierto' : ''}`} onClick={onGoTo}>
      <span className="mini-chevron" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </span>
      <span className="mini-when">
        {fechaCorta(match.date)} · {match.tbd ? 'hora por confirmar' : `${match.time} h`}
        {comoTermino ? ` · ${comoTermino}` : ''}
      </span>
      <span className="mini-teams">
        <span className={`mini-lado${claseLado(match.homeTeam)}`}>
          {home ? (
            <>
              <Bandera teamId={match.homeTeam} /> {home.name}
            </>
          ) : (
            'Por definir'
          )}
        </span>
        {marcador ? (
          <strong className="mini-score">{marcador}</strong>
        ) : (
          <span className="mini-vs"> vs </span>
        )}
        <span className={`mini-lado${claseLado(match.awayTeam)}`}>
          {away ? (
            <>
              <Bandera teamId={match.awayTeam} /> {away.name}
            </>
          ) : (
            'Por definir'
          )}
        </span>
      </span>
      {resumen ? (
        <span className="mini-resumen">{resumen}</span>
      ) : (
        homeOwner &&
        awayOwner && (
          <span className="mini-duel">
            {homeOwner.id === awayOwner.id ? (
              <>
                <strong style={{ color: homeOwner.color }}>{homeOwner.name}</strong> avanza
                seguro
              </>
            ) : (
              <>
                <strong style={{ color: homeOwner.color }}>{homeOwner.name}</strong>
                <span className="mini-vs"> vs </span>
                <strong style={{ color: awayOwner.color }}>{awayOwner.name}</strong>
              </>
            )}
          </span>
        )
      )}
    </button>
  )
}

// Chip dinámico: elige solo el siguiente partido por arrancar y se
// actualiza en vivo; el formato se adapta a qué tan cerca está
function Countdown({ matches }) {
  const [ahora, setAhora] = useState(() => AHORA())
  useEffect(() => {
    const t = setInterval(() => setAhora(AHORA()), ES_SIM ? 1_000 : 30_000)
    return () => clearInterval(t)
  }, [])
  const match = matches.find(
    (m) => !m.winner && m.live?.state !== 'in' && new Date(m.utc).getTime() > ahora
  )
  if (!match) return null
  const diff = new Date(match.utc).getTime() - ahora
  const mins = Math.floor(diff / 60_000)
  const horas = Math.floor(diff / 3_600_000)
  let falta
  if (mins < 1) falta = '¡ya casi arranca!'
  else if (horas < 1) falta = `en ${mins} min`
  else if (match.date === todayStr()) falta = `hoy · en ${horas}h ${mins % 60}m`
  else falta = `${fechaCorta(match.date)} · ${match.time} h`
  const home = match.homeTeam ? TEAMS[match.homeTeam] : null
  const away = match.awayTeam ? TEAMS[match.awayTeam] : null
  return (
    <div className="countdown">
      <div className="cd-head">
        <span className="cd-tag">Siguiente partido</span>
        <span className="cd-time">{falta}</span>
      </div>
      <div className="cd-teams">
        <span className="cd-team">
          {home && <Bandera teamId={match.homeTeam} />} {home ? home.name : 'Por definir'}
        </span>
        <span className="mini-vs">vs</span>
        <span className="cd-team">
          {away && <Bandera teamId={match.awayTeam} />} {away ? away.name : 'Por definir'}
        </span>
      </div>
    </div>
  )
}

// Ticker fijo con los partidos en vivo: siempre visible bajo los tabs,
// tocarlo lleva directo a la tarjeta del partido
function LiveTicker({ bracket, onVer }) {
  const enVivo = bracket.resolved.filter((m) => m.live?.state === 'in')
  if (!enVivo.length) return null
  return (
    <div className="live-ticker">
      {enVivo.map((m) => {
        const sh = m.live.shootout ?? {}
        const pens = Object.values(sh).some((v) => v != null)
        return (
          <button key={m.id} className="ticker-chip" onClick={() => onVer(m)}>
            <span className="live-dot" />
            <Bandera teamId={m.homeTeam} />{' '}
            {pens
              ? `${sh[m.homeTeam] ?? 0}–${sh[m.awayTeam] ?? 0}`
              : `${m.live.score?.[m.homeTeam]}–${m.live.score?.[m.awayTeam]}`}{' '}
            <Bandera teamId={m.awayTeam} />
            <span className="ticker-min">
              {pens ? 'Pens' : m.live.halftime ? 'MT' : m.live.clock}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// Tab "Hoy": partidos del día, los que vienen y los últimos resultados
function Hoy({ bracket, goToLlaves, onPick }) {
  // Renglón expandido: tocar un partido de las listas abre su detalle completo
  const [abierto, setAbierto] = useState(null)
  const porFecha = [...bracket.resolved].sort((a, b) =>
    `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)
  )
  // Jornada activa: se queda en el día jugado hasta ~2h antes del siguiente
  const jornada = jornadaHoy(porFecha, AHORA())
  const esHoyReal = jornada === todayStr()
  // Orden cronológico estable — los partidos nunca cambian de lugar; los que
  // están en vivo se tienen presentes con el ticker fijo de arriba
  const deHoy = porFecha.filter((m) => m.date === jornada)
  const proximos = porFecha.filter((m) => m.date > jornada && !m.winner)
  const jugados = porFecha.filter((m) => m.winner && m.date < jornada).reverse()
  const siguienteFecha = proximos[0]?.date
  const tituloJornada = fechaLarga(jornada)

  return (
    <div className="hoy">
      <Countdown matches={porFecha} />
      <h2 className="round-title">
        {esHoyReal ? `Hoy · ${tituloJornada}` : tituloJornada}
      </h2>
      {deHoy.length > 0 ? (
        <div className="round-matches">
          {deHoy.map((m) => (
            <MatchCard key={m.id} match={m} champion={bracket.champion} meta onPick={onPick} />
          ))}
        </div>
      ) : (
        <div className="today-empty">
          <p>Hoy no hay partidos de la quiniela.</p>
          {siguienteFecha && (
            <p className="today-empty-next">
              El siguiente es el <strong>{fechaLarga(siguienteFecha)}</strong>
            </p>
          )}
        </div>
      )}

      {proximos.length > 0 && (
        <>
          <h2 className="round-title next-title">Próximos partidos</h2>
          <div className="mini-list">
            {proximos.slice(0, 5).map((m) => (
              <div key={m.id} className="mini-item">
                <MiniMatch
                  match={m}
                  bracket={bracket}
                  abierto={abierto === m.id}
                  onGoTo={() => setAbierto(abierto === m.id ? null : m.id)}
                />
                {abierto === m.id && <MatchCard match={m} champion={bracket.champion} meta />}
              </div>
            ))}
          </div>
        </>
      )}

      {jugados.length > 0 && (
        <>
          <h2 className="round-title next-title">Últimos resultados</h2>
          <div className="mini-list">
            {jugados.slice(0, 5).map((m) => (
              <div key={m.id} className="mini-item">
                <MiniMatch
                  match={m}
                  bracket={bracket}
                  abierto={abierto === m.id}
                  onGoTo={() => setAbierto(abierto === m.id ? null : m.id)}
                />
                {abierto === m.id && <MatchCard match={m} champion={bracket.champion} meta />}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Vista de cuadro (bracket gráfico) ──

function CuadroTeam({ teamId, match }) {
  const team = teamId ? TEAMS[teamId] : null
  const owner = teamId ? OWNER_BY_TEAM[teamId] : null
  const isWinner = match.winner && match.winner === teamId
  const isLoser = match.winner && match.winner !== teamId
  const ev = match.live
  const score = ev && ev.state !== 'pre' ? ev.score?.[teamId] : null

  if (!team) {
    return (
      <div className="cteam pending">
        <span className="cteam-flag">
          <Bandera />
        </span>
        <span className="cteam-name">A definir</span>
      </div>
    )
  }
  return (
    <div className={`cteam${isWinner ? ' winner' : ''}${isLoser ? ' loser' : ''}`}>
      <span className="cteam-flag">
        <Bandera teamId={teamId} />
      </span>
      <span className="cteam-mid">
        <span className="cteam-name">{team.name}</span>
        {owner && (
          <span className="cteam-owner" style={{ color: owner.color }}>
            {owner.name}
          </span>
        )}
      </span>
      {score != null && <span className="cteam-score">{score}</span>}
      {isWinner && score == null && <span className="cteam-check">✓</span>}
    </div>
  )
}

function cuadroStatus(match) {
  const ev = match.live
  if (ev?.state === 'in') {
    const sh = ev.shootout ?? {}
    if (Object.values(sh).some((v) => v != null)) {
      return `Penales ${sh[match.homeTeam] ?? 0}-${sh[match.awayTeam] ?? 0}`
    }
    return ev.halftime ? 'Medio tiempo' : `En vivo · ${ev.clock}`
  }
  if (ev?.state === 'post') {
    if (ev.finish === 'pens') {
      const sh = ev.shootout
      return `Fin · pen ${sh?.[match.homeTeam] ?? '?'}-${sh?.[match.awayTeam] ?? '?'}`
    }
    if (ev.finish === 'aet') return 'Fin · t. extra'
    return 'Fin'
  }
  if (match.winner) return 'Fin'
  return `${fechaCorta(match.date)} · ${match.tbd ? 'por confirmar' : `${match.time} h`}`
}

function CuadroCard({ match, champion }) {
  const enVivo = match.live?.state === 'in'
  return (
    <div className={`ccard${match.winner ? ' decided' : ''}${enVivo ? ' playing' : ''}`}>
      <div className="ccard-status">
        {cuadroStatus(match)}
        {champion && match.id === 'f1' && match.winner ? ' · campeón' : ''}
      </div>
      <CuadroTeam teamId={match.homeTeam} match={match} />
      <CuadroTeam teamId={match.awayTeam} match={match} />
    </div>
  )
}

// Agrupa los partidos de una ronda en parejas que alimentan al siguiente cruce
function enParejas(matches) {
  const pares = []
  for (let i = 0; i < matches.length; i += 2) pares.push(matches.slice(i, i + 2))
  return pares
}

function Cuadro({ bracket }) {
  const porRonda = (r) => bracket.resolved.filter((m) => m.round === r)
  return (
    <div className="cuadro-scroll">
      <div className="cuadro">
        {[0, 1, 2].map((r) => (
          <div className="cuadro-col" key={r}>
            <div className="cuadro-col-title">{ROUNDS[r]}</div>
            <div className="cuadro-body">
              {enParejas(porRonda(r)).map((par, i) => (
                <div className="cpair" key={i}>
                  {par.map((m) => (
                    <div className="cslot" key={m.id}>
                      <CuadroCard match={m} champion={bracket.champion} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="cuadro-col">
          <div className="cuadro-col-title">Final</div>
          <div className="cuadro-body">
            <div className="cpair solo">
              <div className="cslot">
                <CuadroCard match={porRonda(3)[0]} champion={bracket.champion} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Amigos({ bracket }) {
  const status = OWNERS.map((o) => {
    const teams = o.teams.map((t) => ({
      id: t,
      ...TEAMS[t],
      out: bracket.eliminated.has(t),
      champ: bracket.champion === t,
    }))
    const alive = teams.filter((t) => !t.out).length
    return { ...o, teamStatus: teams, alive }
  })

  // Torneo terminado: estado final con ganador destacado, sin "en la pelea"
  if (bracket.champion) {
    const campeon = OWNER_BY_TEAM[bracket.champion]
    const final = bracket.resolved.find((m) => m.id === 'f1')
    const subTeam = final.winner === final.homeTeam ? final.awayTeam : final.homeTeam
    const subOwner = subTeam ? OWNER_BY_TEAM[subTeam] : null
    const ganador = status.find((s) => s.id === campeon.id)
    const resto = status
      .filter((s) => s.id !== campeon.id)
      .sort((a, b) => (a.id === subOwner?.id ? -1 : b.id === subOwner?.id ? 1 : 0))
    return (
      <div className="amigos">
        <h2 className="round-title">Resultado final</h2>
        <FriendCard owner={ganador} tag={`Campeón · $${POZO.toLocaleString()}`} campeon />
        <h2 className="round-title out-title">Los demás</h2>
        {resto.map((o) => (
          <FriendCard key={o.id} owner={o} tag={o.id === subOwner?.id ? 'Subcampeón' : null} />
        ))}
      </div>
    )
  }

  const vivos = status.filter((s) => s.alive > 0).sort((a, b) => b.alive - a.alive)
  const fuera = status.filter((s) => s.alive === 0)

  return (
    <div className="amigos">
      <div className="amigos-summary">
        <div className="summary-pill alive-pill">{vivos.length} siguen vivos</div>
        <div className="summary-pill out-pill">{fuera.length} eliminados</div>
        <div className="summary-pill bolsa-pill">Bolsa ${POZO.toLocaleString()}</div>
      </div>
      <h2 className="round-title">Siguen en la pelea</h2>
      {vivos.map((o) => (
        <FriendCard key={o.id} owner={o} />
      ))}
      {fuera.length > 0 && (
        <>
          <h2 className="round-title out-title">Eliminados</h2>
          {fuera.map((o) => (
            <FriendCard key={o.id} owner={o} />
          ))}
        </>
      )}
    </div>
  )
}

function FriendCard({ owner, tag, campeon }) {
  const dead = owner.alive === 0 && !campeon && !tag
  return (
    <div
      className={`friend-card${dead ? ' dead' : ''}${campeon ? ' es-campeon' : ''}`}
      style={{ '--owner': owner.color }}
    >
      <div className="friend-head">
        <OwnerChip owner={owner} />
        {tag ? (
          <span className={`friend-tag${campeon ? ' campeon' : ''}`}>{tag}</span>
        ) : (
          <span className="friend-count">{dead ? 'sin equipos' : `${owner.alive} de 2 vivos`}</span>
        )}
      </div>
      <div className="friend-teams">
        {owner.teamStatus.map((t) => (
          <span key={t.id} className={`friend-team${t.out ? ' out' : ''}${t.champ ? ' champ' : ''}`}>
            <Bandera teamId={t.id} /> {t.name}
            {t.champ ? ' ★' : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

// Estado de resultados: en vivo vía Supabase si hay credenciales, si no, local
function useResults() {
  const [results, setResults] = useState(ES_SIM ? {} : loadResults)
  const [online, setOnline] = useState(false)

  useEffect(() => {
    if (ES_SIM) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(results))
  }, [results])

  useEffect(() => {
    if (!hasSupabase || ES_SIM) return
    let active = true
    fetchResults()
      .then((remote) => {
        if (!active) return
        setResults(remote)
        setOnline(true)
      })
      .catch(() => setOnline(false))
    const unsubscribe = subscribeResults((payload) => {
      setResults((prev) => {
        const next = { ...prev }
        if (payload.eventType === 'DELETE') delete next[payload.old.match_id]
        else next[payload.new.match_id] = payload.new.winner
        return next
      })
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  // Registro automático desde el marcador en vivo: ganador + marcador final
  const applyLive = (matchId, teamId, marcador) => {
    setResults((prev) => (prev[matchId] === teamId ? prev : { ...prev, [matchId]: teamId }))
    if (hasSupabase && !ES_SIM) {
      saveResult(matchId, teamId, marcador).then(
        ({ error }) => error && console.error('Error al sincronizar:', error.message)
      )
    }
  }

  // Corrección manual (solo modo admin): toca para marcar, re-toca para deshacer
  const pick = (matchId, teamId) => {
    setResults((prev) => {
      const undo = prev[matchId] === teamId
      const next = { ...prev }
      if (undo) delete next[matchId]
      else next[matchId] = teamId
      if (hasSupabase && !ES_SIM) {
        const op = undo ? deleteResult(matchId) : saveResult(matchId, teamId)
        op.then(({ error }) => error && console.error('Error al sincronizar:', error.message))
      }
      return next
    })
  }

  return { results, applyLive, pick, online }
}

// Cadencia del sondeo según el momento: pegado al partido, casi en vivo
function pollDelay(data) {
  const events = Object.values(data)
  // Partido en curso: cada 10s para que los goles caigan casi al instante
  if (events.some((e) => e.state === 'in')) return 10_000
  // Partido por arrancar (30 min antes) o recién terminado: cada 30s
  const ahora = Date.now()
  const cerca = events.some((e) => {
    const kickoff = new Date(e.utc).getTime()
    return e.state === 'pre' && kickoff - ahora < 30 * 60_000 && kickoff - ahora > 0
  })
  if (cerca) return 30_000
  // Día tranquilo: cada 3 min
  return 180_000
}

// Al caer un gol: vibra el teléfono y parpadea el título de la pestaña
const TITULO_ORIGINAL = document.title
let tituloTimer
function avisoDeGol(teamId, ev) {
  navigator.vibrate?.([200, 100, 200])
  const ids = Object.keys(ev.score)
  const marcador = `${ev.score[ids[0]]}-${ev.score[ids[1]]}`
  document.title = `⚽ ¡GOOOL de ${TEAMS[teamId].name}! ${marcador}`
  clearTimeout(tituloTimer)
  tituloTimer = setTimeout(() => {
    document.title = TITULO_ORIGINAL
  }, 15_000)
}

// Sondea el marcador de ESPN y refresca al instante al volver a la pestaña
function useLive() {
  const [live, setLive] = useState({})
  const prevRef = useRef({})
  useEffect(() => {
    let timer
    let active = true
    const poll = async () => {
      clearTimeout(timer)
      try {
        const data = ES_SIM ? simLive() : await fetchLive()
        if (!active) return
        // Detecta goles nuevos comparando contra el sondeo anterior
        for (const [pair, ev] of Object.entries(data)) {
          const antes = prevRef.current[pair]
          if (!antes || ev.state !== 'in') continue
          for (const id of Object.keys(ev.score)) {
            if (Number(ev.score[id]) > Number(antes.score?.[id] ?? 0)) avisoDeGol(id, ev)
          }
        }
        prevRef.current = data
        setLive(data)
        timer = setTimeout(poll, ES_SIM ? 1_000 : pollDelay(data))
      } catch {
        if (active) timer = setTimeout(poll, 30_000)
      }
    }
    // Al desbloquear el teléfono o volver a la pestaña, consulta de inmediato
    const onVisible = () => {
      if (document.visibilityState === 'visible') poll()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    poll()
    return () => {
      active = false
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [])
  return live
}

// Texto del registro permanente: "2-1", "1-1 (pen 4-2)", "2-1 (t. extra)"
function marcadorTexto(m) {
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

export default function App() {
  const { results, applyLive, pick, online } = useResults()
  const live = useLive()
  const [theme, setTheme] = useState(loadTheme)
  const [tab, setTab] = useState('hoy')
  const [vista, setVista] = useState('cuadro')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const bracket = useMemo(() => computeBracket(results, live), [results, live])
  const champOwner = bracket.champion ? OWNER_BY_TEAM[bracket.champion] : null

  // Cuando un partido termina según ESPN, registra ganador y marcador solito
  useEffect(() => {
    for (const m of bracket.resolved) {
      if (m.live?.state === 'post' && m.live.winnerId && results[m.id] !== m.live.winnerId) {
        applyLive(m.id, m.live.winnerId, marcadorTexto(m))
      }
    }
  }, [bracket, results])

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <div className="brand">
            <img className="brand-logo" src="/ajolote.svg" alt="" />
            <h1 className="title">Tómbola del Ajolotl</h1>
          </div>
          <button
            className="theme-btn"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Cambiar tema"
          >
            {theme === 'dark' ? <IconSol /> : <IconLuna />}
          </button>
        </div>
        <p className="tagline">
          Mundial 2026 · Quiniela de los Coonstl
          <span className={`sync-pill${online ? ' online' : ''}`}>
            <span className="estado-dot" />
            {online ? 'En vivo' : 'Local'}
          </span>
          {ES_ADMIN && <span className="sync-pill admin-pill">admin</span>}
          {ES_SIM && <span className="sync-pill admin-pill">demo</span>}
        </p>
      </header>

      {champOwner && (
        <div className="champion-banner" style={{ '--owner': champOwner.color }}>
          <div className="champion-trophy">🏆</div>
          <div>
            <div className="champion-team">
              <Bandera teamId={bracket.champion} /> {TEAMS[bracket.champion].name} — ¡Campeón del
              Mundo!
            </div>
            <div className="champion-owner">
              <strong>{champOwner.name}</strong> se lleva la bolsa de ${POZO.toLocaleString()} MXN
            </div>
          </div>
        </div>
      )}

      <nav className="tabs">
        <button className={tab === 'hoy' ? 'active' : ''} onClick={() => setTab('hoy')}>
          Hoy
        </button>
        <button className={tab === 'llaves' ? 'active' : ''} onClick={() => setTab('llaves')}>
          El Camino
        </button>
        <button className={tab === 'amigos' ? 'active' : ''} onClick={() => setTab('amigos')}>
          Coonstl
        </button>
      </nav>

      <LiveTicker
        bracket={bracket}
        onVer={(m) => {
          setTab('hoy')
          setTimeout(() => {
            document
              .getElementById(`match-${m.id}`)
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }, 120)
        }}
      />

      {tab === 'hoy' && <Hoy bracket={bracket} goToLlaves={() => setTab('llaves')} onPick={pick} />}
      {tab === 'llaves' && (
        <>
          <div className="vista-toggle">
            <button
              className={vista === 'cuadro' ? 'active' : ''}
              onClick={() => setVista('cuadro')}
            >
              <IconBracket /> Bracket
            </button>
            <button className={vista === 'lista' ? 'active' : ''} onClick={() => setVista('lista')}>
              <IconLista /> Lista
            </button>
          </div>
          {vista === 'cuadro' ? (
            <Cuadro bracket={bracket} />
          ) : (
            <Bracket bracket={bracket} onPick={pick} />
          )}
        </>
      )}
      {tab === 'amigos' && <Amigos bracket={bracket} />}

      <footer className="footer">
        <p>
          Goles, marcadores y resultados llegan en tiempo real desde el marcador oficial de{' '}
          <strong>ESPN</strong>. Durante un partido se actualiza cada pocos segundos y el ganador
          avanza solo de ronda — aquí nadie captura nada a mano.
        </p>
        <span className="footer-tz">Horarios en tu hora local ({zonaHoraria()})</span>
      </footer>
    </div>
  )
}
