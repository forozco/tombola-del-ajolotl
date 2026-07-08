// ── NEXT FIGHT: attract mode del arcade ────────────────────────────────────
// Cuando NO hay match en vivo y NO hay aftermath reciente, mostramos un panel
// tipo "attract mode" con el próximo partido: dos peleadores esperando en
// pose stance, un countdown LED en pixel-font y un GET READY! parpadeante.
// Se re-renderiza cada segundo para que el reloj corra. Incluye el trigger
// discreto del easter egg del bonus stage.

import { useEffect, useState } from 'react'
import { OWNER_BY_TEAM, TEAMS } from '../data.js'
import { FIGHTERS } from '../sf.js'
import { AHORA, ES_SIM } from '../lib/modes.js'
import { haptic } from '../haptics.js'
import { Bandera } from './Bandera.jsx'
import { IconJoystick } from './Icons.jsx'
import { BonusStage } from './BonusStage.jsx'
import { isRecentAftermath } from './SfLiveVsPanel.jsx'

// Formatea el tiempo restante para el arcade display. Si falta más de un día,
// prefija con "XD · " (evita mostrar 72:00:00 h y volverse ilegible).
function formatearCuenta(ms) {
  if (ms <= 0) return null
  const totalSeg = Math.floor(ms / 1000)
  const dias = Math.floor(totalSeg / 86_400)
  const horas = Math.floor((totalSeg % 86_400) / 3_600)
  const mins = Math.floor((totalSeg % 3_600) / 60)
  const segs = totalSeg % 60
  const p2 = (n) => String(n).padStart(2, '0')
  const hms = `${p2(horas)}:${p2(mins)}:${p2(segs)}`
  return dias > 0 ? { prefix: `${dias}D`, hms } : { prefix: null, hms }
}

function NextFighter({ teamId, side }) {
  const owner = OWNER_BY_TEAM[teamId]
  const f = FIGHTERS[owner.id]
  const team = TEAMS[teamId]
  const shouldFlip = side === 'away'
  return (
    <div className={`sf-next-side sf-next-${side}`}>
      <div className="sf-next-sprite-wrap">
        <img
          className={`sf-next-sprite${f.pixelated ? ' pixelated' : ''}${shouldFlip ? ' flipped' : ''}`}
          src={f.stance}
          alt={f.fighter}
        />
      </div>
      <div className="sf-next-meta">
        <span className="sf-next-team">
          <Bandera teamId={teamId} /> {team?.name ?? ''}
        </span>
        <span className="sf-next-owner" style={{ color: owner.color }}>
          {owner.name}
        </span>
        <span className="sf-next-char">{f.fighter}</span>
      </div>
    </div>
  )
}

// Botoncito discreto con forma de joystick en la esquina del NEXT FIGHT que,
// al tocarse, abre el bonus stage clásico (destruir el auto). Es un secreto
// que la mayoría de usuarios va a descubrir por accidente — de eso se trata
// el easter egg.
function BonusStageTrigger() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        className="sf-bonus-trigger"
        onClick={() => {
          haptic.medium()
          setOpen(true)
        }}
        aria-label="Bonus stage (easter egg)"
        title="???"
      >
        <IconJoystick />
      </button>
      {open && <BonusStage onClose={() => setOpen(false)} />}
    </>
  )
}

// Modo prueba: monta el Bonus Stage abierto de entrada; con EXIT se cierra y
// queda la vista SF normal (recargar la URL con ?bonus lo vuelve a abrir).
export function BonusStageTestMode() {
  const [open, setOpen] = useState(true)
  return open ? <BonusStage onClose={() => setOpen(false)} /> : null
}

export function NextFightPanel({ bracket }) {
  // Prioridad: si hay live o aftermath reciente, este panel no aparece
  // (LiveVsPanel se encarga de esos estados). El aftermath expira 30 min
  // después del pitazo final, momento en que este panel toma el relevo.
  const hayLive = bracket.resolved.some((m) => m.live?.state === 'in')
  const [now, setNow] = useState(() => AHORA())
  const hayAftermath = bracket.resolved.some((m) => isRecentAftermath(m, now))

  useEffect(() => {
    if (hayLive) return undefined
    // Tickea siempre (aún durante aftermath) para detectar cuando expira la
    // ventana y este panel puede tomar el relevo con el countdown. En modo
    // sim (?simular) el reloj avanza mucho más rápido — más seguido.
    const t = setInterval(() => setNow(AHORA()), ES_SIM ? 200 : 1_000)
    return () => clearInterval(t)
  }, [hayLive])

  if (hayLive || hayAftermath) return null

  // El próximo partido con ambos equipos definidos y con kickoff aún futuro.
  // Los partidos "por definir" (sin homeTeam/awayTeam) no aplican para
  // countdown — no tendría portraits que mostrar.
  const next = bracket.resolved
    .filter(
      (m) =>
        m.homeTeam &&
        m.awayTeam &&
        !m.winner &&
        m.live?.state !== 'in' &&
        new Date(m.utc).getTime() > now
    )
    .sort((a, b) => new Date(a.utc).getTime() - new Date(b.utc).getTime())[0]

  if (!next) return null

  const cuenta = formatearCuenta(new Date(next.utc).getTime() - now)
  if (!cuenta) return null // por si el clock se pasa mientras rendereamos

  // El stage sale del anfitrión (mismo criterio que LiveVsCard) para que el
  // panel next herede el escenario donde se jugará la próxima pelea.
  const stageFighter = FIGHTERS[OWNER_BY_TEAM[next.homeTeam].id]

  return (
    <div
      className="sf-next-fight"
      style={{ '--sf-live-stage': `url(${stageFighter.stage})` }}
    >
      <div className="sf-next-topbar">
        <span className="sf-next-title">NEXT FIGHT</span>
        <span className="sf-next-stage-label">{stageFighter.city}</span>
      </div>
      <div className="sf-next-arena">
        <NextFighter teamId={next.homeTeam} side="home" />
        <div className="sf-next-center">
          <div className="sf-next-vs">VS</div>
          <div className="sf-next-countdown" aria-label={`Faltan ${cuenta.hms}`}>
            {cuenta.prefix && <span className="sf-next-days">{cuenta.prefix}</span>}
            <span className="sf-next-hms">{cuenta.hms}</span>
          </div>
        </div>
        <NextFighter teamId={next.awayTeam} side="away" />
      </div>
      <div className="sf-next-getready">GET READY!</div>
      <BonusStageTrigger />
    </div>
  )
}
