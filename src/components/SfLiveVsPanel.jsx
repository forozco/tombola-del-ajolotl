// ── Panel de pelea EN VIVO estilo arcade ──────────────────────────────────
// Se muestra encima del roster cuando hay un partido en curso (o cuando uno
// acaba de terminar dentro de la ventana de aftermath). Reproduce la pantalla
// VS de Street Fighter: dos peleadores frente a frente sobre el escenario
// del anfitrión, con banderas, marcador, minuto y — si aplica — sello WIN o
// K.O. cuando ya se decidió. Si hay más de un partido en vivo, se apilan.

import { useEffect, useState } from 'react'
import { OWNER_BY_TEAM, TEAMS } from '../data.js'
import { FIGHTERS } from '../sf.js'
import { finishLabel } from '../lib/matches.js'
import { AHORA, ES_SIM } from '../lib/modes.js'
import { Bandera } from './Bandera.jsx'

// Etiquetas arcade para los estados alterados que ESPN reporta. Reemplazan
// el label FIGHT!/FINAL en el top-bar cuando el partido no está en curso
// normal. Se muestran en mayúsculas para conservar el look.
const SF_ALTERED_LABEL = {
  delayed: 'INICIO RETRASADO',
  postponed: 'REPROGRAMADO',
  suspended: 'MATCH PAUSED',
  canceled: 'CANCELADO',
  rescheduled: 'HORARIO MOVIDO',
}

// Ventana de "aftermath" tras el pitazo final: el panel WIN/K.O. sigue arriba
// del roster durante este tiempo antes de ceder al NEXT FIGHT del siguiente
// partido. Se mide desde el kickoff porque ESPN no da un timestamp de fin —
// asumimos que el partido dura como máximo 2h 30min (regular + tiempo extra
// + penales) y damos 30 min extra de "sabor" post-partido.
const AFTERMATH_GRACE_MS = 30 * 60 * 1000
const MATCH_MAX_DURATION_MS = 2.5 * 60 * 60 * 1000
const AFTERMATH_TOTAL_MS = MATCH_MAX_DURATION_MS + AFTERMATH_GRACE_MS

// Chequea si el partido terminó recientemente (dentro de la ventana aftermath).
// Devuelve false para partidos sin ganador o cuyo kickoff fue hace más de la
// ventana total (habitual para partidos de días anteriores). Exportado para
// que el NextFightPanel lo use como negación de "hay aftermath".
export function isRecentAftermath(match, now) {
  if (!match.winner) return false
  const kickoff = new Date(match.utc).getTime()
  return now - kickoff < AFTERMATH_TOTAL_MS
}

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

export function LiveVsPanel({ bracket }) {
  // Reloj propio para expirar el aftermath sin depender del polling de useLive
  // (que puede no correr si ESPN dice que ya no hay live). Solo tickea cuando
  // hay un candidato aftermath — en cualquier otro caso, dormido.
  const [now, setNow] = useState(() => AHORA())
  const enVivo = bracket.resolved.filter((m) => m.live?.state === 'in')
  // "Aftermath": el partido terminado más reciente dentro de la ventana de
  // 30 min tras el pitazo final. Se muestra cuando NO hay ningún partido en
  // vivo (si hay live, ese manda). Cuando expira, cede al NEXT FIGHT panel.
  const aftermath = enVivo.length
    ? null
    : bracket.resolved
        .filter((m) => isRecentAftermath(m, now))
        .sort((a, b) => new Date(b.utc) - new Date(a.utc))[0]
  useEffect(() => {
    if (!aftermath) return undefined
    const t = setInterval(() => setNow(AHORA()), ES_SIM ? 200 : 30_000)
    return () => clearInterval(t)
  }, [aftermath])
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
