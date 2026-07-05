// ── Pestaña "El Camino" · vista Street Fighter ──
// El mismo bracket del torneo, pero ambientado como el arcade: cada amigo es
// un peleador (ver src/sf.js) y aquí solo aparecen los amigos, sin equipos.
//   - Roster arriba: pantalla "select your fighter" con los 8 peleadores;
//     los ya eliminados del torneo salen en gris con su sello K.O.
//   - Bracket: mismas 4 columnas y líneas del Cuadro (reusa su geometría CSS)
//     con tarjetas de pelea: VS parpadeante antes de pelear, barras de vida
//     con FIGHT! en vivo, y retrato golpeado del continue screen al perder.

import { useEffect, useState } from 'react'
import { OWNERS, OWNER_BY_TEAM, ROUNDS, TEAMS } from '../data.js'
import { FIGHTERS } from '../sf.js'
import { fechaCorta, todayStr } from '../lib/dates.js'
import { finishLabel } from '../lib/matches.js'
import { AHORA, ES_BONUS, ES_SIM } from '../lib/modes.js'
import { haptic } from '../haptics.js'
import { Bandera } from './Bandera.jsx'
import { IconJoystick } from './Icons.jsx'
import { BonusStage } from './BonusStage.jsx'

// ── Panel de pelea EN VIVO estilo arcade ──────────────────────────────────
// Se muestra encima del roster cuando hay un partido en curso. Reproduce la
// pantalla VS de Street Fighter: dos peleadores frente a frente sobre el
// escenario del anfitrión, con banderas, marcador y minuto. Si hay más de
// un partido en vivo, se apilan.

function LiveVsFighter({ teamId, match, side }) {
  const owner = OWNER_BY_TEAM[teamId]
  const f = FIGHTERS[owner.id]
  const team = TEAMS[teamId]
  const isWinner = Boolean(match.winner) && match.winner === teamId
  const isLoser = Boolean(match.winner) && match.winner !== teamId
  // El perdedor va con su retrato golpeado del continue screen. El ganador
  // se queda con su stance de pelea (sigue vivo, celebrando). El sprite KO
  // es frontal (no direccional) — no se debe flipear aunque esté a la
  // derecha; solo el stance se voltea para que se enfrenten mirándose.
  const spriteSrc = isLoser ? f.ko : f.stance
  const shouldFlip = side === 'away' && !isLoser
  const cls = `sf-live-side sf-live-${side}${isWinner ? ' winner' : ''}${isLoser ? ' loser' : ''}`
  return (
    <div className={cls}>
      <div className="sf-live-sprite-wrap">
        <img
          className={`sf-live-sprite${f.pixelated ? ' pixelated' : ''}${shouldFlip ? ' flipped' : ''}`}
          src={spriteSrc}
          alt={f.fighter}
        />
        {isLoser && <span className="sf-live-stamp ko">K.O.</span>}
        {isWinner && (
          <span className="sf-live-stamp win">
            {match.id === 'f1' ? '★' : 'WIN'}
          </span>
        )}
      </div>
      <div className="sf-live-meta">
        <span className="sf-live-team">
          <Bandera teamId={teamId} /> {team?.name ?? ''}
        </span>
        <span className="sf-live-owner" style={{ color: owner.color }}>
          {owner.name}
        </span>
        <span className="sf-live-char">{f.fighter}</span>
      </div>
    </div>
  )
}

// Etiquetas arcade para los estados alterados que ESPN reporta. Reemplazan
// el label FIGHT!/FINAL en el top-bar cuando el partido no está en curso
// normal. Se muestran en mayúsculas monoespaciadas para conservar el look.
const SF_ALTERED_LABEL = {
  delayed: 'INICIO RETRASADO',
  postponed: 'REPROGRAMADO',
  suspended: 'MATCH PAUSED',
  canceled: 'CANCELADO',
  rescheduled: 'HORARIO MOVIDO',
}

