// ── SFX del Bonus Stage ──────────────────────────────────────────────────
// Clips de audio del arcade servidos desde /public/sf/bonus/sfx: golpes
// jab/strong/fierce, especiales, el crash del stage y el announcer (Fight!,
// Perfect, You lose). Se decodifican una sola vez a AudioBuffer para poder
// solapar reproducciones al mashear. Degrada en silencio si no hay audio
// (Safari sin gesto, sin conexión, etc.).

const B = '/sf/bonus'

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
  // Música del nivel: el "Bonus Stage" del OST arcade, en loop
  music: `${B}/sfx/bonus-theme.m4a`,
}

let audioCtx = null
const sfxBuffers = {}
let sfxLoading = null

// Inicializa el AudioContext y arranca la descarga+decodificación de todos
// los clips. Idempotente: llamadas subsecuentes reusan el ctx y el promise.
export function ensureSfx() {
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
  return sfxLoading
}

// Reproduce un clip one-shot con volumen y velocidad opcionales (rate < 1
// hace más grave, > 1 más agudo — útil para dar variación en golpes que se
// solapan).
export function sfx(key, { vol = 1, rate = 1 } = {}) {
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

// Arranca la música de fondo en loop y devuelve el nodo source (para que
// el llamador lo pare cuando desmonte). Devuelve null si el audio no está
// listo o si el clip 'music' falló al cargar.
export function playMusic({ volume = 0.3 } = {}) {
  try {
    if (!audioCtx || !sfxBuffers.music) return null
    if (audioCtx.state === 'suspended') audioCtx.resume()
    const src = audioCtx.createBufferSource()
    src.buffer = sfxBuffers.music
    src.loop = true
    const g = audioCtx.createGain()
    g.gain.value = volume
    src.connect(g)
    g.connect(audioCtx.destination)
    src.start()
    return src
  } catch {
    return null
  }
}

// Detiene un source (música u otro). Tolera source ya parado o null.
export function stopSource(src) {
  try {
    src?.stop()
  } catch {
    /* ya estaba parado */
  }
}

// El AudioContext puede quedar suspendido si el navegador aún no vio un
// gesto del usuario. Se llama al primer pointerdown para despertarlo.
export function resumeAudio() {
  try {
    if (audioCtx?.state === 'suspended') audioCtx.resume()
  } catch {
    /* sin audio */
  }
}
