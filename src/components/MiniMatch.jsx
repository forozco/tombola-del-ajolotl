// Renglón compacto para listas de "Próximos partidos" y "Últimos resultados"
// en la sidebar de "Hoy". Tocar el renglón expande el detalle del partido
// (una MatchCard grande) debajo. Muestra su propia crónica en clave de
// quiniela — misma lógica que la de MatchCard.FriendOutcome pero en versión
// mini (esta se pinta debajo de la línea de equipos, no arriba).

import { TEAMS, OWNER_BY_TEAM, POZO } from '../data.js'
import { fechaCorta } from '../lib/dates.js'
import { haptic } from '../haptics.js'
import { Bandera } from './Bandera.jsx'

export function MiniMatch({ match, onGoTo, bracket, abierto }) {
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
          <strong style={{ color: wOwner.color }}>{wOwner.name}</strong> campeón — se lleva los $
          {POZO.toLocaleString()}
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
    <button
      className={`mini-match${abierto ? ' abierto' : ''}`}
      onClick={() => {
        haptic.soft()
        onGoTo?.()
      }}
    >
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
          <strong key={marcador} className="mini-score">{marcador}</strong>
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
                <strong style={{ color: homeOwner.color }}>{homeOwner.name}</strong> avanza seguro
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
