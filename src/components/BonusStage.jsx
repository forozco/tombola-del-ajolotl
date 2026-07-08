// ── Easter egg · Bonus Stage del auto ──────────────────────────────────
// Homenaje jugable al clásico bonus stage de Street Fighter II ("Destroy
// the Car!"). Se accede desde un botoncito joystick en el panel NEXT
// FIGHT.
//
// Estructura del módulo:
//   - Este archivo:        estado del juego, controles y render principal
//   - BonusStageAssets.js: URLs de sprites + constantes de gameplay
//   - BonusStageAudio.js:  AudioContext + SFX + música en loop
//   - BonusStageScene.jsx: fondo de muelles (SVG decorativo)
//
// Mecánica:
//   - Ryu animado frame a frame (idle / jab / patada / hadouken)
//   - Auto con 10 estados de daño progresivo
//   - Tap al auto = puñetazo · botón KICK = patada (x2 daño)
//   - Especiales que gastan medidor SUPER: SHORYUKEN (3 barras, uppercut
//     con salto), TATSUMAKI (5, giro multi-hit) y HADOUKEN (8, fireball
//     que cruza)
//   - Teclado: Z puño · X patada · S shoryuken · D tatsumaki · C hadouken
//   - Chispas, vidrios y escombros vuelan en cada golpe; la llanta sale
//     disparada cuando el auto ya está chatarra
//   - Combos ("N HITS!"), score flotante, shake, haptics y SFX del arcade
//   - Timer 30s LED · high score en localStorage · PLAY AGAIN al terminar

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { haptic } from '../haptics.js'
import {
  SPRITES,
  DAMAGE_TO_DESTROY,
  TIME_LIMIT,
  METER_MAX,
  SHORYU_COST,
  TATSU_COST,
  HADO_COST,
  COMBO_WINDOW,
  loadBestScore,
  saveBestScore,
} from './BonusStageAssets.js'
import {
  ensureSfx,
  sfx,
  playMusic,
  stopSource,
  resumeAudio,
} from './BonusStageAudio.js'
import { BonusScene } from './BonusStageScene.jsx'

// Chispa de impacto con los 3 frames del sheet, apilados con opacidad
// secuenciada por CSS (sf-bonus-spark-f0/1/2). Se desmonta sola vía el
// padre; se queda inline aquí porque solo la usa BonusStage.
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

  const startMusic = () => {
    if (mutedRef.current || musicRef.current) return
    musicRef.current = playMusic({ volume: 0.3 })
  }
  const stopMusic = () => {
    stopSource(musicRef.current)
    musicRef.current = null
  }

  // Arranca cuando los buffers terminan de decodificar; para al desmontar
  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        await ensureSfx()
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
      saveBestScore(final)
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
        resumeAudio()
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
