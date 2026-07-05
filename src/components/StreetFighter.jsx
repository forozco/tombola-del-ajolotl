// ── Pestaña "El Camino" · vista Street Fighter ──
// El mismo bracket del torneo, pero ambientado como el arcade: cada amigo es
// un peleador (ver src/sf.js) y aquí solo aparecen los amigos, sin equipos.
//   - Roster arriba: pantalla "select your fighter" con los 8 peleadores;
//     los ya eliminados del torneo salen en gris con su sello K.O.
//   - Bracket: mismas 4 columnas y líneas del Cuadro (reusa su geometría CSS)
//     con tarjetas de pelea: VS parpadeante antes de pelear, barras de vida
//     con FIGHT! en vivo, y retrato golpeado del continue screen al perder.

import { OWNERS, OWNER_BY_TEAM, ROUNDS, TEAMS } from '../data.js'
import { FIGHTERS } from '../sf.js'
import { fechaCorta } from '../lib/dates.js'
import { Bandera } from './Bandera.jsx'

// ── Panel de pelea EN VIVO estilo arcade ──────────────────────────────────
// Se muestra encima del roster cuando hay un partido en curso. Reproduce la
// pantalla VS de Street Fighter: dos peleadores frente a frente sobre el
// escenario del anfitrión, con banderas, marcador y minuto. Si hay más de
// un partido en vivo, se apilan.

function LiveVsFighter({ teamId, side }) {
  const owner = OWNER_BY_TEAM[teamId]
  const f = FIGHTERS[owner.id]
  const team = TEAMS[teamId]
  return (
    <div className={`sf-live-side sf-live-${side}`}>
      <img
        className={`sf-live-sprite${f.pixelated ? ' pixelated' : ''}${side === 'away' ? ' flipped' : ''}`}
        src={f.stance}
        alt={f.fighter}
      />
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
  const clockLabel = enPenales
    ? `PENALES ${sh[match.homeTeam] ?? 0}-${sh[match.awayTeam] ?? 0}`
    : ev?.halftime
      ? 'MEDIO TIEMPO'
      : `FIGHT! · ${ev?.clock ?? ''}`
  const homeScore = ev?.score?.[match.homeTeam] ?? 0
  const awayScore = ev?.score?.[match.awayTeam] ?? 0
  return (
    <div
      className="sf-live-card"
      style={{ '--sf-live-stage': `url(${stageFighter.stage})` }}
    >
      <div className="sf-live-topbar">
        <span className="sf-live-clock">
          <span className="live-dot" /> {clockLabel}
        </span>
        <span className="sf-live-stage-label">{stageFighter.city}</span>
      </div>
      <div className="sf-live-arena">
        <LiveVsFighter teamId={match.homeTeam} side="home" />
        <div className="sf-live-center">
          <div className="sf-live-vs-word">VS</div>
          <div className="sf-live-score">
            {homeScore} <span className="sf-live-dash">–</span> {awayScore}
          </div>
        </div>
        <LiveVsFighter teamId={match.awayTeam} side="away" />
      </div>
    </div>
  )
}

function LiveVsPanel({ bracket }) {
  const enVivo = bracket.resolved.filter((m) => m.live?.state === 'in')
  if (!enVivo.length) return null
  return (
    <div className="sf-live-vs">
      {enVivo.map((m) => (
        <LiveVsCard key={m.id} match={m} />
      ))}
    </div>
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
