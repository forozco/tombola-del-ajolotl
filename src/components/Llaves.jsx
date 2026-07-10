// ── Pestaña "El Camino" ──
// Tres vistas alternativas del mismo bracket, con toggle segmentado deslizante:
//   - Cuadro (gráfico): 4 columnas, líneas que unen las llaves. Bloqueado a un
//     ancho fijo y con scroll horizontal si no cabe.
//   - Lista (Bracket): apilado vertical con MatchCards grandes por ronda.
//   - Street Fighter: el bracket como arcade, cada amigo es un peleador
//     (vive en StreetFighter.jsx).
//
// Este archivo agrupa Cuadro y sus 3 sub-componentes internos (CuadroCard,
// CuadroTeam, cuadroStatus) porque solo se usan juntos, y el componente
// Bracket que reutiliza MatchCard.

import { useEffect, useRef } from 'react'
import { TEAMS, OWNER_BY_TEAM, ROUNDS } from '../data.js'
import { fechaCorta } from '../lib/dates.js'
import { scrollHorizontalSuave } from '../lib/scroll.js'
import { haptic } from '../haptics.js'
import { Bandera } from './Bandera.jsx'
import { MatchCard } from './MatchCard.jsx'
import { StreetFighter } from './StreetFighter.jsx'
import { IconBracket, IconLista, IconArcade } from './Icons.jsx'

// ── Vista lista: reutiliza MatchCard grande, apilado por ronda ─────────────

// Cada ronda se lee por capas de estado, todas en orden cronológico:
//   1. En vivo (arriba, en su propio bloque)
//   2. Terminados (en medio, en el orden en que se fueron jugando)
//   3. Por jugar (abajo, el más próximo primero)
//   4. Por definir (cruces aún sin equipos, al final)
// Cada grupo va en su propio grid, así las filas emparejan tarjetas de
// altura similar y la card en vivo no convive con placeholders vacíos.

const grupoDe = (m) => {
  if (m.live?.state === 'in') return 'envivo'
  if (m.winner || m.live?.state === 'post') return 'terminados'
  if (!m.homeTeam && !m.awayTeam) return 'vacios'
  return 'porjugar'
}

const cronologico = (a, b) =>
  `${a.date}${a.time ?? ''}`.localeCompare(`${b.date}${b.time ?? ''}`)

function gruposDeRonda(matches) {
  const de = (id) => matches.filter((m) => grupoDe(m) === id).sort(cronologico)
  return [
    { id: 'envivo', titulo: 'En vivo', matches: de('envivo') },
    { id: 'terminados', titulo: 'Terminados', matches: de('terminados') },
    { id: 'porjugar', titulo: 'Por jugar', matches: de('porjugar') },
    { id: 'vacios', titulo: 'Por definir', matches: de('vacios') },
  ].filter((g) => g.matches.length > 0)
}

function Bracket({ bracket, onPick }) {
  return (
    <div className="bracket">
      {ROUNDS.map((label, round) => {
        const grupos = gruposDeRonda(bracket.resolved.filter((m) => m.round === round))
        return (
          <section key={label} className="round">
            <h2 className="round-title">{label}</h2>
            {grupos.map((g) => (
              <div key={g.id} className="round-group">
                {/* El mini-título solo aparece si la ronda mezcla estados;
                    una ronda homogénea (p. ej. toda por definir) no lo
                    necesita y sería ruido. */}
                {grupos.length > 1 && g.titulo && (
                  <h3 className="round-subtitle">{g.titulo}</h3>
                )}
                <div className="round-matches">
                  {g.matches.map((m) => (
                    <MatchCard
                      key={m.id}
                      match={m}
                      champion={bracket.champion}
                      bracket={bracket}
                      onPick={onPick}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>
        )
      })}
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

function Cuadro({ bracket, refreshTick }) {
  const porRonda = (r) => bracket.resolved.filter((m) => m.round === r)
  const scrollRef = useRef(null)
  // Al montar (y en cada refresh) aterrizamos directo en la ronda con
  // acción. Ancla en la columna correspondiente a roundActivo — la
  // columna anterior queda parcialmente visible por el offset (-12px),
  // lo que sirve de contexto sin ocultar la ronda activa como columna
  // principal. Si ya estamos en octavos (roundActivo === 0), no hay
  // nada que scrollear.
  //
  // Truco: ejecutamos el scroll dos veces (rAF + setTimeout de 120ms).
  // El rAF cubre el primer paint; el setTimeout gana la carrera contra
  // el scrollLeft restaurado por el navegador en el refresh —
  // Chrome/Safari reaplican el scroll del container guardado en la
  // sesión, y a veces ese restore ocurre después de nuestro useEffect.
  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller || bracket.roundActivo === 0) return
    const esRefresh = refreshTick > 0
    let cancelAnim = () => {}
    const anclarEnActiva = () => {
      const cols = scroller.querySelectorAll('.cuadro-col')
      const target = cols[bracket.roundActivo]
      if (!target) return
      const left = Math.max(0, target.offsetLeft - 12)
      // Ya cerca del objetivo: skip la animación (evita jerks visibles).
      if (Math.abs(scroller.scrollLeft - left) < 4) return
      if (esRefresh) {
        // Custom rAF animation, más rápida y consistente que el smooth
        // nativo de iOS (que ronda 600ms + jank).
        cancelAnim = scrollHorizontalSuave(scroller, left, 320)
      } else {
        scroller.scrollLeft = left
      }
    }
    const raf = requestAnimationFrame(anclarEnActiva)
    // setTimeout solo en primer mount, para pelear el scroll-restore del
    // navegador al recargar. En pull-to-refresh no aplica.
    const t = esRefresh ? null : setTimeout(anclarEnActiva, 120)
    return () => {
      cancelAnimationFrame(raf)
      if (t) clearTimeout(t)
      cancelAnim()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bracket.roundActivo, refreshTick])
  return (
    <div className="cuadro-scroll" ref={scrollRef}>
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

const VISTAS = [
  { id: 'cuadro', label: 'Bracket', Icon: IconBracket },
  { id: 'lista', label: 'Lista', Icon: IconLista },
  { id: 'sf', label: 'Street Fighter', Icon: IconArcade },
]

export function Llaves({ bracket, vista, setVista, onPick, refreshTick }) {
  const activa = Math.max(0, VISTAS.findIndex((v) => v.id === vista))
  return (
    <>
      <div
        className="vista-toggle"
        style={{ '--vista-count': VISTAS.length, '--active-vista-index': activa }}
      >
        {VISTAS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={vista === id ? 'active' : ''}
            onClick={() => {
              if (vista !== id) haptic.soft()
              setVista(id)
            }}
          >
            <Icon /> {label}
          </button>
        ))}
      </div>
      {vista === 'cuadro' ? (
        <Cuadro bracket={bracket} refreshTick={refreshTick} />
      ) : vista === 'sf' ? (
        <StreetFighter bracket={bracket} refreshTick={refreshTick} />
      ) : (
        <Bracket bracket={bracket} onPick={onPick} />
      )}
    </>
  )
}
