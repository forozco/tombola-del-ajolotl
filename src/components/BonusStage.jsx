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

// Auto sedán morado/azul oscuro tipo el del bonus stage clásico de SF II
// (basado en el sedán japonés estilo Lexus/Toyota del arcade). Silueta de
// 4 puertas con parachoques cromado, señales ámbar en las esquinas, faros
// rectangulares y placa. El daño progresa en 5 fases apilables:
//   1 · Abolladuras y grietas en cofre/cajuela
//   2 · Parabrisas shatter
//   3 · Puerta descolgada + faro roto + antena caída
//   4 · Techo hundido + capó levantado + neumático delantero desinflado
//   5 · Chatarra: humo negro, rueda zafada, chispas
function BonusCar({ damagePhase, shake }) {
  return (
    <div className={`sf-bonus-car${shake ? ' shake' : ''}`} data-phase={damagePhase}>
      <svg viewBox="0 0 240 130" width="240" height="130" xmlns="http://www.w3.org/2000/svg" shapeRendering="crispEdges">
        <defs>
          {/* Cuerpo: morado oscuro azulado, como el del arcade */}
          <linearGradient id="bodyGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#5a5c7a" />
            <stop offset="55%" stopColor="#3f4160" />
            <stop offset="100%" stopColor="#25263c" />
          </linearGradient>
          <linearGradient id="chromeGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#f0f0f0" />
            <stop offset="50%" stopColor="#c8c8c8" />
            <stop offset="100%" stopColor="#8c8c8c" />
          </linearGradient>
          {/* Cristales tintados azules */}
          <linearGradient id="glassGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#c8e0f5" />
            <stop offset="100%" stopColor="#5a7ea5" />
          </linearGradient>
        </defs>

        {/* Sombra bajo el auto */}
        <ellipse
          cx="120"
          cy={damagePhase >= 5 ? 118 : 116}
          rx={damagePhase >= 5 ? 82 : 100}
          ry="4"
          fill="rgba(0,0,0,0.55)"
        />

        {/* Cuerpo principal — silueta de sedán 4 puertas alargada */}
        <path
          d="M 14 92 L 14 76 Q 16 70 26 68 L 46 66 Q 58 52 76 50 L 168 50 Q 184 52 196 66 L 218 68 Q 226 70 228 76 L 228 92 Z"
          fill="url(#bodyGrad)"
          stroke="#1a1a2a"
          strokeWidth="2"
        />

        {/* Techo del sedán — casi plano, ligeramente curvo */}
        <path
          d="M 58 66 Q 76 52 96 52 L 148 52 Q 168 52 184 66 Z"
          fill="url(#bodyGrad)"
          stroke="#1a1a2a"
          strokeWidth="1.5"
        />

        {/* Parabrisas grande */}
        <path
          d="M 62 64 Q 76 54 96 54 L 116 54 L 116 64 Z"
          fill="url(#glassGrad)"
          stroke="#1a1a2a"
          strokeWidth="1.2"
        />

        {/* Ventana delantera-izq (conductor) */}
        <path
          d="M 118 64 L 118 54 L 140 54 L 140 64 Z"
          fill="url(#glassGrad)"
          stroke="#1a1a2a"
          strokeWidth="1.2"
        />

        {/* Ventana trasera-izq (pasajero) — sedán 4 puertas */}
        <path
          d="M 142 64 L 142 54 L 164 54 Q 176 54 180 64 Z"
          fill="url(#glassGrad)"
          stroke="#1a1a2a"
          strokeWidth="1.2"
        />

        {/* Línea del techo (curva plana característica de sedán) */}
        <path d="M 62 64 L 180 64" stroke="#1a1a2a" strokeWidth="0.8" opacity="0.5" />

        {/* Pilares B/C entre ventanas */}
        <line x1="117" y1="54" x2="117" y2="64" stroke="#1a1a2a" strokeWidth="1.5" />
        <line x1="141" y1="54" x2="141" y2="64" stroke="#1a1a2a" strokeWidth="1.5" />

        {/* Highlight superior del cuerpo (reflejo) */}
        <path d="M 30 74 Q 120 70 210 74" stroke="#7a7d9c" strokeWidth="1" fill="none" opacity="0.7" />

        {/* Línea de la puerta delantera */}
        <line x1="82" y1="66" x2="82" y2="90" stroke="#1a1a2a" strokeWidth="1.2" />
        {/* Línea de la puerta trasera */}
        <line x1="132" y1="66" x2="132" y2="90" stroke="#1a1a2a" strokeWidth="1.2" />
        {/* Manijas de las 2 puertas visibles */}
        <rect x="72" y="72" width="7" height="1.6" fill="#1a1a2a" />
        <rect x="122" y="72" width="7" height="1.6" fill="#1a1a2a" />

        {/* Franja negra inferior (rocker panel) */}
        <rect x="16" y="86" width="212" height="6" fill="#12131f" />

        {/* Parachoques cromado delantero */}
        <rect x="10" y="82" width="18" height="9" rx="1" fill="url(#chromeGrad)" stroke="#3a3a3a" strokeWidth="1" />
        {/* Parachoques cromado trasero */}
        <rect x="212" y="82" width="18" height="9" rx="1" fill="url(#chromeGrad)" stroke="#3a3a3a" strokeWidth="1" />

        {/* Rejilla frontal delgada horizontal */}
        <rect x="28" y="78" width="14" height="3" fill="#0a0a15" stroke="#1a1a2a" strokeWidth="0.6" />

        {/* Placa delantera */}
        <rect x="20" y="82" width="10" height="4" fill="#e8e0b0" stroke="#1a1a2a" strokeWidth="0.6" />

        {/* Faros delanteros rectangulares */}
        <rect x="16" y="72" width="14" height="6" rx="1" fill="#fff5c8" stroke="#1a1a2a" strokeWidth="1" />
        <line x1="23" y1="72" x2="23" y2="78" stroke="#1a1a2a" strokeWidth="0.6" />

        {/* Señal ámbar de esquina delantera */}
        <rect x="30" y="74" width="4" height="4" fill="#ff9800" stroke="#7a4a00" strokeWidth="0.6" />

        {/* Faros traseros rojos con detalle */}
        <rect x="210" y="72" width="14" height="6" rx="1" fill="#e53935" stroke="#4a0000" strokeWidth="1" />
        <line x1="217" y1="72" x2="217" y2="78" stroke="#4a0000" strokeWidth="0.6" />

        {/* Señal ámbar de esquina trasera */}
        <rect x="206" y="74" width="4" height="4" fill="#ff9800" stroke="#7a4a00" strokeWidth="0.6" />

        {/* Antena delgada en el techo */}
        <line x1="170" y1="52" x2="176" y2="36" stroke="#1a1a2a" strokeWidth="1" />

        {/* Ruedas — negras con rin plateado, más sobrias que las whitewall */}
        <circle cx="58" cy="94" r="14" fill="#0e0e0e" stroke="#000" strokeWidth="2" />
        <circle cx="58" cy="94" r="6" fill="#7a7a80" />
        <circle cx="58" cy="94" r="2" fill="#1a1a1a" />
        {/* Radios sutiles del rin */}
        <path d="M 58 88 L 58 100 M 52 94 L 64 94 M 54 90 L 62 98 M 62 90 L 54 98"
              stroke="#3a3a3a" strokeWidth="0.7" opacity="0.7" />

        <circle cx="184" cy="94" r="14" fill="#0e0e0e" stroke="#000" strokeWidth="2" />
        <circle cx="184" cy="94" r="6" fill="#7a7a80" />
        <circle cx="184" cy="94" r="2" fill="#1a1a1a" />
        <path d="M 184 88 L 184 100 M 178 94 L 190 94 M 180 90 L 188 98 M 188 90 L 180 98"
              stroke="#3a3a3a" strokeWidth="0.7" opacity="0.7" />

        {/* ═════════ Overlays de daño ═════════ */}

        {damagePhase >= 1 && (
          <g>
            {/* Abolladura cofre */}
            <path d="M 38 78 L 50 82 L 44 88 Z" fill="#1a1a2a" opacity="0.75" />
            {/* Abolladura cajuela */}
            <path d="M 196 78 L 208 84 L 200 88 Z" fill="#1a1a2a" opacity="0.75" />
            {/* Rayadura larga en el body */}
            <path d="M 30 80 Q 90 76 150 80" stroke="#0a0a15" strokeWidth="1.2" fill="none" opacity="0.8" />
          </g>
        )}

        {damagePhase >= 2 && (
          <g>
            {/* Parabrisas shatter — grietas radiales desde el impacto */}
            <circle cx="90" cy="59" r="2.5" fill="#fff" />
            <path
              d="M 90 59 L 74 54 M 90 59 L 78 64 M 90 59 L 108 54 M 90 59 L 106 64 M 90 59 L 96 52 M 90 59 L 84 52"
              stroke="#fff"
              strokeWidth="1.3"
              fill="none"
              opacity="0.95"
            />
            <path
              d="M 90 59 L 76 59 M 90 59 L 104 59 M 90 59 L 88 50"
              stroke="#0a0a2a"
              strokeWidth="0.9"
              fill="none"
              opacity="0.85"
            />
          </g>
        )}

        {damagePhase >= 3 && (
          <g>
            {/* Puerta delantera descolgada — cae hacia el suelo */}
            <path
              d="M 82 66 L 96 92 L 82 92 Z"
              fill="url(#bodyGrad)"
              stroke="#1a1a2a"
              strokeWidth="1.5"
              transform="rotate(-16 82 90)"
            />
            {/* Faro delantero roto — cristal fragmentado */}
            <path d="M 18 74 L 22 78 M 22 74 L 18 78 M 26 74 L 30 78 M 30 74 L 26 78"
                  stroke="#1a1a2a" strokeWidth="0.8" fill="none" />
            <rect x="16" y="72" width="14" height="6" rx="1" fill="#5a5040" stroke="#1a1a2a" strokeWidth="1" />
            {/* Antena caída */}
            <line x1="170" y1="52" x2="162" y2="58" stroke="#1a1a2a" strokeWidth="1" />
            {/* Ventana trasera-izq shattered */}
            <path
              d="M 146 56 L 156 62 M 150 54 L 162 62 M 154 56 L 168 62"
              stroke="#fff"
              strokeWidth="1.3"
              fill="none"
              opacity="0.95"
            />
          </g>
        )}

        {damagePhase >= 4 && (
          <g>
            {/* Techo hundido — la línea del roof se colapsa */}
            <path
              d="M 62 64 L 82 72 L 116 60 L 148 72 L 180 64"
              stroke="#1a1a2a"
              strokeWidth="3"
              fill="none"
            />
            {/* Capó levantado */}
            <path d="M 14 76 L 24 62 L 58 66 L 50 76 Z" fill="#3f4160" stroke="#1a1a2a" strokeWidth="1.5" />
            <path d="M 20 68 L 50 66" stroke="#1a1a2a" strokeWidth="1" fill="none" />
            {/* Neumático delantero desinflado (aplanado abajo) */}
            <ellipse cx="58" cy="100" rx="14" ry="8" fill="#0e0e0e" stroke="#000" strokeWidth="2" />
          </g>
        )}

        {damagePhase >= 5 && (
          <g>
            {/* Rueda trasera zafada (desalineada hacia afuera) */}
            <circle cx="192" cy="102" r="12" fill="#0e0e0e" stroke="#000" strokeWidth="2" transform="rotate(20 192 102)" />
            {/* Humo denso saliendo del capó/techo */}
            <circle cx="80" cy="30" r="9" fill="#333" opacity="0.85">
              <animate attributeName="cy" values="30;12;30" dur="1.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.85;0.25;0.85" dur="1.6s" repeatCount="indefinite" />
              <animate attributeName="r" values="9;12;9" dur="1.6s" repeatCount="indefinite" />
            </circle>
            <circle cx="105" cy="24" r="11" fill="#4a4a4a" opacity="0.75">
              <animate attributeName="cy" values="24;4;24" dur="1.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.75;0.15;0.75" dur="1.4s" repeatCount="indefinite" />
              <animate attributeName="r" values="11;15;11" dur="1.4s" repeatCount="indefinite" />
            </circle>
            <circle cx="128" cy="28" r="8" fill="#222" opacity="0.9">
              <animate attributeName="cy" values="28;10;28" dur="1.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.9;0.2;0.9" dur="1.8s" repeatCount="indefinite" />
            </circle>
            {/* Chispas eléctricas del motor */}
            <path d="M 30 66 L 34 62 M 34 66 L 30 62 M 40 64 L 44 60 M 42 72 L 46 68"
                  stroke="#ffd54d" strokeWidth="1.5" strokeLinecap="round" opacity="0.9">
              <animate attributeName="opacity" values="0;1;0" dur="0.4s" repeatCount="indefinite" />
            </path>
          </g>
        )}
      </svg>
    </div>
  )
}