function LiveVsCard({ match }) {
  if (!match.homeTeam || !match.awayTeam) return null
  const homeOwner = OWNER_BY_TEAM[match.homeTeam]
  const stageFighter = FIGHTERS[homeOwner.id]
  const ev = match.live
  const sh = ev?.shootout ?? {}
  const enPenales = Object.values(sh).some((v) => v != null)
  const isPost = Boolean(match.winner)
  const altered = ev?.altered
  // Label del top-bar: si ESPN dice que el partido está alterado, ese texto
  // gana ("REPROGRAMADO", "SUSPENDIDO"...). Si no, FIGHT!/FINAL como siempre.
  const clockLabel = altered
    ? SF_ALTERED_LABEL[altered.kind] ?? altered.kind.toUpperCase()
    : isPost
    ? (finishLabel(match) ?? 'FINAL').toUpperCase()
    : enPenales
      ? `PENALES ${sh[match.homeTeam] ?? 0}-${sh[match.awayTeam] ?? 0}`
      : ev?.halftime
        ? 'MEDIO TIEMPO'
        : `FIGHT! · ${ev?.clock ?? ''}`
  // Palabra central: VS mientras juega, K.O. al terminar, ★ CHAMPION ★ en
  // la gran final.
  const centerWord = isPost
    ? match.id === 'f1'
      ? '★ CHAMPION ★'
      : 'K.O.'
    : 'VS'
  const homeScore = ev?.score?.[match.homeTeam] ?? 0
  const awayScore = ev?.score?.[match.awayTeam] ?? 0
  return (
    <div
      className={`sf-live-card${isPost ? ' finished' : ''}`}
      style={{ '--sf-live-stage': `url(${stageFighter.stage})` }}
    >
      <div className="sf-live-topbar">
        <span className={`sf-live-clock${isPost ? ' post' : ''}`}>
          <span className="live-dot" /> {clockLabel}
        </span>
        <span className="sf-live-stage-label">{stageFighter.city}</span>
      </div>
      <div className="sf-live-arena">
        <LiveVsFighter teamId={match.homeTeam} match={match} side="home" />
        <div className="sf-live-center">
          <div className={`sf-live-vs-word${isPost ? ' ko' : ''}`}>{centerWord}</div>
          <div className="sf-live-score">
            {/* key={score} fuerza remount al cambiar de valor → dispara la
                animación score-pop que ya tenemos definida en styles.css */}
            <span key={homeScore} className="sf-live-num">{homeScore}</span>
            <span className="sf-live-dash">–</span>
            <span key={awayScore} className="sf-live-num">{awayScore}</span>
          </div>
        </div>
        <LiveVsFighter teamId={match.awayTeam} match={match} side="away" />
      </div>
    </div>
  )
}

function LiveVsPanel({ bracket }) {
  const enVivo = bracket.resolved.filter((m) => m.live?.state === 'in')
  // "Aftermath": el partido terminado más reciente del día de hoy. Se muestra
  // cuando NO hay ningún partido en vivo (si hay live, ese manda; no queremos
  // apilar). El día de hoy se usa como filtro para no arrastrar partidos de
  // días anteriores — el bracket de "El Camino" los sigue mostrando.
  const hoy = todayStr()
  const aftermath = enVivo.length
    ? null
    : bracket.resolved
        .filter((m) => m.winner && m.date === hoy)
        .sort((a, b) => new Date(b.utc) - new Date(a.utc))[0]
  const cards = [...enVivo, ...(aftermath ? [aftermath] : [])]
  if (!cards.length) return null
  return (
    <div className="sf-live-vs">
      {cards.map((m) => (
        <LiveVsCard key={m.id} match={m} />
      ))}
    </div>
  )
}

// ── NEXT FIGHT: attract mode del arcade ────────────────────────────────────
// Cuando NO hay match en vivo y NO hay aftermath del día, mostramos un panel
// tipo "attract mode" con el próximo partido: dos peleadores esperando en
// pose stance, un countdown LED en pixel-font y un GET READY! parpadeante.
// Se re-renderiza cada segundo para que el reloj corra.

// Formatea el tiempo restante para el arcade display. Si falta más de un día,
// prefija con "XD · " (evita mostrar 72:00:00 h y volverse ilegible).
function formatearCuenta(ms) {
  if (ms <= 0) return null
  const totalSeg = Math.floor(ms / 1000)
  const dias = Math.floor(totalSeg / 86_400)
  const horas = Math.floor((totalSeg % 86_400) / 3_600)
  const mins = Math.floor((totalSeg % 3_600) / 60)
  const segs = totalSeg % 60
  const p2 = (n) => String(n).padStart(2, '0')
  const hms = `${p2(horas)}:${p2(mins)}:${p2(segs)}`
  return dias > 0 ? { prefix: `${dias}D`, hms } : { prefix: null, hms }
}

