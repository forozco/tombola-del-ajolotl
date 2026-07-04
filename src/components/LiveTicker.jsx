// Ticker sticky con los partidos EN VIVO ahora mismo. En la pestaña "Hoy"
// se oculta con CSS (redundante con la card grande visible); en las otras
// pestañas queda arriba para que puedas monitorear sin regresarte.
// Tocar un chip lleva al card del partido en "Hoy".

import { Bandera } from './Bandera.jsx'
import { haptic } from '../haptics.js'

export function LiveTicker({ bracket, onVer }) {
  const enVivo = bracket.resolved.filter((m) => m.live?.state === 'in')
  if (!enVivo.length) return null
  return (
    <div className="live-ticker">
      {enVivo.map((m) => {
        const sh = m.live.shootout ?? {}
        const pens = Object.values(sh).some((v) => v != null)
        return (
          <button
            key={m.id}
            className="ticker-chip"
            onClick={() => {
              haptic.soft()
              onVer(m)
            }}
          >
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
