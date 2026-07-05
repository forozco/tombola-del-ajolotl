// ── Easter egg · Bonus Stage del auto ──
// Homenaje jugable al clásico bonus stage de Street Fighter II ("Destroy the
// Car!"). Se accede desde un botoncito joystick en el panel NEXT FIGHT.
// Mecánica:
//   - Ryu vs auto pixel-art SVG con 5 estados de daño
//   - Timer 30s en LED cyan estilo cabinete
//   - Cada tap = golpe: haptic soft + shake sutil + score++
//   - Auto destruido antes del tiempo → 'BONUS STAGE CLEARED!' (con bonus por
//     tiempo sobrante)
//   - Timer a 0 antes de destruirlo → 'TIME UP!'
//   - High score persistido en localStorage (siempre el mejor)
//   - Botón EXIT para cerrar y volver al panel

import { useEffect, useRef, useState } from 'react'
import { FIGHTERS } from '../sf.js'
import { haptic } from '../haptics.js'

const HITS_TO_DESTROY = 24 // golpes para destruir el auto
const TIME_LIMIT = 30 // segundos
const BEST_KEY = 'ajolotl-sf-bonus-best'

function loadBestScore() {
  try {
    const raw = localStorage.getItem(BEST_KEY)
    const n = Number(raw)
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

// Auto pixel-art en SVG inline con overlays de daño que se van agregando
// por fase (0-4). Los overlays de daño van apilándose como una progresión:
// abolladuras → grietas en el parabrisas → puertas cayendo → humo/fuego.
function BonusCar({ damagePhase, shake }) {
  return (
    <div className={`sf-bonus-car${shake ? ' shake' : ''}`} data-phase={damagePhase}>
      <svg viewBox="0 0 200 100" width="200" height="100" xmlns="http://www.w3.org/2000/svg">
        {/* Sombra bajo el auto */}
        <ellipse cx="100" cy="94" rx="80" ry="4" fill="rgba(0,0,0,0.5)" />
        {/* Cuerpo principal */}
        <rect x="15" y="45" width="170" height="35" fill="#c62828" stroke="#4a0000" strokeWidth="2" />
        {/* Techo/cabina */}
        <path d="M 50 45 L 65 22 L 145 22 L 160 45 Z" fill="#8e1010" stroke="#4a0000" strokeWidth="2" />
        {/* Parabrisas */}
        <path d="M 58 43 L 70 27 L 105 27 L 105 43 Z" fill="#8ec9ff" stroke="#4a0000" strokeWidth="1.5" />
        {/* Ventana lateral */}
        <path d="M 108 43 L 108 27 L 140 27 L 152 43 Z" fill="#8ec9ff" stroke="#4a0000" strokeWidth="1.5" />
        {/* Faros */}
        <rect x="17" y="52" width="12" height="8" fill="#fff59d" stroke="#4a0000" strokeWidth="1.5" />
        <rect x="171" y="52" width="12" height="8" fill="#ff8a80" stroke="#4a0000" strokeWidth="1.5" />
        {/* Ruedas */}
        <circle cx="45" cy="82" r="12" fill="#111" stroke="#000" strokeWidth="2" />
        <circle cx="45" cy="82" r="5" fill="#555" />
        <circle cx="155" cy="82" r="12" fill="#111" stroke="#000" strokeWidth="2" />
        <circle cx="155" cy="82" r="5" fill="#555" />

        {/* ── Overlays de daño progresivos ── */}
        {damagePhase >= 1 && (
          <g className="sf-bonus-damage-1">
            {/* Abolladuras leves en el cofre */}
            <path d="M 20 60 L 30 63 L 25 70 Z" fill="#4a0000" opacity="0.5" />
            <path d="M 175 60 L 168 65 L 172 72 Z" fill="#4a0000" opacity="0.5" />
          </g>
        )}
        {damagePhase >= 2 && (
          <g className="sf-bonus-damage-2">
            {/* Parabrisas roto — grietas radiales */}
            <path d="M 80 35 L 65 42 M 80 35 L 90 27 M 80 35 L 100 40 M 80 35 L 70 30"
                  stroke="#fff" strokeWidth="1.2" fill="none" opacity="0.9" />
            <path d="M 80 35 L 62 45 M 80 35 L 95 45"
                  stroke="#000" strokeWidth="0.8" fill="none" opacity="0.7" />
          </g>
        )}
        {damagePhase >= 3 && (
          <g className="sf-bonus-damage-3">
            {/* Faro roto y puerta cayéndose */}
            <path d="M 171 52 L 183 60 L 175 55 L 180 52 Z" fill="#333" />
            <line x1="105" y1="45" x2="108" y2="80" stroke="#4a0000" strokeWidth="3" />
            {/* Ventana lateral shattered */}
            <path d="M 120 30 L 130 40 M 125 27 L 140 42 M 130 33 L 145 40"
                  stroke="#fff" strokeWidth="1.2" fill="none" opacity="0.9" />
          </g>
        )}
        {damagePhase >= 4 && (
          <g className="sf-bonus-damage-4">
            {/* Techo hundido */}
            <path d="M 65 22 L 80 30 L 100 25 L 130 32 L 145 22" stroke="#4a0000" strokeWidth="3" fill="none" />
            {/* Humo negro saliendo del techo */}
            <circle cx="90" cy="15" r="6" fill="#333" opacity="0.7">
              <animate attributeName="cy" values="15;5;15" dur="1.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.7;0.2;0.7" dur="1.6s" repeatCount="indefinite" />
            </circle>
            <circle cx="105" cy="12" r="8" fill="#555" opacity="0.6">
              <animate attributeName="cy" values="12;2;12" dur="1.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0.1;0.6" dur="1.4s" repeatCount="indefinite" />
            </circle>
            <circle cx="118" cy="18" r="5" fill="#222" opacity="0.8">
              <animate attributeName="cy" values="18;8;18" dur="1.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.8s" repeatCount="indefinite" />
            </circle>
          </g>
        )}
      </svg>
    </div>
  )
}

// Overlay de "hit spark" que aparece en la posición del click y se disipa.
// Puramente decorativo — se re-renderiza con key para reiniciar la animación.
function HitSpark({ x, y, id }) {
  return (
    <div key={id} className="sf-bonus-spark" style={{ left: x, top: y }}>
      <svg viewBox="0 0 32 32" width="48" height="48">
        <g stroke="#ffd54d" strokeWidth="2.5" strokeLinecap="round">
          <line x1="16" y1="4" x2="16" y2="10" />
          <line x1="16" y1="22" x2="16" y2="28" />
          <line x1="4" y1="16" x2="10" y2="16" />
          <line x1="22" y1="16" x2="28" y2="16" />
          <line x1="7" y1="7" x2="12" y2="12" />
          <line x1="20" y1="20" x2="25" y2="25" />
          <line x1="25" y1="7" x2="20" y2="12" />
          <line x1="7" y1="25" x2="12" y2="20" />
        </g>
        <circle cx="16" cy="16" r="5" fill="#ff4d4f" />
        <text
          x="16"
          y="20"
          textAnchor="middle"
          fill="#fff"
          fontSize="7"
          fontFamily="'Press Start 2P', monospace"
        >POW</text>
      </svg>
    </div>
  )
}

export function BonusStage({ onClose }) {
  const [hits, setHits] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT)
  const [state, setState] = useState('playing') // 'playing' | 'cleared' | 'timeup'
  const [sparks, setSparks] = useState([]) // {x, y, id}
  const [shake, setShake] = useState(false)
  const [best, setBest] = useState(() => loadBestScore())
  const sparkIdRef = useRef(0)

  // Timer del arcade: tick de 100ms para precisión visual (el display en
  // segundos, pero por dentro milisegundos para calcular bonus final).
  useEffect(() => {
    if (state !== 'playing') return undefined
    const started = Date.now()
    const id = setInterval(() => {
      const elapsed = (Date.now() - started) / 1000
      const rest = Math.max(0, TIME_LIMIT - elapsed)
      setTimeLeft(rest)
      if (rest <= 0) {
        setState('timeup')
        clearInterval(id)
      }
    }, 100)
    return () => clearInterval(id)
  }, [state])

  // Al golpear: incrementa hits, agrega chispa, hace shake sutil y checa fin
  const onHitCar = (e) => {
    if (state !== 'playing') return
    haptic.soft()
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX ?? e.touches?.[0]?.clientX ?? rect.left + rect.width / 2) - rect.left
    const y = (e.clientY ?? e.touches?.[0]?.clientY ?? rect.top + rect.height / 2) - rect.top
    const id = ++sparkIdRef.current
    setSparks((s) => [...s, { x, y, id }])
    setTimeout(() => setSparks((s) => s.filter((sp) => sp.id !== id)), 500)
    setShake(true)
    setTimeout(() => setShake(false), 150)
    setHits((h) => {
      const next = h + 1
      if (next >= HITS_TO_DESTROY) setState('cleared')
      return next
    })
  }

  // Al terminar: calcula score final y actualiza high score si aplica
  useEffect(() => {
    if (state === 'playing') return
    haptic.success()
    // Bonus por tiempo sobrante × 1000 puntos si limpió el auto, si no solo
    // el conteo de golpes × 100 (para que aún se sienta un score real).
    const timeBonus = state === 'cleared' ? Math.floor(timeLeft * 1000) : 0
    const score = hits * 100 + timeBonus
    if (score > best) {
      setBest(score)
      try {
        localStorage.setItem(BEST_KEY, String(score))
      } catch {
        /* sesión sin storage: solo memoria */
      }
    }
  }, [state])

  const p2 = (n) => String(n).padStart(2, '0')
  const displayTime = `00:${p2(Math.floor(timeLeft))}`
  const damagePhase = Math.min(4, Math.floor((hits / HITS_TO_DESTROY) * 5))
  const score = hits * 100 + (state === 'cleared' ? Math.floor(timeLeft * 1000) : 0)
  const ryu = FIGHTERS.israeltl

  return (
    <div className="sf-bonus-overlay" role="dialog" aria-label="Bonus Stage">
      <div className="sf-bonus-scene">
        {/* HUD superior estilo cabinete */}
        <div className="sf-bonus-hud">
          <div className="sf-bonus-hud-block">
            <span className="sf-bonus-hud-label">TIME</span>
            <span className="sf-bonus-hud-value sf-bonus-time">{displayTime}</span>
          </div>
          <div className="sf-bonus-hud-block">
            <span className="sf-bonus-hud-label">HITS</span>
            <span className="sf-bonus-hud-value sf-bonus-hits">{p2(hits)}</span>
          </div>
          <div className="sf-bonus-hud-block">
            <span className="sf-bonus-hud-label">SCORE</span>
            <span className="sf-bonus-hud-value sf-bonus-score">{score}</span>
          </div>
        </div>

        {/* Título arcade */}
        <div className="sf-bonus-title">BONUS STAGE</div>
        <div className="sf-bonus-subtitle">DESTROY THE CAR!</div>

        {/* Área jugable */}
        <div className="sf-bonus-arena">
          <img
            className="sf-bonus-ryu"
            src={ryu.stance}
            alt="Ryu"
          />
          <button
            className={`sf-bonus-hitzone${shake ? ' shake' : ''}`}
            onClick={onHitCar}
            aria-label="Golpear el auto"
          >
            <BonusCar damagePhase={damagePhase} shake={shake} />
            {sparks.map((s) => (
              <HitSpark key={s.id} id={s.id} x={s.x} y={s.y} />
            ))}
          </button>
        </div>

        {/* Barra de daño */}
        <div className="sf-bonus-damage-bar">
          <div
            className="sf-bonus-damage-fill"
            style={{ width: `${Math.min(100, (hits / HITS_TO_DESTROY) * 100)}%` }}
          />
        </div>

        {/* Estado final (overlay sobre la escena) */}
        {state !== 'playing' && (
          <div className="sf-bonus-endgame">
            <div className={`sf-bonus-endgame-title ${state}`}>
              {state === 'cleared' ? 'BONUS STAGE CLEARED!' : 'TIME UP!'}
            </div>
            {state === 'cleared' && (
              <div className="sf-bonus-endgame-bonus">
                TIME BONUS · {Math.floor(timeLeft * 1000)}
              </div>
            )}
            <div className="sf-bonus-endgame-score">SCORE · {score}</div>
            <div className="sf-bonus-endgame-best">
              {score > best ? 'NEW HIGH SCORE!' : `HI-SCORE · ${best}`}
            </div>
          </div>
        )}

        {/* Instrucción / botón exit */}
        <div className="sf-bonus-footer">
          {state === 'playing' ? (
            <span className="sf-bonus-instruction">TAP THE CAR TO PUNCH</span>
          ) : (
            <span className="sf-bonus-instruction">GAME OVER</span>
          )}
          <button className="sf-bonus-exit" onClick={onClose}>
            EXIT
          </button>
        </div>
      </div>
    </div>
  )
}