function NextFighter({ teamId, side }) {
  const owner = OWNER_BY_TEAM[teamId]
  const f = FIGHTERS[owner.id]
  const team = TEAMS[teamId]
  const shouldFlip = side === 'away'
  return (
    <div className={`sf-next-side sf-next-${side}`}>
      <div className="sf-next-sprite-wrap">
        <img
          className={`sf-next-sprite${f.pixelated ? ' pixelated' : ''}${shouldFlip ? ' flipped' : ''}`}
          src={f.stance}
          alt={f.fighter}
        />
      </div>
      <div className="sf-next-meta">
        <span className="sf-next-team">
          <Bandera teamId={teamId} /> {team?.name ?? ''}
        </span>
        <span className="sf-next-owner" style={{ color: owner.color }}>
          {owner.name}
        </span>
        <span className="sf-next-char">{f.fighter}</span>
      </div>
    </div>
  )
}

function NextFightPanel({ bracket }) {
  // Prioridad: si hay live o aftermath del día, este panel no aparece
  // (LiveVsPanel se encarga de esos estados).
  const hayLive = bracket.resolved.some((m) => m.live?.state === 'in')
  const hoy = todayStr()
  const hayAftermath = bracket.resolved.some((m) => m.winner && m.date === hoy)
  const [now, setNow] = useState(() => AHORA())

  useEffect(() => {
    if (hayLive || hayAftermath) return undefined
    // En modo sim (?simular) el reloj avanza mucho más rápido — actualizamos
    // más seguido para que el countdown se sienta en tiempo real
    const t = setInterval(() => setNow(AHORA()), ES_SIM ? 200 : 1_000)
    return () => clearInterval(t)
  }, [hayLive, hayAftermath])

  if (hayLive || hayAftermath) return null

  // El próximo partido con ambos equipos definidos y con kickoff aún futuro.
  // Los partidos "por definir" (sin homeTeam/awayTeam) no aplican para
  // countdown — no tendría portraits que mostrar.
  const next = bracket.resolved
    .filter(
      (m) =>
        m.homeTeam &&
        m.awayTeam &&
        !m.winner &&
        m.live?.state !== 'in' &&
        new Date(m.utc).getTime() > now
    )
    .sort((a, b) => new Date(a.utc).getTime() - new Date(b.utc).getTime())[0]

  if (!next) return null

  const cuenta = formatearCuenta(new Date(next.utc).getTime() - now)
  if (!cuenta) return null // por si el clock se pasa mientras rendereamos

  // El stage sale del anfitrión (mismo criterio que LiveVsCard) para que el
  // panel next herede el escenario donde se jugará la próxima pelea.
  const stageFighter = FIGHTERS[OWNER_BY_TEAM[next.homeTeam].id]

  return (
    <div
      className="sf-next-fight"
      style={{ '--sf-live-stage': `url(${stageFighter.stage})` }}
    >
      <div className="sf-next-topbar">
        <span className="sf-next-title">NEXT FIGHT</span>
        <span className="sf-next-stage-label">{stageFighter.city}</span>
      </div>
      <div className="sf-next-arena">
        <NextFighter teamId={next.homeTeam} side="home" />
        <div className="sf-next-center">
          <div className="sf-next-vs">VS</div>
          <div className="sf-next-countdown" aria-label={`Faltan ${cuenta.hms}`}>
            {cuenta.prefix && <span className="sf-next-days">{cuenta.prefix}</span>}
            <span className="sf-next-hms">{cuenta.hms}</span>
          </div>
        </div>
        <NextFighter teamId={next.awayTeam} side="away" />
      </div>
      <div className="sf-next-getready">GET READY!</div>
      <BonusStageTrigger />
    </div>
  )
}

// ── Easter egg trigger ────────────────────────────────────────────────────
// Botoncito discreto con forma de joystick en la esquina del NEXT FIGHT que,
// al tocarse, abre el bonus stage clásico (destruir el auto). Es un secreto
// que la mayoría de usuarios va a descubrir por accidente — de eso se trata
// el easter egg.

