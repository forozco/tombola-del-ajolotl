// ── Pestaña "Hoy" ──
// Foco en la jornada activa (más reciente que ya entró). Muestra:
//  - Countdown al siguiente partido
//  - Los partidos del día en la columna principal, ordenados por relevancia
//    (en vivo → próximos → terminados; cronológico dentro de cada categoría)
//  - Sidebar con "Próximos partidos" y "Últimos resultados" en filas mini
//    tocables que expanden el detalle debajo

import { useState } from 'react'
import { AHORA } from '../lib/modes.js'
import { fechaLarga, jornadaHoy, todayStr } from '../lib/dates.js'
import { Countdown } from './Countdown.jsx'
import { MatchCard } from './MatchCard.jsx'
import { MiniMatch } from './MiniMatch.jsx'

// Orden dentro de la jornada: 0 = en vivo, 1 = por jugar, 2 = terminado.
// Array.sort es estable, así que dentro de cada categoría se conserva el
// orden cronológico previo.
const relevancia = (m) => (m.live?.state === 'in' ? 0 : m.winner ? 2 : 1)

export function Hoy({ bracket, onPick }) {
  // Filas mini expandibles: solo una abierta a la vez.
  const [abierto, setAbierto] = useState(null)
  const porFecha = [...bracket.resolved].sort((a, b) =>
    `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)
  )
  const jornada = jornadaHoy(porFecha, AHORA())
  const esHoyReal = jornada === todayStr()

  const deHoy = porFecha
    .filter((m) => m.date === jornada)
    .sort((a, b) => relevancia(a) - relevancia(b))
  const proximos = porFecha.filter((m) => m.date > jornada && !m.winner)
  const jugados = porFecha.filter((m) => m.winner && m.date < jornada).reverse()
  const siguienteFecha = proximos[0]?.date
  const tituloJornada = fechaLarga(jornada)

  return (
    <div className="hoy">
      <Countdown matches={porFecha} />
      <div className="hoy-cols">
        <div className="hoy-col-main">
          <h2 className="round-title">
            {esHoyReal ? `Hoy · ${tituloJornada}` : tituloJornada}
          </h2>
          {deHoy.length > 0 ? (
            <div className="round-matches">
              {deHoy.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  champion={bracket.champion}
                  bracket={bracket}
                  meta
                  onPick={onPick}
                />
              ))}
            </div>
          ) : (
            <div className="today-empty">
              <p>Hoy no hay partidos de la quiniela.</p>
              {siguienteFecha && (
                <p className="today-empty-next">
                  El siguiente es el <strong>{fechaLarga(siguienteFecha)}</strong>
                </p>
              )}
            </div>
          )}
        </div>

        <div className="hoy-col-side">
          {proximos.length > 0 && (
            <section className="hoy-block">
              <h2 className="round-title next-title">Próximos partidos</h2>
              <div className="mini-list">
                {proximos.slice(0, 5).map((m) => (
                  <div key={m.id} className="mini-item">
                    <MiniMatch
                      match={m}
                      bracket={bracket}
                      abierto={abierto === m.id}
                      onGoTo={() => setAbierto(abierto === m.id ? null : m.id)}
                    />
                    {abierto === m.id && (
                      <MatchCard match={m} champion={bracket.champion} bracket={bracket} meta />
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {jugados.length > 0 && (
            <section className="hoy-block">
              <h2 className="round-title next-title">Últimos resultados</h2>
              <div className="mini-list">
                {jugados.slice(0, 5).map((m) => (
                  <div key={m.id} className="mini-item">
                    <MiniMatch
                      match={m}
                      bracket={bracket}
                      abierto={abierto === m.id}
                      onGoTo={() => setAbierto(abierto === m.id ? null : m.id)}
                    />
                    {abierto === m.id && (
                      <MatchCard match={m} champion={bracket.champion} bracket={bracket} meta />
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
