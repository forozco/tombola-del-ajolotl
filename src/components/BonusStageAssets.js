// ── Assets y constantes del Bonus Stage ──────────────────────────────────
// URLs de sprites (rip del arcade servidos desde /public/sf/bonus) más las
// constantes de gameplay (daño total, timer, medidor SUPER, combos). Todo
// junto porque BonusStage.jsx los referencia constantemente y separarlos
// en dos archivos no da ganancia.

const B = '/sf/bonus'
const seq = (name, n) => Array.from({ length: n }, (_, i) => `${B}/${name}-${i}.png`)

export const SPRITES = {
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

// ── Reglas de gameplay ──
export const DAMAGE_TO_DESTROY = 28 // puntos de daño para destruir el auto
export const TIME_LIMIT = 30 // segundos
export const METER_MAX = 8 // golpes para llenar el medidor SUPER
// Costo en barras de cada especial (el hadouken pide el medidor lleno)
export const SHORYU_COST = 3
export const TATSU_COST = 5
export const HADO_COST = METER_MAX
export const COMBO_WINDOW = 900 // ms entre golpes para encadenar combo

const BEST_KEY = 'ajolotl-sf-bonus-best'

export function loadBestScore() {
  try {
    const raw = localStorage.getItem(BEST_KEY)
    const n = Number(raw)
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

export function saveBestScore(score) {
  try {
    localStorage.setItem(BEST_KEY, String(score))
  } catch {
    /* sesión sin storage: solo memoria */
  }
}