// Modo prueba: monta el Bonus Stage abierto de entrada; con EXIT se cierra y
// queda la vista SF normal (recargar la URL con ?bonus lo vuelve a abrir).
function BonusStageTestMode() {
  const [open, setOpen] = useState(true)
  return open ? <BonusStage onClose={() => setOpen(false)} /> : null
}

function BonusStageTrigger() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        className="sf-bonus-trigger"
        onClick={() => {
          haptic.medium()
          setOpen(true)
        }}
        aria-label="Bonus stage (easter egg)"
        title="???"
      >
        <IconJoystick />
      </button>
      {open && <BonusStage onClose={() => setOpen(false)} />}
    </>
  )
}

// ── Roster (select your fighter) ───────────────────────────────────────────

function RosterCell({ owner, bracket }) {
  const f = FIGHTERS[owner.id]
  const eliminado = owner.teams.every((t) => bracket.eliminated.has(t))
  const campeon = bracket.champion && OWNER_BY_TEAM[bracket.champion]?.id === owner.id
  return (
    <div className={`sf-cell${eliminado ? ' out' : ''}${campeon ? ' champ' : ''}`}>
      {/* Mientras siga vivo pelea (stance animado); ya eliminado, su retrato
          golpeado del continue screen */}
      <div className="sf-cell-sprite">
        <img
          className={f.pixelated ? 'pixelated' : ''}
          src={eliminado ? f.ko : f.stance}
          alt={f.fighter}
          loading="lazy"
        />
        {eliminado && <span className="sf-stamp">K.O.</span>}
      </div>
      <span className="sf-cell-name" style={{ color: owner.color }}>
        {owner.name}
      </span>
      <span className="sf-cell-char">{campeon ? '★ CHAMPION ★' : f.fighter}</span>
    </div>
  )
}

// ── Tarjeta de pelea del bracket ───────────────────────────────────────────

// La vida baja con cada gol del rival (26% por golpe, nunca menos de 8%):
// no es ciencia, es drama de arcade.
function vidaDe(match, teamId) {
  const rival = teamId === match.homeTeam ? match.awayTeam : match.homeTeam
  const golpes = match.live?.score?.[rival] ?? 0
  return Math.max(8, 100 - golpes * 26)
}

function SfFighter({ teamId, match }) {
  const owner = teamId ? OWNER_BY_TEAM[teamId] : null
  if (!owner) {
    return (
      <div className="sf-fighter pending">
        <span className="sf-face mystery">?</span>
        <span className="sf-mid">
          <span className="sf-fname">A DEFINIR</span>
        </span>
      </div>
    )
  }
  const f = FIGHTERS[owner.id]
  const isWinner = match.winner && match.winner === teamId
  const isLoser = match.winner && match.winner !== teamId
  const ev = match.live
  const enVivo = ev?.state === 'in'
  const score = ev && ev.state !== 'pre' ? ev.score?.[teamId] : null
  return (
    <div className={`sf-fighter${isWinner ? ' winner' : ''}${isLoser ? ' loser' : ''}`}>
      <span className={`sf-face${f.pixelated ? ' pixelated' : ''}`}>
        <img src={isLoser ? f.ko : f.vs} alt={f.fighter} loading="lazy" />
      </span>
      <span className="sf-mid">
        <span className="sf-fname" style={{ color: owner.color }}>
          {owner.name}
        </span>
        {enVivo ? (
          <span className="sf-health">
            <span style={{ width: `${vidaDe(match, teamId)}%` }} />
          </span>
        ) : (
          <span className="sf-fchar">{f.fighter}</span>
        )}
      </span>
      {score != null && <span className="sf-score">{score}</span>}
      {isWinner && (
        <span className="sf-tag win">{match.id === 'f1' ? '★' : 'WIN'}</span>
      )}
      {isLoser && <span className="sf-tag ko">K.O.</span>}
    </div>
  )
}

