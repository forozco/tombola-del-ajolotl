// ── Tarjeta grande de un partido ──
// Es el componente central de la app. Muestra estado del partido (pre / en
// vivo / terminado), marcador, minuto, penales, tiempo extra, ambos equipos
// con su bandera + dueño + gol × gol, la crónica del resultado en clave de
// quiniela cuando ya se decidió, y la barra de posesión sutil al final.
//
// Ensambla varios sub-componentes que solo tienen sentido en su contexto y
// que por eso viven en el mismo archivo (cohesión alta):
//   - TeamRow: renglón de un equipo (bandera, nombre, dueño, marcador)
//   - FriendOutcome: "Fertl avanza · Phoccotl sigue vivo con Canadá"
//   - PossessionBar: barra fina de posesión (solo si ESPN la dio)
//   - CornersRow: contador de tiros de esquina, mismo estilo que la posesión
//   - GolesDe: lista de goles de un equipo, bajo su renglón

import { TEAMS, OWNER_BY_TEAM, ROUNDS, POZO } from '../data.js'
import { finishLabel, venueLabel } from '../lib/matches.js'
import { localTimeStr } from '../lib/dates.js'
import { ES_ADMIN } from '../lib/modes.js'
import { Bandera } from './Bandera.jsx'
import { OwnerChip } from './OwnerChip.jsx'
import { IconPin, IconClock, IconWarning, IconPause, IconX } from './Icons.jsx'

// Renglón de equipo dentro de la card: bandera + nombre + chip del amigo +
// marcador (si aplica) + ✓/★ si ganó. En modo admin, el renglón es clicable
// para corregir manualmente al ganador.
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
      {/* key={score} fuerza remount al cambiar → dispara la animación score-pop */}
      {score != null && <span key={score} className="score">{score}</span>}
      {match.winner && (
        <span className="check">{isWinner ? (champion === teamId ? '★' : '✓') : ''}</span>
      )}
    </div>
  )
}

// Crónica del amigo en un partido terminado: quién avanza y cómo queda el
// perdedor. Reemplaza el "Amigo vs Amigo" neutral cuando hay ganador.
function FriendOutcome({ match, bracket }) {
  const wOwner = OWNER_BY_TEAM[match.winner]
  const perdedor = match.winner === match.homeTeam ? match.awayTeam : match.homeTeam
  const lOwner = OWNER_BY_TEAM[perdedor]
  if (!wOwner || !lOwner) return null

  if (match.id === 'f1') {
    return (
      <div className="friend-outcome campeon">
        🏆 <strong style={{ color: wOwner.color }}>{wOwner.name}</strong> campeón — se lleva los $
        {POZO.toLocaleString()}
      </div>
    )
  }
  if (wOwner.id === lOwner.id) {
    return (
      <div className="friend-outcome same">
        <strong style={{ color: wOwner.color }}>{wOwner.name}</strong> avanza con{' '}
        {TEAMS[match.winner].name}
      </div>
    )
  }
  const vivos = lOwner.teams.filter((t) => !bracket.eliminated.has(t))
  const winnerName = TEAMS[match.winner]?.name ?? ''
  return (
    <div className="friend-outcome">
      <strong style={{ color: wOwner.color }}>{wOwner.name}</strong>
      {winnerName ? ` avanza con ${winnerName}` : ' avanza'} ·{' '}
      <strong style={{ color: lOwner.color }}>{lOwner.name}</strong>{' '}
      {vivos.length
        ? `sigue vivo con ${vivos.map((t) => TEAMS[t].name).join(' y ')}`
        : 'queda eliminado'}
    </div>
  )
}

// Fila de tiros de esquina: dato de "sabor" al pie de la card, mismo estilo
// visual que la posesión pero sin barra (son enteros, no %). Cuando aparece
// justo debajo de la posesión, el CSS omite su border-top para que se lea
// como parte del mismo bloque stats. Fade-in al aparecer.
function CornersRow({ match }) {
  const c = match.live?.corners
  if (!c || !match.homeTeam || !match.awayTeam) return null
  const homeName = TEAMS[match.homeTeam]?.name
  const awayName = TEAMS[match.awayTeam]?.name
  return (
    <div
      className="corners"
      role="img"
      aria-label={`Tiros de esquina: ${homeName} ${c.home}, ${awayName} ${c.away}`}
    >
      <span className="corners-count">{c.home}</span>
      <span className="corners-label">Tiros de esquina</span>
      <span className="corners-count">{c.away}</span>
    </div>
  )
}

// Barra de posesión: dato de "sabor" muy discreto (track de 4px). Solo
// aparece cuando ESPN la trae (en vivo tras los primeros minutos) o cuando
// el partido ya terminó y quedó en el snapshot. Fade-in al aparecer.
function PossessionBar({ match }) {
  const p = match.live?.possession
  if (!p || !match.homeTeam || !match.awayTeam) return null
  const homeName = TEAMS[match.homeTeam]?.name
  const awayName = TEAMS[match.awayTeam]?.name
  return (
    <div
      className="possession"
      role="img"
      aria-label={`Posesión: ${homeName} ${p.home}%, ${awayName} ${p.away}%`}
    >
      <div className="poss-header">
        <span className="poss-pct">{p.home}%</span>
        <span className="poss-label">Posesión</span>
        <span className="poss-pct">{p.away}%</span>
      </div>
      <div className="poss-track">
        <div className="poss-home" style={{ width: `${p.home}%` }} />
        <div className="poss-away" style={{ width: `${p.away}%` }} />
      </div>
    </div>
  )
}

