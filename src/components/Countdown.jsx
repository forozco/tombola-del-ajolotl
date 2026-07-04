// Chip dinámico arriba de la pestaña "Hoy": elige el siguiente partido por
// arrancar y muestra cuánto falta. Formato adaptativo:
//  - <1 min:  "¡ya casi arranca!"
//  - <1 hora: "en 34 min"
//  - Hoy:     "hoy · en 2h 15m"
//  - Otro:    "sáb, 4 jul · 15:00 h"
// Refresca cada 30s (o cada segundo en modo simulación).

import { useEffect, useState } from 'react'
import { TEAMS } from '../data.js'
import { AHORA, ES_SIM } from '../lib/modes.js'
import { fechaCorta, todayStr } from '../lib/dates.js'
import { Bandera } from './Bandera.jsx'

export function Countdown({ matches }) {
  const [ahora, setAhora] = useState(() => AHORA())
  useEffect(() => {
    const t = setInterval(() => setAhora(AHORA()), ES_SIM ? 1_000 : 30_000)
    return () => clearInterval(t)
  }, [])
  const match = matches.find(
    (m) => !m.winner && m.live?.state !== 'in' && new Date(m.utc).getTime() > ahora
  )
  if (!match) return null
  const diff = new Date(match.utc).getTime() - ahora
  const mins = Math.floor(diff / 60_000)
  const horas = Math.floor(diff / 3_600_000)
  let falta
  if (mins < 1) falta = '¡ya casi arranca!'
  else if (horas < 1) falta = `en ${mins} min`
  else if (match.date === todayStr()) falta = `hoy · en ${horas}h ${mins % 60}m`
  else falta = `${fechaCorta(match.date)} · ${match.time} h`
  const home = match.homeTeam ? TEAMS[match.homeTeam] : null
  const away = match.awayTeam ? TEAMS[match.awayTeam] : null
  return (
    <div className="countdown">
      <div className="cd-head">
        <span className="cd-tag">Siguiente partido</span>
        <span className="cd-time">{falta}</span>
      </div>
      <div className="cd-teams">
        <span className="cd-team">
          {home && <Bandera teamId={match.homeTeam} />} {home ? home.name : 'Por definir'}
        </span>
        <span className="mini-vs">vs</span>
        <span className="cd-team">
          {away && <Bandera teamId={match.awayTeam} />} {away ? away.name : 'Por definir'}
        </span>
      </div>
    </div>
  )
}