function sfStatus(match) {
  const ev = match.live
  if (ev?.state === 'in') {
    const sh = ev.shootout ?? {}
    if (Object.values(sh).some((v) => v != null)) {
      return `PENALES ${sh[match.homeTeam] ?? 0}-${sh[match.awayTeam] ?? 0}`
    }
    if (ev.halftime) return 'MEDIO TIEMPO'
    return `FIGHT! · ${ev.clock}`
  }
  if (match.winner) return match.id === 'f1' ? '★ CHAMPION ★' : 'K.O.'
  if (ev?.state === 'post') return 'K.O.'
  if (!match.homeTeam && !match.awayTeam) return 'COMING SOON'
  return `${fechaCorta(match.date)} · ${match.tbd ? 'TBD' : `${match.time} H`}`
}

function SfCard({ match }) {
  const enVivo = match.live?.state === 'in'
  const conVs = !match.winner && (match.homeTeam || match.awayTeam)
  const vacio = !match.homeTeam && !match.awayTeam
  // Como en el juego: la pelea se juega en el escenario del peleador local.
  // Sin local definido aún, el del visitante; sin nadie, no hay stage.
  const anfitrion = OWNER_BY_TEAM[match.homeTeam] ?? OWNER_BY_TEAM[match.awayTeam]
  const stage = anfitrion ? FIGHTERS[anfitrion.id] : null
  return (
    <div
      className={`sf-card${match.winner ? ' decided' : ''}${enVivo ? ' playing' : ''}${stage ? ' con-stage' : ''}`}
      style={stage ? { '--stage-img': `url(${stage.stage})` } : undefined}
    >
      <div className={`sf-status${enVivo ? ' live' : ''}`}>{sfStatus(match)}</div>
      <SfFighter teamId={match.homeTeam} match={match} />
      {conVs && <div className={`sf-vs${enVivo ? ' fight' : ''}`}>{enVivo ? 'FIGHT!' : 'VS'}</div>}
      {/* Cruce aún sin peleadores: el avioncito del mapa viaja a la
          siguiente pelea, como entre combates del arcade */}
      {vacio && <div className="sf-plane" aria-hidden="true" />}
      <SfFighter teamId={match.awayTeam} match={match} />
      {stage && <div className="sf-stage-label">{stage.city}</div>}
    </div>
  )
}

// ── Vista completa ─────────────────────────────────────────────────────────

// Los partidos de una ronda por parejas (alimentan el mismo cruce siguiente),
// igual que en el Cuadro, para que las líneas conecten donde deben.
const enParejas = (matches) => {
  const pares = []
  for (let i = 0; i < matches.length; i += 2) pares.push(matches.slice(i, i + 2))
  return pares
}

export function StreetFighter({ bracket }) {
  const porRonda = (r) => bracket.resolved.filter((m) => m.round === r)
  return (
    <div className="sf-arcade">
      <div className="sf-marquee">STREET FIGHTER</div>
      <div className="sf-submarquee">TÓMBOLA DEL AJOLOTL EDITION</div>

      <LiveVsPanel bracket={bracket} />
      <NextFightPanel bracket={bracket} />
      {/* Modo prueba (?bonus): abre el juego directo, sin depender de que el
          panel NEXT FIGHT esté visible (con pelea live/aftermath no se monta) */}
      {ES_BONUS ? <BonusStageTestMode /> : null}

      <div className="sf-select-title">SELECT YOUR FIGHTER</div>
      <div className="sf-roster">
        {OWNERS.map((o) => (
          <RosterCell key={o.id} owner={o} bracket={bracket} />
        ))}
      </div>

      <div className="cuadro-scroll sf-scroll">
        <div className="cuadro sf-cuadro">
          {[0, 1, 2].map((r) => (
            <div className="cuadro-col" key={r}>
              <div className="cuadro-col-title sf-col-title">{ROUNDS[r]}</div>
              <div className="cuadro-body">
                {enParejas(porRonda(r)).map((par, i) => (
                  <div className="cpair" key={i}>
                    {par.map((m) => (
                      <div className="cslot" key={m.id}>
                        <SfCard match={m} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="cuadro-col">
            <div className="cuadro-col-title sf-col-title">{ROUNDS[3]}</div>
            <div className="cuadro-body">
              <div className="cpair solo">
                <div className="cslot">
                  <SfCard match={porRonda(3)[0]} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sf-insert-coin">INSERT COIN · 1UP</div>
    </div>
  )
}
