// ── localStorage: claves y loaders defensivos ──
// Los loaders nunca lanzan: si el JSON está corrupto o falta el ítem, devuelven
// el default. Esto blinda al primer render, que corre con estado sincrono.

export const STORAGE_KEY = 'tombola-ajolotl-v1'
export const DETALLES_KEY = 'tombola-ajolotl-detalles-v1'
export const THEME_KEY = 'tombola-ajolotl-theme'

export function loadResults() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {}
  } catch {
    return {}
  }
}

export function loadDetalles() {
  try {
    return JSON.parse(localStorage.getItem(DETALLES_KEY)) ?? {}
  } catch {
    return {}
  }
}

// 'system' (sigue al dispositivo, default), 'light' u 'dark'.
export function loadThemeMode() {
  const saved = localStorage.getItem(THEME_KEY)
  return saved === 'light' || saved === 'dark' ? saved : 'system'
}
