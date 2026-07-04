// ── Tarjeta grande de un partido ──
// Es el componente central de la app. Muestra estado del partido (pre / en
// vivo / terminado), marcador, minuto, penales, tiempo extra, ambos equipos
// con su bandera + dueño + gol × gol, la crónica del resultado en clave de
// quiniela cuando ya se decidió, y la barra de posesión sutil al final.
//
// Ensambla 4 sub-componentes que solo tienen sentido en su contexto y que
// por eso viven en el mismo archivo (cohesión alta):
//   - TeamRow: renglón de un equipo (bandera, nombre, dueño, marcador)
//   - FriendOutcome: "Fertl avanza · Phoccotl sigue vivo con Canadá"
//   - PossessionBar: barra fina de posesión (solo si ESPN la dio)
//   - GolesDe: lista de goles de un equipo, bajo su renglón

import { TEAMS, OWNER_BY_TEAM, ROUNDS, POZO } from '../data.js'
import { finishLabel } from '../lib/matches.js'
import { ES_ADMIN } from '../lib/modes.js'
import { Bandera } from './Bandera.jsx'
import { OwnerChip } from './OwnerChip.jsx'

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
  return (
    <div className="friend-outcome">
      <strong style={{ color: wOwner.color }}>{wOwner.name}</strong> avanza ·{' '}
      <strong style={{ color: lOwner.color }}>{lOwner.name}</strong>{' '}
      {vivos.length
        ? `sigue vivo con ${vivos.map((t) => TEAMS[t].name).join(' y ')}`
        : 'queda eliminado'}
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
      <TeamRow teamId={match.awayTeam} match={match} champion={champion} onPick={onPick} />
      {meta && <GolesDe match={match} teamId={match.awayTeam} />}
      {meta && <PossessionBar match={match} />}
    </div>
  )
}
