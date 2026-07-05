// ── Easter egg · Bonus Stage del auto ──
// Homenaje jugable al clásico bonus stage de Street Fighter II ("Destroy the
// Car!") con los sprites originales del arcade (rip de The Spriters Resource,
// © Capcom) servidos desde /public/sf/bonus. Se accede desde un botoncito
// joystick en el panel NEXT FIGHT.
// Mecánica:
//   - Ryu animado frame a frame (idle / jab / patada / hadouken)
//   - Auto real de SSF2 con 10 estados de daño progresivo
//   - Tap al auto = puñetazo · botón KICK = patada (x2 daño)
//   - Especiales que gastan medidor SUPER: SHORYUKEN (3 barras, uppercut con
//     salto), TATSUMAKI (5, giro multi-hit) y HADOUKEN (8, fireball que cruza)
//   - Teclado: Z puño · X patada · S shoryuken · D tatsumaki · C hadouken
//   - Chispas, vidrios y escombros reales del sheet vuelan en cada golpe;
//     la llanta sale disparada cuando el auto ya está chatarra
//   - Combos ("N HITS!"), score flotante, shake, haptics y SFX reales del
//     arcade ("FIGHT!", golpes, "Hadouken!", "PERFECT" / "You lose")
//   - Timer 30s LED · high score en localStorage · PLAY AGAIN al terminar

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { haptic } from '../haptics.js'

const DAMAGE_TO_DESTROY = 28 // puntos de daño para destruir el auto
const TIME_LIMIT = 30 // segundos
const METER_MAX = 8 // golpes para llenar el medidor SUPER
// Costo en barras de cada especial (el hadouken pide el medidor lleno)
const SHORYU_COST = 3
const TATSU_COST = 5
const HADO_COST = METER_MAX
const COMBO_WINDOW = 900 // ms entre golpes para encadenar combo
const BEST_KEY = 'ajolotl-sf-bonus-best'

const B = '/sf/bonus'
const seq = (name, n) => Array.from({ length: n }, (_, i) => `${B}/${name}-${i}.png`)
const SPRITES = {
  idle: seq('ryu-idle', 5),
  jab: seq('ryu-jab', 2),
  kick: seq('ryu-kick', 2),
  shoryu: seq('ryu-shoryu', 4),
  tatsu: seq('ryu-tatsu', 4),
  hado: seq('ryu-hado', 5),
  car: seq('car', 10),
  fireball: seq('fireball', 3),
  spark: seq('spark', 3),
  glass: seq('glass', 3),
  debris: ['debris-a', 'debris-b', 'debris-c', 'shard-a', 'shard-b', 'shard-c'].map(
    (n) => `${B}/${n}.png`,
  ),
  big: [`${B}/debris-bumper.png`, `${B}/debris-hood.png`],
  tire: `${B}/tire.png`,
}

