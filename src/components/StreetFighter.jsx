// ── Pestaña "El Camino" · vista Street Fighter ──
// El mismo bracket del torneo, pero ambientado como el arcade: cada amigo es
// un peleador (ver src/sf.js) y aquí solo aparecen los amigos, sin equipos.
//   - Panel LIVE VS arriba: el partido en curso (o aftermath reciente) —
//     ver SfLiveVsPanel.jsx
//   - Panel NEXT FIGHT: attract mode con el próximo partido — ver
//     SfNextFightPanel.jsx (incluye el trigger easter egg del bonus stage)
//   - Roster: pantalla "select your fighter" con los 8 peleadores — SfBracket
//   - Bracket: mismas 4 columnas y líneas del Cuadro (reusa su geometría CSS)
//     con tarjetas de pelea — SfBracket

import { useEffect, useRef } from 'react'
import { OWNERS, ROUNDS } from '../data.js'
import { ES_BONUS } from '../lib/modes.js'
import { LiveVsPanel } from './SfLiveVsPanel.jsx'
import { NextFightPanel, BonusStageTestMode } from './SfNextFightPanel.jsx'
import { RosterCell, SfCard } from './SfBracket.jsx'

// Los partidos de una ronda por parejas (alimentan el mismo cruce siguiente),
// igual que en el Cuadro, para que las líneas conecten donde deben.
const enParejas = (matches) => {
  const pares = []
  for (let i = 0; i < matches.length; i += 2) pares.push(matches.slice(i, i + 2))
  return pares
}

export function StreetFighter({ bracket, refreshTick }) {
  const porRonda = (r) => bracket.resolved.filter((m) => m.round === r)
  const scrollRef = useRef(null)
  // Al montar (y en cada refresh) aterrizamos directo en la ronda con
  // acción — ancla en roundActivo, con la columna previa asomándose por
  // el offset (-12px) para dar contexto. Doble intento (rAF + setTimeout
  // de 120ms) para ganar la carrera contra el scrollLeft que Chrome y
  // Safari restauran del container al refrescar.
  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller || bracket.roundActivo === 0) return
    // Smooth solo en pull-to-refresh (gesto del usuario merece feedback
    // visual); en primer mount, instant para que la app abra ya donde
    // debe sin verse un glitch de animación.
    const behavior = refreshTick > 0 ? 'smooth' : 'auto'
    const anclarEnActiva = () => {
      const cols = scroller.querySelectorAll('.cuadro-col')
      const target = cols[bracket.roundActivo]
      if (target) {
        scroller.scrollTo({ left: Math.max(0, target.offsetLeft - 12), behavior })
      }
    }
    const raf = requestAnimationFrame(anclarEnActiva)
    const t = setTimeout(anclarEnActiva, 120)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t)
    }
    // refreshTick como dep: al hacer pull-to-refresh el usuario está
    // pidiendo un "estado fresco", así que también re-anclamos aunque
    // roundActivo no haya cambiado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bracket.roundActivo, refreshTick])
  return (
    <div className="sf-arcade">
      <div className="sf-marquee">STREET FIGHTER</div>
      <div className="sf-submarquee">TÓMBOLA DEL AJOLOTL EDITION</div>

      <LiveVsPanel bracket={bracket} />
      <NextFightPanel bracket={bracket} />
      {/* Modo prueba (?bonus): abre el juego directo, sin depender de que el
          panel NEXT FIGHT esté visible (con pelea live/aftermath no se monta) */}
      {ES_BONUS ? <BonusStageTestMode /> : null}

      <div className="sf-select-title">SELECT YOUR FIGHTER</div>
      <div className="sf-roster">
        {OWNERS.map((o) => (
          <RosterCell key={o.id} owner={o} bracket={bracket} />
        ))}
      </div>

      <div className="cuadro-scroll sf-scroll" ref={scrollRef}>
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
