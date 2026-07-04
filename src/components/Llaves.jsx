// ── Pestaña "El Camino" ──
// Dos vistas alternativas del mismo bracket, con toggle segmentado deslizante:
//   - Cuadro (gráfico): 4 columnas, líneas que unen las llaves. Bloqueado a un
//     ancho fijo y con scroll horizontal si no cabe.
//   - Lista (Bracket): apilado vertical con MatchCards grandes por ronda.
//
// Este archivo agrupa Cuadro y sus 3 sub-componentes internos (CuadroCard,
// CuadroTeam, cuadroStatus) porque solo se usan juntos, y el componente
// Bracket que reutiliza MatchCard.

import { TEAMS, OWNER_BY_TEAM, ROUNDS } from '../data.js'
import { fechaCorta } from '../lib/dates.js'
import { haptic } from '../haptics.js'
import { Bandera } from './Bandera.jsx'
import { MatchCard } from './MatchCard.jsx'
import { IconBracket, IconLista } from './Icons.jsx'

// ── Vista lista: reutiliza MatchCard grande, apilado por ronda ─────────────

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
                <MatchCard
                  key={m.id}
                  match={m}
                  champion={bracket.champion}
                  bracket={bracket}
                  onPick={onPick}
                />
              ))}
          </div>
        </section>
      ))}
    </div>
  )
}

// ── Vista cuadro: 4 columnas gráficas con líneas entre parejas ─────────────

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

// Agrupa los partidos de una ronda en parejas (van al mismo cruce siguiente).
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

// ── Pestaña completa: toggle + vista elegida ───────────────────────────────

export function Llaves({ bracket, vista, setVista, onPick }) {
  return (
    <>
      <div
        className="vista-toggle"
        style={{ '--active-vista-index': vista === 'cuadro' ? 0 : 1 }}
      >
        <button
          className={vista === 'cuadro' ? 'active' : ''}
          onClick={() => {
            if (vista !== 'cuadro') haptic.soft()
            setVista('cuadro')
          }}
        >
          <IconBracket /> Bracket
        </button>
        <button
          className={vista === 'lista' ? 'active' : ''}
          onClick={() => {
            if (vista !== 'lista') haptic.soft()
            setVista('lista')
          }}
        >
          <IconLista /> Lista
        </button>
      </div>
      {vista === 'cuadro' ? (
        <Cuadro bracket={bracket} />
      ) : (
        <Bracket bracket={bracket} onPick={onPick} />
      )}
    </>
  )
}