function loadBestScore() {
  try {
    const raw = localStorage.getItem(BEST_KEY)
    const n = Number(raw)
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

// ── SFX reales del arcade (rip de The Sounds Resource, © Capcom) ──
// Clips del SF2 Turbo servidos desde /sf/bonus/sfx: golpes jab/strong/fierce,
// la voz "Hadouken!" de Ryu, el crash del stage y el announcer (Fight!,
// Perfect, You lose). Se decodifican una sola vez a AudioBuffer para poder
// solapar reproducciones al mashear. Degrada en silencio si no hay audio.
const SFX_URLS = {
  'hit-jab': `${B}/sfx/hit-jab.m4a`,
  'hit-strong': `${B}/sfx/hit-strong.m4a`,
  'hit-fierce': `${B}/sfx/hit-fierce.m4a`,
  'hit-roundhouse': `${B}/sfx/hit-roundhouse.m4a`,
  hadouken: `${B}/sfx/hadouken.m4a`,
  shoryuken: `${B}/sfx/shoryuken.m4a`,
  tatsumaki: `${B}/sfx/tatsumaki.m4a`,
  'on-fire': `${B}/sfx/on-fire.m4a`,
  crash: `${B}/sfx/crash.m4a`,
  fight: `${B}/sfx/fight.m4a`,
  perfect: `${B}/sfx/perfect.m4a`,
  'you-lose': `${B}/sfx/you-lose.m4a`,
  'score-count': `${B}/sfx/score-count.m4a`,
  // Música del nivel: el "Bonus Stage" del OST arcade CPS-1, en loop
  music: `${B}/sfx/bonus-theme.m4a`,
}

let audioCtx = null
const sfxBuffers = {}
let sfxLoading = null

function ensureSfx() {
  audioCtx ||= new (window.AudioContext || window.webkitAudioContext)()
  sfxLoading ||= Promise.all(
    Object.entries(SFX_URLS).map(async ([key, url]) => {
      try {
        const res = await fetch(url)
        sfxBuffers[key] = await audioCtx.decodeAudioData(await res.arrayBuffer())
      } catch {
        /* clip faltante: ese sonido simplemente no suena */
      }
    }),
  )
}

function sfx(key, { vol = 1, rate = 1 } = {}) {
  try {
    ensureSfx()
    if (audioCtx.state === 'suspended') audioCtx.resume()
    const buf = sfxBuffers[key]
    if (!buf) return
    const src = audioCtx.createBufferSource()
    src.buffer = buf
    src.playbackRate.value = rate
    const g = audioCtx.createGain()
    g.gain.value = vol
    src.connect(g)
    g.connect(audioCtx.destination)
    src.start()
  } catch {
    /* sin audio: el juego sigue igual */
  }
}

// Chispa de impacto con los 3 frames reales del sheet, apilados con opacidad
// secuenciada por CSS (sf-bonus-spark-f0/1/2). Se desmonta sola vía el padre.
function HitSpark({ x, y, big }) {
  return (
    <div
      className={`sf-bonus-spark${big ? ' big' : ''}`}
      style={{ left: x, top: y }}
      aria-hidden="true"
    >
      {SPRITES.spark.map((src, i) => (
        <img key={src} className={`sf-bonus-spark-frame f${i}`} src={src} alt="" />
      ))}
    </div>
  )
}

export function BonusStage({ onClose }) {
  const [hits, setHits] = useState(0)
  const [damage, setDamage] = useState(0)
  const [score, setScore] = useState(0)
  const [meter, setMeter] = useState(0)
  const [combo, setCombo] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT)
  const [state, setState] = useState('playing') // 'playing' | 'cleared' | 'timeup'
  const [collapsed, setCollapsed] = useState(false) // auto ya aplastado (frame final)
  const [ryuAnim, setRyuAnim] = useState({ name: 'idle', frame: 0 })
  const [sparks, setSparks] = useState([]) // {id, x, y, big}
  const [particles, setParticles] = useState([]) // {id, src, x, y, dx, dy, rot, cls, label}
  const [fireball, setFireball] = useState(null) // {id, dist}
  const [flash, setFlash] = useState(0)
  const [muted, setMuted] = useState(false)
  const [shake, setShake] = useState(false)
  const [best, setBest] = useState(() => loadBestScore())

  const idRef = useRef(0)
  const musicRef = useRef(null) // nodo del loop de música (para poder pararlo)
  // Espejos en ref de state que se lee dentro de callbacks/timeouts, para no
  // meter efectos secundarios en updaters (StrictMode los ejecuta doble).
  const stateRef = useRef('playing')
  stateRef.current = state
  const damageRef = useRef(0)
  const scoreRef = useRef(0)
  const hitzoneRef = useRef(null)
  const ryuRef = useRef(null)
  const animTimerRef = useRef(null)
  const timersRef = useRef(new Set())
  const lastHitRef = useRef(0)
  const comboTimerRef = useRef(null)
  const tireGoneRef = useRef(false)
  const busyRef = useRef(false)
  const mutedRef = useRef(false)
  mutedRef.current = muted

  // setTimeout con registro para limpiar todo al desmontar
  const later = (fn, ms) => {
    const id = setTimeout(() => {
      timersRef.current.delete(id)
      fn()
    }, ms)
    timersRef.current.add(id)
    return id
  }
  useEffect(
    () => () => {
      timersRef.current.forEach(clearTimeout)
      clearTimeout(animTimerRef.current)
      clearTimeout(comboTimerRef.current)
    },
    [],
  )

  // Pre-carga de frames y decodificación de los SFX del arcade; el clásico
  // "FIGHT!" arranca la ronda (si el navegador aún no permite audio porque no
  // hubo gesto, se activa solo con el primer golpe).
  useEffect(() => {
    Object.values(SPRITES)
      .flat()
      .forEach((src) => {
        const img = new Image()
        img.src = src
      })
    try {
      ensureSfx()
    } catch {
      /* sin audio */
    }
    later(() => {
      if (!mutedRef.current) sfx('fight')
    }, 400)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const play = (k, opts) => {
    if (!mutedRef.current) sfx(k, opts)
  }

  // ── Música de fondo en loop (Web Audio, mismo contexto que los SFX) ──
  const startMusic = () => {
    if (mutedRef.current || musicRef.current) return
    try {
      if (!audioCtx || !sfxBuffers.music) return
      if (audioCtx.state === 'suspended') audioCtx.resume()
      const src = audioCtx.createBufferSource()
      src.buffer = sfxBuffers.music
      src.loop = true
      const g = audioCtx.createGain()
      g.gain.value = 0.3 // de fondo: que los golpes y voces se oigan encima
      src.connect(g)
      g.connect(audioCtx.destination)
      src.start()
      musicRef.current = src
    } catch {
      /* sin audio */
    }
  }

  const stopMusic = () => {
    try {
      musicRef.current?.stop()
    } catch {
      /* ya estaba parado */
    }
    musicRef.current = null
  }

  // Arranca cuando los buffers terminan de decodificar; para al desmontar
  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        ensureSfx()
        await sfxLoading
        if (vivo && stateRef.current === 'playing') startMusic()
      } catch {
        /* sin audio */
      }
    })()
    return () => {
      vivo = false
      stopMusic()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // El toggle de sonido también pausa/reanuda la música
  useEffect(() => {
    if (muted) stopMusic()
    else if (state === 'playing') startMusic()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muted])

  // Loop del idle de Ryu (5 frames de la postura del arcade)
  useEffect(() => {
    if (ryuAnim.name !== 'idle') return undefined
    const id = setInterval(
      () =>
        setRyuAnim((a) =>
          a.name === 'idle' ? { name: 'idle', frame: (a.frame + 1) % SPRITES.idle.length } : a,
        ),
      160,
    )
    return () => clearInterval(id)
  }, [ryuAnim.name])

  // Reproduce una animación de ataque frame a frame y regresa al idle.
  // loops repite el ciclo (giro del tatsumaki); holdMs congela el último
  // frame un rato antes de volver (Ryu suspendido tras el shoryuken).
  const playAnim = (name, ms, { loops = 1, holdMs = 0 } = {}) => {
    clearTimeout(animTimerRef.current)
    const frames = SPRITES[name].length
    const total = frames * loops
    let i = 0
    setRyuAnim({ name, frame: 0 })
    const step = () => {
      i += 1
      if (i < total) {
        setRyuAnim({ name, frame: i % frames })
        animTimerRef.current = setTimeout(step, ms)
      } else if (holdMs > 0) {
        animTimerRef.current = setTimeout(() => setRyuAnim({ name: 'idle', frame: 0 }), holdMs)
      } else {
        setRyuAnim({ name: 'idle', frame: 0 })
      }
    }
    animTimerRef.current = setTimeout(step, ms)
  }

  // Timer del arcade: tick de 100ms para precisión visual
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

  const spawnParticles = (x, y, kind) => {
    const pool =
      kind === 'glass' ? SPRITES.glass : kind === 'burst' ? [...SPRITES.debris, ...SPRITES.big] : SPRITES.debris
    const count = kind === 'burst' ? 8 : kind === 'glass' ? 4 : 3
    const nuevos = Array.from({ length: count }, () => ({
      id: ++idRef.current,
      src: pool[Math.floor(Math.random() * pool.length)],
      x,
      y,
      dx: `${Math.round((Math.random() * 2 - 0.6) * 110)}px`,
      dy: `${Math.round(-30 - Math.random() * 110)}px`,
      rot: `${Math.round((Math.random() * 2 - 1) * 320)}deg`,
      cls: 'debris',
    }))
    setParticles((p) => [...p, ...nuevos])
    later(() => {
      const ids = new Set(nuevos.map((n) => n.id))
      setParticles((p) => p.filter((pt) => !ids.has(pt.id)))
    }, 750)
  }

  const spawnScorePop = (x, y, pts) => {
    const pop = { id: ++idRef.current, x, y, cls: 'pop', label: `+${pts}` }
    setParticles((p) => [...p, pop])
    later(() => setParticles((p) => p.filter((pt) => pt.id !== pop.id)), 700)
  }

  const spawnTire = () => {
    if (tireGoneRef.current) return
    tireGoneRef.current = true
    const rect = hitzoneRef.current?.getBoundingClientRect()
    const tire = {
      id: ++idRef.current,
      src: SPRITES.tire,
      x: (rect?.width ?? 300) * 0.28,
      y: (rect?.height ?? 170) * 0.8,
      dx: '160px',
      dy: '-90px',
      rot: '720deg',
      cls: 'debris tire',
    }
    setParticles((p) => [...p, tire])
    later(() => setParticles((p) => p.filter((pt) => pt.id !== tire.id)), 900)
  }

  // Núcleo de todo golpe: daño, chispa, partículas, combo, score y fin
  const applyDamage = (pts, x, y, opts = {}) => {
    if (stateRef.current !== 'playing') return
    const sid = ++idRef.current
    setSparks((s) => [...s, { id: sid, x, y, big: Boolean(opts.big) }])
    later(() => setSparks((s) => s.filter((sp) => sp.id !== sid)), 450)
    spawnParticles(x, y, opts.big ? 'burst' : opts.glass ? 'glass' : 'debris')
    spawnScorePop(x, y - 26, opts.score)
    setShake(true)
    later(() => setShake(false), opts.big ? 300 : 150)

    const now = Date.now()
    const encadena = now - lastHitRef.current < COMBO_WINDOW
    setCombo((c) => (encadena ? c + 1 : 1))
    lastHitRef.current = now
    clearTimeout(comboTimerRef.current)
    comboTimerRef.current = setTimeout(() => setCombo(0), COMBO_WINDOW)

    setHits((h) => h + 1)
    scoreRef.current += opts.score
    setScore(scoreRef.current)
    // Los golpes normales cargan el medidor; los hits de un especial no
    // (meterGain 0), para que un especial no se pague solo.
    setMeter((m) => Math.min(METER_MAX, m + (opts.meterGain ?? 1)))
    damageRef.current += pts
    setDamage(damageRef.current)
    if (damageRef.current / DAMAGE_TO_DESTROY >= 0.75) spawnTire()
    if (damageRef.current >= DAMAGE_TO_DESTROY) setState('cleared')
  }

  // Punto aleatorio sobre el auto (para golpes lanzados desde los botones)
  const randCarPoint = () => {
    const rect = hitzoneRef.current?.getBoundingClientRect()
    const w = rect?.width ?? 300
    const h = rect?.height ?? 170
    return { x: w * (0.25 + Math.random() * 0.5), y: h * (0.35 + Math.random() * 0.4) }
  }

  // Alterna jab/strong al mashear, con pitch ligeramente variable para que
  // los golpes seguidos no suenen a metralleta del mismo sample
  const jabAltRef = useRef(false)
  const hitRate = () => 0.94 + Math.random() * 0.12

  const punch = (x, y) => {
    if (state !== 'playing' || busyRef.current) return
    haptic.soft()
    jabAltRef.current = !jabAltRef.current
    play(jabAltRef.current ? 'hit-jab' : 'hit-strong', { rate: hitRate() })
    playAnim('jab', 70)
    applyDamage(1, x, y, { score: 100 })
  }

  const kick = () => {
    if (state !== 'playing' || busyRef.current) return
    haptic.medium()
    play('hit-roundhouse', { rate: hitRate() })
    playAnim('kick', 100)
    const { x, y } = randCarPoint()
    applyDamage(2, x, y, { score: 200, glass: true })
  }

  // SHORYUKEN: Ryu se lanza al auto y conecta el uppercut con salto
  const shoryuken = () => {
    if (state !== 'playing' || busyRef.current || meter < SHORYU_COST) return
    busyRef.current = true
    setMeter((m) => m - SHORYU_COST)
    haptic.medium()
    play('shoryuken')
    playAnim('shoryu', 90, { holdMs: 280 })
    later(() => {
      const rect = hitzoneRef.current?.getBoundingClientRect()
      play('hit-fierce', { rate: 1.05 })
      applyDamage(3, (rect?.width ?? 300) * 0.4, (rect?.height ?? 170) * 0.3, {
        score: 400,
        big: true,
        meterGain: 0,
      })
    }, 330)
    later(() => {
      busyRef.current = false
    }, 740)
  }

  // TATSUMAKI: giro que cruza hacia el auto pegando 3 veces
  const tatsumaki = () => {
    if (state !== 'playing' || busyRef.current || meter < TATSU_COST) return
    busyRef.current = true
    setMeter((m) => m - TATSU_COST)
    haptic.medium()
    play('tatsumaki')
    playAnim('tatsu', 80, { loops: 2, holdMs: 140 })
    ;[320, 540, 760].forEach((t, i) =>
      later(() => {
        play('hit-roundhouse', { rate: 0.94 + i * 0.07 })
        const { x, y } = randCarPoint()
        applyDamage(2, x, y, { score: 200, glass: true, meterGain: 0 })
      }, t),
    )
    later(() => {
      busyRef.current = false
    }, 940)
  }

  const hadouken = () => {
    if (state !== 'playing' || busyRef.current || meter < HADO_COST) return
    busyRef.current = true
    setMeter(0)
    haptic.success()
    play('hadouken')
    playAnim('hado', 80)
    // La bola sale al extender los brazos y viaja hasta el centro del auto
    later(() => {
      const ryuRect = ryuRef.current?.getBoundingClientRect()
      const carRect = hitzoneRef.current?.getBoundingClientRect()
      const dist =
        ryuRect && carRect
          ? carRect.left + carRect.width * 0.5 - (ryuRect.right - 10)
          : 200
      setFireball({ id: ++idRef.current, dist: Math.max(120, Math.round(dist)) })
    }, 240)
    later(() => {
      setFireball(null)
      play('on-fire')
      play('hit-fierce', { vol: 1, rate: 0.9 })
      haptic.goal()
      setFlash((f) => f + 1)
      const rect = hitzoneRef.current?.getBoundingClientRect()
      applyDamage(8, (rect?.width ?? 300) * 0.5, (rect?.height ?? 170) * 0.5, {
        score: 1000,
        big: true,
        meterGain: 0,
      })
      busyRef.current = false
    }, 700)
  }

  // Tap directo al auto = puñetazo donde cayó el dedo
  const onHitCar = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    punch(e.clientX - rect.left, e.clientY - rect.top)
  }

  // Enter/Espacio sobre el hitzone (click de teclado llega con detail 0)
  const onHitCarKeyboard = (e) => {
    if (e.detail !== 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    punch(rect.width * 0.5, rect.height * 0.5)
  }

  // Controles de teclado: Z puño · X patada · S shoryuken · D tatsumaki ·
  // C hadouken
  const actionsRef = useRef({})
  actionsRef.current = { punch, kick, shoryuken, tatsumaki, hadouken }
  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat) return
      const k = e.key.toLowerCase()
      if (k === 'z') {
        const rect = hitzoneRef.current?.getBoundingClientRect()
        actionsRef.current.punch((rect?.width ?? 300) * 0.5, (rect?.height ?? 170) * 0.5)
      } else if (k === 'x') {
        actionsRef.current.kick()
      } else if (k === 's') {
        actionsRef.current.shoryuken()
      } else if (k === 'd') {
        actionsRef.current.tatsumaki()
      } else if (k === 'c') {
        actionsRef.current.hadouken()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Al terminar: colapso del auto, fanfarria y high score
  useEffect(() => {
    if (state === 'playing') return undefined
    haptic.success()
    stopMusic() // que el announcer y el jingle se oigan limpios
    let collapseId = null
    if (state === 'cleared') {
      // Crash del auto colapsando → "PERFECT" del announcer → tally del score
      play('crash', { rate: 0.85 })
      later(() => play('perfect'), 600)
      later(() => play('score-count'), 1300)
      setFlash((f) => f + 1)
      collapseId = setTimeout(() => setCollapsed(true), 260)
    } else {
      play('you-lose')
    }
    const timeBonus = state === 'cleared' ? Math.floor(timeLeft * 1000) : 0
    const final = scoreRef.current + timeBonus
    scoreRef.current = final
    setScore(final)
    if (final > best) {
      setBest(final)
      try {
        localStorage.setItem(BEST_KEY, String(final))
      } catch {
        /* sesión sin storage: solo memoria */
      }
    }
    return () => clearTimeout(collapseId)
  }, [state])

  const reset = () => {
    clearTimeout(animTimerRef.current)
    busyRef.current = false
    tireGoneRef.current = false
    lastHitRef.current = 0
    damageRef.current = 0
    scoreRef.current = 0
    setHits(0)
    setDamage(0)
    setScore(0)
    setMeter(0)
    setCombo(0)
    setCollapsed(false)
    setSparks([])
    setParticles([])
    setFireball(null)
    setRyuAnim({ name: 'idle', frame: 0 })
    setTimeLeft(TIME_LIMIT)
    setState('playing')
    later(() => play('fight'), 300)
    later(() => startMusic(), 600)
  }

  const p2 = (n) => String(n).padStart(2, '0')
  const displayTime = `00:${p2(Math.floor(timeLeft))}`
  // Frame del auto: 0-7 según daño; al destruirlo colapsa 8 → 9 (chatarra)
  const carFrame =
    state === 'cleared'
      ? collapsed
        ? 9
        : 8
      : Math.min(7, Math.floor((damage / DAMAGE_TO_DESTROY) * 8))
  const meterReady = meter >= HADO_COST

  const overlay = (
    <div
      className="sf-bonus-overlay"
      role="dialog"
      aria-label="Bonus Stage"
      onPointerDown={() => {
        // Primer gesto en modo prueba (?bonus): despierta el audio y arranca
        // la música si el navegador la tenía bloqueada por autoplay.
        try {
          if (audioCtx?.state === 'suspended') audioCtx.resume()
        } catch {
          /* sin audio */
        }
        if (stateRef.current === 'playing') startMusic()
      }}
    >
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

        {/* Área jugable — la escena del muelle vive AQUÍ para que el piso de
            madera quede exactamente donde pisan Ryu y el auto (anclada al
            fondo del arena con preserveAspectRatio YMax) */}
        <div className="sf-bonus-arena">
          <BonusScene />
          {combo >= 2 ? <div className="sf-bonus-combo">{combo} HITS!</div> : null}

          <div className="sf-bonus-ryu-sprite" data-anim={ryuAnim.name} ref={ryuRef}>
            <img src={SPRITES[ryuAnim.name][ryuAnim.frame]} alt="Ryu" draggable={false} />
          </div>

          {fireball ? (
            <div
              key={fireball.id}
              className="sf-bonus-fireball"
              style={{ '--fb-dist': `${fireball.dist}px` }}
              aria-hidden="true"
            >
              <img className="sf-bonus-fb-frame f0" src={SPRITES.fireball[1]} alt="" />
              <img className="sf-bonus-fb-frame f1" src={SPRITES.fireball[2]} alt="" />
            </div>
          ) : null}

          <button
            ref={hitzoneRef}
            className="sf-bonus-hitzone"
            onPointerDown={state === 'playing' ? onHitCar : undefined}
            onClick={onHitCarKeyboard}
            aria-label="Golpear el auto"
          >
            <div className={`sf-bonus-car${shake ? ' shake' : ''}`} data-phase={carFrame}>
              <img
                className="sf-bonus-car-img"
                src={SPRITES.car[carFrame]}
                alt=""
                draggable={false}
              />
            </div>
            {sparks.map((s) => (
              <HitSpark key={s.id} x={s.x} y={s.y} big={s.big} />
            ))}
            {particles.map((pt) =>
              pt.cls === 'pop' ? (
                <span
                  key={pt.id}
                  className="sf-bonus-pop"
                  style={{ left: pt.x, top: pt.y }}
                  aria-hidden="true"
                >
                  {pt.label}
                </span>
              ) : (
                <img
                  key={pt.id}
                  className={`sf-bonus-particle ${pt.cls}`}
                  src={pt.src}
                  alt=""
                  style={{ left: pt.x, top: pt.y, '--dx': pt.dx, '--dy': pt.dy, '--rot': pt.rot }}
                />
              ),
            )}
          </button>

          {flash > 0 ? <div key={flash} className="sf-bonus-flash" aria-hidden="true" /> : null}
        </div>

        {/* Barra de daño */}
        <div className="sf-bonus-damage-bar">
          <div
            className="sf-bonus-damage-fill"
            style={{ width: `${Math.min(100, (damage / DAMAGE_TO_DESTROY) * 100)}%` }}
          />
        </div>

        {/* Medidor SUPER + botonera arcade */}
        <div className="sf-bonus-super-row">
          <span className="sf-bonus-super-label">SUPER</span>
          <div className={`sf-bonus-super-bar${meterReady ? ' ready' : ''}`}>
            <div
              className="sf-bonus-super-fill"
              style={{ width: `${(meter / METER_MAX) * 100}%` }}
            />
          </div>
        </div>
        <div className="sf-bonus-buttons">
          <button
            className="sf-bonus-btn punch"
            onPointerDown={() => {
              const { x, y } = randCarPoint()
              punch(x, y)
            }}
            disabled={state !== 'playing'}
          >
            PUNCH
          </button>
          <button
            className="sf-bonus-btn kick"
            onPointerDown={kick}
            disabled={state !== 'playing'}
          >
            KICK
          </button>
        </div>

        {/* Especiales: gastan barras del medidor SUPER (costo en el chip) */}
        <div className="sf-bonus-specials">
          <button
            className={`sf-bonus-btn shoryu${meter >= SHORYU_COST ? ' ready' : ''}`}
            onPointerDown={shoryuken}
            disabled={state !== 'playing' || meter < SHORYU_COST}
          >
            SHORYUKEN
            <span className="sf-bonus-cost">{SHORYU_COST}</span>
          </button>
          <button
            className={`sf-bonus-btn tatsu${meter >= TATSU_COST ? ' ready' : ''}`}
            onPointerDown={tatsumaki}
            disabled={state !== 'playing' || meter < TATSU_COST}
          >
            TATSUMAKI
            <span className="sf-bonus-cost">{TATSU_COST}</span>
          </button>
          <button
            className={`sf-bonus-btn hado${meterReady ? ' ready' : ''}`}
            onPointerDown={hadouken}
            disabled={state !== 'playing' || !meterReady}
          >
            HADOUKEN
            <span className="sf-bonus-cost">{HADO_COST}</span>
          </button>
        </div>

        {/* Estado final (overlay sobre la escena) */}
        {state !== 'playing' ? (
          <div className="sf-bonus-endgame">
            <div className={`sf-bonus-endgame-title ${state}`}>
              {state === 'cleared' ? 'BONUS STAGE CLEARED!' : 'TIME UP!'}
            </div>
            {state === 'cleared' ? (
              <div className="sf-bonus-endgame-bonus">
                TIME BONUS · {Math.floor(timeLeft * 1000)}
              </div>
            ) : null}
            <div className="sf-bonus-endgame-score">SCORE · {score}</div>
            <div className="sf-bonus-endgame-best">
              {score >= best && score > 0 ? 'NEW HIGH SCORE!' : `HI-SCORE · ${best}`}
            </div>
            <button className="sf-bonus-exit sf-bonus-again" onClick={reset}>
              PLAY AGAIN
            </button>
          </div>
        ) : null}

        {/* Instrucción / botón exit */}
        <div className="sf-bonus-footer">
          <span className="sf-bonus-instruction">
            {state === 'playing' ? 'TAP CAR = PUNCH · Z X S D C' : 'GAME OVER'}
          </span>
          <button
            className="sf-bonus-exit"
            onClick={() => setMuted((m) => !m)}
            aria-pressed={muted}
          >
            {muted ? 'SOUND OFF' : 'SOUND ON'}
          </button>
          <button className="sf-bonus-exit" onClick={onClose}>
            EXIT
          </button>
        </div>
      </div>
    </div>
  )

  // Portal a <body>: el overlay debe ser fixed de VERDAD. Renderizado dentro
  // del tab-content (que anima con transform/filter) el fixed se rompe y el
  // modal queda confinado a la columna, tapado por el tab bar.
  return typeof document === 'undefined' ? overlay : createPortal(overlay, document.body)
}

// Escena de fondo del bonus stage: muelles con océano y barco al horizonte,
// como en el arcade. Se dibuja detrás del auto y Ryu como decoración pura
// (SVG absoluto, sin interactividad).
function BonusScene() {
  return (
    <svg
      className="sf-bonus-bg"
      viewBox="0 0 480 320"
      preserveAspectRatio="xMidYMax slice"
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