// Escena de fondo del bonus stage: muelles con océano y barco al horizonte,
// como en el arcade. Se dibuja detrás del auto y Ryu como decoración pura
// (SVG absoluto, sin interactividad).
function BonusScene() {
  return (
    <svg
      className="sf-bonus-bg"
      viewBox="0 0 480 320"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="skyGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#7ec7ff" />
          <stop offset="60%" stopColor="#a8d8ff" />
          <stop offset="100%" stopColor="#dae8f2" />
        </linearGradient>
        <linearGradient id="seaGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#1e4a80" />
          <stop offset="100%" stopColor="#0e2a55" />
        </linearGradient>
      </defs>

      {/* Cielo */}
      <rect x="0" y="0" width="480" height="180" fill="url(#skyGrad)" />

      {/* Nubes suaves */}
      <ellipse cx="80" cy="50" rx="30" ry="6" fill="#fff" opacity="0.75" />
      <ellipse cx="120" cy="70" rx="22" ry="5" fill="#fff" opacity="0.55" />
      <ellipse cx="320" cy="40" rx="34" ry="6" fill="#fff" opacity="0.7" />
      <ellipse cx="410" cy="65" rx="26" ry="5" fill="#fff" opacity="0.5" />

      {/* Barco/crucero al fondo, lado derecho (silueta pixel-y) */}
      <g transform="translate(360 128)">
        {/* Casco */}
        <path
          d="M 0 24 L 12 12 L 90 12 L 100 24 L 96 32 L 4 32 Z"
          fill="#e8ecee"
          stroke="#3a4a55"
          strokeWidth="1.5"
        />
        {/* Bandera USA en mástil izq */}
        <line x1="8" y1="12" x2="8" y2="-4" stroke="#1a1a2a" strokeWidth="1.2" />
        <rect x="8" y="-4" width="10" height="6" fill="#c8302a" />
        <rect x="8" y="-4" width="10" height="2" fill="#fff" />
        <rect x="8" y="-4" width="4" height="3" fill="#25376b" />
        {/* Superestructura blanca */}
        <rect x="20" y="2" width="60" height="10" fill="#f5f5f5" stroke="#3a4a55" strokeWidth="1" />
        <rect x="26" y="4" width="6" height="4" fill="#5a7ea5" />
        <rect x="36" y="4" width="6" height="4" fill="#5a7ea5" />
        <rect x="46" y="4" width="6" height="4" fill="#5a7ea5" />
        <rect x="56" y="4" width="6" height="4" fill="#5a7ea5" />
        <rect x="66" y="4" width="6" height="4" fill="#5a7ea5" />
        {/* Chimenea con banda roja */}
        <rect x="50" y="-8" width="10" height="12" fill="#f5f5f5" stroke="#3a4a55" strokeWidth="1" />
        <rect x="50" y="-6" width="10" height="4" fill="#c8302a" />
        {/* Ventanillas del casco */}
        <circle cx="16" cy="22" r="1.5" fill="#25376b" />
        <circle cx="26" cy="22" r="1.5" fill="#25376b" />
        <circle cx="36" cy="22" r="1.5" fill="#25376b" />
        <circle cx="46" cy="22" r="1.5" fill="#25376b" />
        <circle cx="56" cy="22" r="1.5" fill="#25376b" />
        <circle cx="66" cy="22" r="1.5" fill="#25376b" />
        <circle cx="76" cy="22" r="1.5" fill="#25376b" />
        <circle cx="86" cy="22" r="1.5" fill="#25376b" />
      </g>

      {/* Océano */}
      <rect x="0" y="180" width="480" height="70" fill="url(#seaGrad)" />
      {/* Olas horizontales sutiles */}
      <g fill="#4a7abf" opacity="0.55">
        <path d="M 0 190 Q 20 187 40 190 T 80 190 T 120 190 T 160 190 T 200 190 T 240 190 T 280 190 T 320 190 T 360 190 T 400 190 T 440 190 T 480 190 L 480 194 L 0 194 Z" />
        <path d="M 0 205 Q 24 202 48 205 T 96 205 T 144 205 T 192 205 T 240 205 T 288 205 T 336 205 T 384 205 T 432 205 T 480 205 L 480 208 L 0 208 Z" />
        <path d="M 0 222 Q 20 219 40 222 T 80 222 T 120 222 T 160 222 T 200 222 T 240 222 T 280 222 T 320 222 T 360 222 T 400 222 T 440 222 T 480 222 L 480 225 L 0 225 Z" />
      </g>

      {/* Muelle de madera — tablones horizontales con vetas */}
      <rect x="0" y="250" width="480" height="70" fill="#8a5a2a" />
      <g stroke="#4a2a10" strokeWidth="1.2" opacity="0.9">
        {/* Tablas horizontales */}
        <line x1="0" y1="260" x2="480" y2="260" />
        <line x1="0" y1="278" x2="480" y2="278" />
        <line x1="0" y1="296" x2="480" y2="296" />
        <line x1="0" y1="314" x2="480" y2="314" />
      </g>
      {/* Vetas verticales que dividen los tablones */}
      <g stroke="#4a2a10" strokeWidth="0.8" opacity="0.6">
        <line x1="60" y1="250" x2="60" y2="320" />
        <line x1="130" y1="250" x2="130" y2="320" />
        <line x1="195" y1="250" x2="195" y2="320" />
        <line x1="265" y1="250" x2="265" y2="320" />
        <line x1="330" y1="250" x2="330" y2="320" />
        <line x1="400" y1="250" x2="400" y2="320" />
      </g>
      {/* Highlight superior del muelle (borde iluminado) */}
      <rect x="0" y="248" width="480" height="4" fill="#c88a4a" />
      {/* Sombras entre tablones */}
      <g fill="#5a3818" opacity="0.5">
        <rect x="0" y="269" width="480" height="1.5" />
        <rect x="0" y="287" width="480" height="1.5" />
        <rect x="0" y="305" width="480" height="1.5" />
      </g>
    </svg>
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
        <BonusScene />
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
