// ── Bracket estilo arcade (roster + tarjetas de pelea) ─────────────────────
// Componentes que forman el "select your fighter" (RosterCell) y el cuadro
// eliminatorio con tarjetas de pelea (SfCard / SfFighter). Estos viven acá
// porque son específicos de la vista Street Fighter; el resto de la app usa
// MatchCard / Bandera / OwnerChip para los mismos datos.

import { OWNER_BY_TEAM } from '../data.js'
import { FIGHTERS } from '../sf.js'
import { fechaCorta } from '../lib/dates.js'

// ── Roster (select your fighter) ───────────────────────────────────────────

export function RosterCell({ owner, bracket }) {
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

export function SfCard({ match }) {
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