// Badge que anuncia una alteración del partido reportada por ESPN: retrasado
// (empieza más tarde el mismo día), reprogramado (cambió a otra fecha),
// suspendido (paró a mitad y se reanudará) o cancelado (no se juega). No se
// muestra nada si ESPN dice que todo es normal. La `description` viene de
// ESPN ("Rain Delay", "Postponed", etc.) — cuando existe, la exponemos.
const ALTERED_LABEL = {
  delayed: { Icon: IconClock, text: 'INICIO RETRASADO' },
  postponed: { Icon: IconWarning, text: 'REPROGRAMADO' },
  suspended: { Icon: IconPause, text: 'SUSPENDIDO' },
  canceled: { Icon: IconX, text: 'CANCELADO' },
  rescheduled: { Icon: IconClock, text: 'HORARIO ACTUALIZADO' },
}

function AlteredBadge({ match }) {
  const alt = match.live?.altered
  if (!alt) return null
  const meta = ALTERED_LABEL[alt.kind] ?? { Icon: IconWarning, text: alt.kind.toUpperCase() }
  const { Icon } = meta
  // Para "rescheduled" (inferido por bracket.js cuando el kickoff de ESPN
  // difiere del hardcoded), armamos la descripción con las dos horas locales
  // para que el usuario vea de dónde a dónde se movió.
  const detail =
    alt.kind === 'rescheduled' && alt.originalUtc && alt.newUtc
      ? `${localTimeStr(alt.originalUtc)} h → ${localTimeStr(alt.newUtc)} h`
      : alt.description
  return (
    <div className={`altered-bar ${alt.kind}`} role="status">
      <span className="altered-icon">
        <Icon />
      </span>
      <span className="altered-text">{meta.text}</span>
      {detail && <span className="altered-detail">· {detail}</span>}
    </div>
  )
}

// Lista de goles de un equipo, mostrada justo debajo de su renglón cuando
// meta=true (vista expandida). Con minuto, goleador y flags (penal / autogol).
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

// Amonestaciones de un equipo: amarillas y rojas con minuto y jugador. La
// segunda amarilla se muestra como amarilla+roja apiladas (ESPN lo marca en
// type.text como "Yellow-Red Card"). Silencio total cuando no hay tarjetas.
function TarjetasDe({ match, teamId }) {
  const cards = match.live?.cards?.filter((c) => c.teamId === teamId) ?? []
  if (!cards.length) return null
  return (
    <div className="tarjetas">
      {cards.map((c, i) => (
        <span key={i} className="tarjeta">
          <span
            className={`card-icon ${c.color}${c.secondYellow ? ' second' : ''}`}
            aria-label={c.color === 'red' ? 'Tarjeta roja' : 'Tarjeta amarilla'}
          />
          <span className="gol-min">{c.minute}</span>{' '}
          <span className="tarjeta-jugador">{c.player}</span>
        </span>
      ))}
    </div>
  )
}

export function MatchCard({ match, champion, bracket, meta, onPick }) {
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
  // La etiqueta neutra "Amigo vs Amigo" se sustituye por la crónica del
  // resultado en cuanto hay ganador y tenemos el bracket para saber si el
  // perdedor sigue vivo con su otro equipo.
  const outcome = Boolean(match.winner && homeOwner && awayOwner && bracket)

  return (
    <div
      id={`match-${match.id}`}
      className={`match-card${match.winner ? ' decided' : ''}${enVivo ? ' playing' : ''}`}
    >
      {meta && (
        <>
          <div className="match-meta">
            <span className="round-chip">{ROUNDS[match.round]}</span>
            <span className="match-time">
              {match.tbd ? 'hora por confirmar' : `${match.time} h`}
            </span>
          </div>
          {/* Venue del estadio: capa 3 (flavor/contexto). Solo si ESPN lo dio;
              si no, línea completa se omite (cero placeholders vacíos). */}
          {venueLabel(match) && (
            <div className="venue-tag">
              <IconPin />
              <span>{venueLabel(match)}</span>
            </div>
          )}
        </>
      )}
      <AlteredBadge match={match} />
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
      {outcome ? (
        <FriendOutcome match={match} bracket={bracket} />
      ) : duel ? (
        <div className="duel-label">
          <strong style={{ color: homeOwner.color }}>{homeOwner.name}</strong>
          <span className="mini-vs"> vs </span>
          <strong style={{ color: awayOwner.color }}>{awayOwner.name}</strong>
        </div>
      ) : homeOwner && awayOwner && homeOwner.id === awayOwner.id ? (
        <div className="duel-label same">
          <strong style={{ color: homeOwner.color }}>{homeOwner.name}</strong> juega contra sí
          mismo — avanza seguro
        </div>
      ) : null}
      <TeamRow teamId={match.homeTeam} match={match} champion={champion} onPick={onPick} />
      {meta && <GolesDe match={match} teamId={match.homeTeam} />}
      {meta && <TarjetasDe match={match} teamId={match.homeTeam} />}
      <TeamRow teamId={match.awayTeam} match={match} champion={champion} onPick={onPick} />
      {meta && <GolesDe match={match} teamId={match.awayTeam} />}
      {meta && <TarjetasDe match={match} teamId={match.awayTeam} />}
      {meta && <PossessionBar match={match} />}
      {meta && <CornersRow match={match} />}
    </div>
  )
}
